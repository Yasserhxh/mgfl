import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Calculator } from "lucide-react";
import { Card, CardHeader, Button, Field, Pill, inputClass } from "../../components/ui";
import { mad } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import {
  INITIAL_INFRACTIONS,
  fetchInfractions,
  infractionPenalty,
  recordInfraction,
  type InfractionKind,
} from "../../lib/services";
import { infractionSchema, type InfractionValues } from "./schema";

const TYPES: { id: InfractionKind; label: string; formula: string }[] = [
  { id: "Evasion", label: "Évasion", formula: "Montant de la taxe × 2" },
  { id: "ManqueDeclaration", label: "Manque de déclaration d'article", formula: "(Poids non déclaré × Prix d'article) × 2" },
  { id: "EmballageDifferent", label: "Emballage différent déclaré", formula: "Montant de la taxe × 2" },
];

/** Numeric inputs may hold raw strings while editing — coerce for the live penalty. */
function toNumber(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function InfractionsPage() {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    watch,
    formState: { errors },
  } = useForm<InfractionValues>({
    resolver: zodResolver(infractionSchema),
    defaultValues: {
      matricule: "12345-A-6",
      type: "Evasion",
      taxAmount: 240,
      undeclaredWeight: 500,
      articlePrice: 4,
    },
  });

  const kind = watch("type");
  const taxAmount = toNumber(watch("taxAmount"));
  const undeclaredWeight = toNumber(watch("undeclaredWeight"));
  const articlePrice = toNumber(watch("articlePrice"));

  const { data } = useQuery({ queryKey: queryKeys.infractions, queryFn: fetchInfractions });
  const log = data ?? INITIAL_INFRACTIONS;

  const amount = useMemo(
    () => infractionPenalty(kind, taxAmount, undeclaredWeight, articlePrice),
    [kind, taxAmount, undeclaredWeight, articlePrice],
  );

  const isManque = kind === "ManqueDeclaration";

  const selectKind = (next: InfractionKind) => {
    setValue("type", next);
    // The relevant numeric fields change with the type: drop stale errors.
    clearErrors();
  };

  const recordMutation = useMutation({
    mutationFn: recordInfraction,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: queryKeys.infractions }),
  });

  const record = handleSubmit((values) => {
    if (recordMutation.isPending) return;
    recordMutation.mutate({
      matricule: values.matricule,
      type: values.type,
      taxAmount: values.taxAmount,
      undeclaredWeight: values.undeclaredWeight,
      articlePrice: values.articlePrice,
    });
  });

  const labelOf = (k: InfractionKind) => TYPES.find((t) => t.id === k)!.label;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Gestion des infractions</h1>
        <p className="text-sm text-muted">
          Trois types d'infractions — la pénalité correspond au double du montant concerné.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Constater une infraction" subtitle="Sélectionner le type et saisir les montants" />
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectKind(t.id)}
                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                      kind === t.id
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-line text-ink hover:bg-canvas"
                    }`}
                  >
                    <p className="font-medium">{t.label}</p>
                    <p className="mt-1 text-[11px] text-muted">{t.formula}</p>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Matricule du véhicule" error={errors.matricule?.message}>
                  <input className={inputClass} {...register("matricule")} />
                </Field>
                {isManque ? (
                  <>
                    <Field label="Poids non déclaré (kg)" error={errors.undeclaredWeight?.message}>
                      <input type="number" className={inputClass} {...register("undeclaredWeight")} />
                    </Field>
                    <Field label="Prix d'article (MAD/kg)" error={errors.articlePrice?.message}>
                      <input type="number" step="0.1" className={inputClass} {...register("articlePrice")} />
                    </Field>
                  </>
                ) : (
                  <Field label="Montant de la taxe (MAD)" error={errors.taxAmount?.message}>
                    <input type="number" className={inputClass} {...register("taxAmount")} />
                  </Field>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
              <div className="flex items-center gap-2 text-sm">
                <Calculator className="h-4 w-4 text-muted" />
                <span className="text-muted">Pénalité calculée :</span>
                <span className="text-lg font-bold text-danger">{mad(amount)}</span>
              </div>
              <Button onClick={record} disabled={recordMutation.isPending}>
                <AlertTriangle className="h-4 w-4" />
                {recordMutation.isPending ? "Enregistrement…" : "Enregistrer l'infraction"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Infractions constatées" subtitle="Historique des pénalités" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Réf.</th>
                    <th className="px-5 py-3 font-medium">Matricule</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Pénalité</th>
                    <th className="px-5 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((c) => (
                    <tr key={c.reference} className="border-b border-line last:border-0 hover:bg-canvas">
                      <td className="px-5 py-3 font-medium text-ink">{c.reference}</td>
                      <td className="px-5 py-3 text-ink">{c.matricule}</td>
                      <td className="px-5 py-3 text-muted">{labelOf(c.type)}</td>
                      <td className="px-5 py-3 font-medium text-danger">{mad(c.amount)}</td>
                      <td className="px-5 py-3 text-muted">{c.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium text-ink">
              <AlertTriangle className="h-4 w-4 text-danger" /> Barème
            </div>
            <ul className="mt-4 space-y-3">
              {TYPES.map((t) => (
                <li key={t.id} className="rounded-lg border border-line p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-ink">{t.label}</p>
                    <Pill tone="danger">×2</Pill>
                  </div>
                  <p className="mt-1 text-[11px] text-muted">{t.formula}</p>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
