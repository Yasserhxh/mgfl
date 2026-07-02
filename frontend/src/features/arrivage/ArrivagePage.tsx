import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ScanLine,
  Warehouse,
  FileText,
  Printer,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Truck,
} from "lucide-react";
import { Card, CardHeader, Button, Field, Pill, inputClass } from "../../components/ui";
import { mad, kg, errorStatus, problemMessage } from "../../lib/api";
import { USE_REAL_API } from "../../lib/config";
import { downloadEtatPdf } from "../../lib/etats";
import { queryKeys } from "../../lib/queryKeys";
import {
  MAGASINS,
  ArrivalBlockedError,
  fetchPreDeclarations,
  refPriceOf,
  taxRateOf,
  submitArrival,
  type ArrivalLineInput,
  type ArrivalResult,
  type PreDeclaration,
} from "../../lib/store";
import { weighingSchema, type WeighingInput, type WeighingValues } from "./schema";
import DeparturesCard from "./DeparturesCard";
import EtatDocument from "./EtatDocument";

const STEPS = ["Scan QR", "Pesée & taxe", "Destination", "État de base"];

const DEFAULT_WEIGHING: WeighingInput = {
  grossWeight: 0,
  tareWeight: 3000,
  packagingWeight: 200,
  magasin: MAGASINS[0],
  lines: [],
};

/** Raw weighing inputs may hold strings while editing — coerce for live display. */
function toNumber(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                active
                  ? "bg-primary text-white"
                  : done
                    ? "bg-primary-soft text-primary"
                    : "bg-line text-muted"
              }`}
            >
              {done ? <CheckCircle2 className="h-4 w-4" /> : n}
            </div>
            <span className={`hidden text-sm sm:inline ${active ? "font-medium text-ink" : "text-muted"}`}>
              {label}
            </span>
            {n < STEPS.length && <ArrowRight className="mx-1 h-4 w-4 text-line" />}
          </div>
        );
      })}
    </div>
  );
}

export default function ArrivagePage() {
  const queryClient = useQueryClient();
  const { data: declarations = [] } = useQuery({
    queryKey: queryKeys.preDeclarations,
    queryFn: fetchPreDeclarations,
  });
  const pending = declarations.filter((d) => d.status === "En attente");

  const [step, setStep] = useState(1);
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [voyage, setVoyage] = useState<PreDeclaration | null>(null);

  /** Motif de blocage du contrôle de vraisemblance (422 / mode mock). */
  const [blockError, setBlockError] = useState<string | null>(null);
  /** Résultat du pesage (porte le n° d'état de base pour le PDF en mode réel). */
  const [arrival, setArrival] = useState<ArrivalResult | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset: resetForm,
    trigger,
    watch,
    formState: { errors },
  } = useForm<WeighingInput, unknown, WeighingValues>({
    resolver: zodResolver(weighingSchema),
    defaultValues: DEFAULT_WEIGHING,
  });

  const gross = toNumber(watch("grossWeight"));
  const tare = toNumber(watch("tareWeight"));
  const packaging = toNumber(watch("packagingWeight"));
  const magasin = watch("magasin");

  const net = Math.max(0, gross - tare - packaging);
  const totalTonnage = voyage?.items.reduce((s, i) => s + i.tonnage, 0) ?? 0;

  /** Répartition du poids net par article (au prorata du tonnage déclaré). */
  const breakdown = useMemo(() => {
    if (!voyage || totalTonnage <= 0) return [];
    return voyage.items.map((it) => {
      const share = net * (it.tonnage / totalTonnage);
      const value = share * refPriceOf(it.article);
      const tax = share * taxRateOf(it.article);
      return { article: it.article, netWeight: share, value, tax };
    });
  }, [voyage, net, totalTonnage]);

  const totalTax = breakdown.reduce((s, l) => s + l.tax, 0);
  const totalValue = breakdown.reduce((s, l) => s + l.value, 0);

  const scan = (code: string) => {
    const needle = code.trim().toLowerCase();
    const found = declarations.find((d) => d.code.toLowerCase() === needle);
    if (!found) return setScanError("Aucune pré-déclaration ne correspond à ce code.");
    if (found.status !== "En attente")
      return setScanError(`Voyage ${found.code} déjà traité (${found.status}).`);
    setScanError(null);
    setVoyage(found);
    // Pré-remplissage à partir du voyage (tare véhicule + estimation).
    resetForm({
      grossWeight: 3000 + Math.round(totalTonnageOf(found) * 1000) + 200,
      tareWeight: 3000,
      packagingWeight: 200,
      magasin: MAGASINS[0],
      lines: found.items.map((it) => ({ article: it.article, crates: "" })),
    });
    setBlockError(null);
    setStep(2);
  };

  // Validate the weighing (weights + optional crate counts) before moving on so
  // Zod field errors show up on the step where the inputs live.
  const confirmWeighing = async () => {
    if (await trigger()) setStep(3);
  };

  // Weighing persists the arrival + generates the état de base: refresh every
  // affected cache (voyage statuses, parking spots freed later, documents list).
  const arrivalMutation = useMutation({
    mutationFn: submitArrival,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.preDeclarations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.spots });
      void queryClient.invalidateQueries({ queryKey: queryKeys.etatsDeBase });
    },
  });
  const generating = arrivalMutation.isPending;
  const generateEtatDeBase = handleSubmit(
    async (values) => {
      if (!voyage || generating) return;
      setBlockError(null);
      // Nb de caisses optionnel : envoyé seulement si au moins une ligne est renseignée.
      const hasCrates = values.lines.some((l) => l.crates !== undefined);
      const lines: ArrivalLineInput[] | undefined = hasCrates
        ? values.lines.map((l) => ({ article: l.article, crates: l.crates ?? null }))
        : undefined;
      try {
        const result = await arrivalMutation.mutateAsync({
          code: voyage.code,
          grossWeight: values.grossWeight,
          tareWeight: values.tareWeight,
          packagingWeight: values.packagingWeight,
          magasin: values.magasin,
          lines,
        });
        setArrival(result);
        setStep(4);
      } catch (err) {
        // Contrôle de vraisemblance BLOQUANT : 422 ProblemDetails (réel) ou erreur locale (mock).
        if (err instanceof ArrivalBlockedError) {
          setBlockError(err.message);
        } else if (errorStatus(err) === 422) {
          setBlockError(problemMessage(err) ?? "Contrôle de vraisemblance échoué : données incohérentes.");
        } else {
          setBlockError(problemMessage(err) ?? "Erreur lors de l'enregistrement de l'arrivage. Réessayer.");
        }
      }
    },
    // Invalid weighing values: send the agent back to the step that shows them.
    () => setStep(2),
  );

  const reset = () => {
    setVoyage(null);
    setScanCode("");
    setScanError(null);
    resetForm(DEFAULT_WEIGHING);
    setBlockError(null);
    setArrival(null);
    setPdfError(null);
    setStep(1);
  };

  const downloadPdf = async () => {
    if (!arrival || pdfBusy) return;
    setPdfBusy(true);
    setPdfError(null);
    try {
      await downloadEtatPdf(arrival.etatNumber);
    } catch (err) {
      setPdfError(problemMessage(err) ?? "Téléchargement du PDF impossible. Réessayer.");
    } finally {
      setPdfBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="no-print">
        <h1 className="text-xl font-bold text-ink">Arrivage & pesage au pont à bascule</h1>
        <p className="text-sm text-muted">
          Scan du QR de pré-déclaration, pesage, calcul de la taxe et génération de l'état de base.
        </p>
      </div>

      <div className="no-print">
        <Stepper step={step} />
      </div>

      {/* Étape 1 — Scan du QR */}
      {step === 1 && (
        <div className="no-print space-y-6">
          <Card>
            <CardHeader title="Scan du code QR" subtitle="Présenter le camion au pont à bascule et scanner le QR" />
            <div className="flex flex-wrap items-end gap-3 p-5">
              <Field label="Code de pré-déclaration">
                <input
                  className={`${inputClass} w-64 font-mono`}
                  placeholder="PRE-2026-0000"
                  value={scanCode}
                  onChange={(e) => setScanCode(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && scan(scanCode)}
                />
              </Field>
              <Button onClick={() => scan(scanCode)} disabled={!scanCode.trim()}>
                <ScanLine className="h-4 w-4" /> Scanner
              </Button>
            </div>
            {scanError && <p className="px-5 pb-4 text-sm text-danger">{scanError}</p>}
          </Card>

          <Card>
            <CardHeader
              title="Arrivées attendues"
              subtitle="Sélectionner un voyage pour simuler le scan"
              action={<Pill tone="warning">{pending.length} en attente</Pill>}
            />
            <div className="divide-y divide-line">
              {pending.length === 0 && (
                <p className="p-5 text-sm text-muted">Aucune arrivée en attente.</p>
              )}
              {pending.map((d) => (
                <button
                  key={d.code}
                  onClick={() => scan(d.code)}
                  className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-canvas"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-mono text-sm font-medium text-ink">{d.code}</p>
                      <p className="text-xs text-muted">
                        {d.transporteur} · {d.matricule} · {d.items.map((i) => i.article).join(", ")}
                      </p>
                    </div>
                  </div>
                  <ScanLine className="h-4 w-4 text-muted" />
                </button>
              ))}
            </div>
          </Card>

          <DeparturesCard />
        </div>
      )}

      {/* Étape 2 — Pesée & taxe */}
      {step === 2 && voyage && (
        <div className="no-print space-y-6">
          <VoyageInfo voyage={voyage} />
          <Card>
            <CardHeader title="Pesée" subtitle="Poids net = (brut − tare) − emballage" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-3">
              <Field label="Poids brut (kg)" error={errors.grossWeight?.message}>
                <input type="number" className={inputClass} {...register("grossWeight")} />
              </Field>
              <Field label="Tare à vide (kg)" error={errors.tareWeight?.message}>
                <input type="number" className={inputClass} {...register("tareWeight")} />
              </Field>
              <Field label="Emballage (kg)" error={errors.packagingWeight?.message}>
                <input type="number" className={inputClass} {...register("packagingWeight")} />
              </Field>
            </div>
            <div className="border-t border-line px-5 py-4">
              <div className="mb-3 flex items-center gap-6">
                <div>
                  <p className="text-xs font-medium text-muted">Poids net total</p>
                  <p className="text-2xl font-bold text-ink">{kg(net)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">Taxe totale</p>
                  <p className="text-2xl font-bold text-primary">{mad(totalTax)}</p>
                </div>
              </div>
              <div className="overflow-x-auto rounded-lg border border-line">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
                      <th className="px-4 py-2 font-medium">Article</th>
                      <th className="px-4 py-2 font-medium">Poids net</th>
                      <th className="px-4 py-2 font-medium">Nb caisses (optionnel)</th>
                      <th className="px-4 py-2 font-medium">Prix taxe</th>
                      <th className="px-4 py-2 font-medium">Taxe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.map((l, index) => (
                      <tr key={l.article} className="border-b border-line last:border-0">
                        <td className="px-4 py-2 font-medium text-ink">{l.article}</td>
                        <td className="px-4 py-2 text-muted">{kg(l.netWeight)}</td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            min="0"
                            className={`${inputClass} w-28`}
                            placeholder="—"
                            aria-label={`Nb caisses ${l.article}`}
                            {...register(`lines.${index}.crates`)}
                          />
                          {errors.lines?.[index]?.crates?.message && (
                            <p className="mt-1 text-[11px] text-danger">
                              {errors.lines[index]?.crates?.message}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-muted">{taxRateOf(l.article).toFixed(3)} MAD/kg</td>
                        <td className="px-4 py-2 font-medium text-ink">{mad(l.tax)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-between border-t border-line px-5 py-4">
              <Button variant="ghost" onClick={reset}>Annuler</Button>
              <Button onClick={() => void confirmWeighing()} disabled={net <= 0}>
                Continuer <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Étape 3 — Destination */}
      {step === 3 && voyage && (
        <div className="no-print space-y-6">
          <VoyageInfo voyage={voyage} />
          <Card>
            <CardHeader
              title="Magasin réceptionnaire"
              subtitle="Déclaré par le transporteur — état de base remis contre la carte grise"
            />
            <div className="p-5">
              <Field label="Magasin de destination" error={errors.magasin?.message}>
                <select className={`${inputClass} sm:w-64`} {...register("magasin")}>
                  {MAGASINS.map((m) => (
                    <option key={m} value={m}>
                      Magasin {m}
                    </option>
                  ))}
                </select>
              </Field>
              <div className="mt-4 flex items-start gap-2 rounded-lg bg-warning-soft px-3 py-2 text-sm text-warning">
                <Warehouse className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  L'état de base sera remis au transporteur <strong>contre la carte grise</strong> du véhicule, restituée
                  au retour au pont à bascule.
                </span>
              </div>
              {blockError && (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-3 rounded-lg border border-danger bg-danger-soft px-4 py-3"
                >
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                  <div>
                    <p className="text-sm font-bold text-danger">
                      Contrôle de vraisemblance — génération BLOQUÉE
                    </p>
                    <p className="mt-1 text-sm text-danger">{blockError}</p>
                    <p className="mt-1 text-xs text-danger">
                      Aucune donnée n'a été enregistrée. Corriger le nombre de caisses ou la pesée puis réessayer.
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-line px-5 py-4">
              <Button variant="ghost" onClick={() => setStep(2)}>Retour</Button>
              <Button onClick={generateEtatDeBase} disabled={generating}>
                <FileText className="h-4 w-4" /> {generating ? "Génération…" : "Générer l'état de base"}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Étape 4 — État de base imprimable */}
      {step === 4 && voyage && (
        <>
          <div className="mb-4 flex items-center justify-between no-print">
            <Pill tone="success">État de base généré</Pill>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Nouvelle arrivée
              </Button>
              {USE_REAL_API && arrival && (
                <Button variant="ghost" onClick={downloadPdf} disabled={pdfBusy}>
                  <Download className="h-4 w-4" />
                  {pdfBusy ? "Téléchargement…" : "Télécharger l'état de base (PDF)"}
                </Button>
              )}
              <Button onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
            </div>
          </div>
          {pdfError && <p className="no-print mb-4 text-sm text-danger">{pdfError}</p>}

          <EtatDocument
            voyage={voyage}
            magasin={magasin}
            gross={gross}
            tare={tare}
            packaging={packaging}
            net={net}
            totalValue={totalValue}
            totalTax={totalTax}
            breakdown={breakdown}
            etatNumber={arrival?.etatNumber}
          />
        </>
      )}
    </div>
  );
}

function totalTonnageOf(d: PreDeclaration) {
  return d.items.reduce((s, i) => s + i.tonnage, 0);
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="font-medium text-ink">{value}</p>
    </div>
  );
}

function VoyageInfo({ voyage }: { voyage: PreDeclaration }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-ink">
          <Truck className="h-4 w-4 text-primary" /> Informations du voyage
        </div>
        <span className="font-mono text-xs text-muted">{voyage.code}</span>
      </div>
      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <Info label="Transporteur" value={voyage.transporteur} />
        <Info label="Matricule" value={voyage.matricule} />
        <Info label="Source" value={voyage.source} />
        <Info label="Chargement" value={voyage.items.map((i) => `${i.article} (${i.tonnage} t)`).join(", ")} />
      </div>
    </Card>
  );
}
