import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Camera, MapPin, QrCode, Truck } from "lucide-react";
import { Card, CardHeader, Button, Field, Pill, inputClass } from "../../components/ui";
import { QrVisual } from "../../components/QrVisual";
import { queryKeys } from "../../lib/queryKeys";
import {
  ARTICLES,
  SOURCES,
  createPreDeclaration,
  fetchPreDeclarations,
  type PreDeclaration,
  type PreStatus,
} from "../../lib/store";
import { preDeclarationSchema, type PreDeclarationValues } from "./schema";

const newItem = (): PreDeclarationValues["items"][number] => ({
  article: ARTICLES[0].name,
  tonnage: 3,
});

const DEFAULT_VALUES: PreDeclarationValues = {
  matricule: "",
  transporteur: "",
  source: SOURCES[0],
  items: [newItem()],
};

const STATUS_TONE: Record<PreStatus, "warning" | "info" | "success"> = {
  "En attente": "warning",
  Pesé: "info",
  Clôturé: "success",
};

export default function PreDeclarationPage() {
  const queryClient = useQueryClient();
  const { data: declarations = [] } = useQuery({
    queryKey: queryKeys.preDeclarations,
    queryFn: fetchPreDeclarations,
  });
  const [hasPhoto, setHasPhoto] = useState(false);
  const [geo, setGeo] = useState<string | null>(null);
  const [last, setLast] = useState<PreDeclaration | null>(null);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PreDeclarationValues>({
    resolver: zodResolver(preDeclarationSchema),
    defaultValues: DEFAULT_VALUES,
  });
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const createMutation = useMutation({
    mutationFn: createPreDeclaration,
    onSuccess: (decl) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.preDeclarations });
      setLast(decl);
      reset(DEFAULT_VALUES);
      setHasPhoto(false);
      setGeo(null);
    },
  });
  const saving = createMutation.isPending;

  const submit = handleSubmit((values) => {
    if (saving) return;
    createMutation.mutate({
      matricule: values.matricule,
      transporteur: values.transporteur,
      source: values.source,
      items: values.items.map((i) => ({ article: i.article, tonnage: i.tonnage })),
    });
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Pré-déclaration d'arrivée</h1>
        <p className="text-sm text-muted">
          Déclaration mobile du transporteur avant l'arrivée au marché — génère un code QR scanné au pont à bascule.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Nouvelle déclaration" subtitle="Renseigner le véhicule et le chargement" />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <Field label="Matricule du véhicule" hint="ex. 12345-A-6" error={errors.matricule?.message}>
                <input className={inputClass} placeholder="00000-X-0" {...register("matricule")} />
              </Field>
              <Field label="Transporteur" error={errors.transporteur?.message}>
                <input className={inputClass} placeholder="Nom du transporteur" {...register("transporteur")} />
              </Field>
              <Field label="Source de marchandises" error={errors.source?.message}>
                <select className={inputClass} {...register("source")}>
                  {SOURCES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="border-t border-line px-5 py-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Articles chargés</p>
                <Button type="button" variant="ghost" onClick={() => append(newItem())}>
                  <Plus className="h-4 w-4" /> Article
                </Button>
              </div>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 items-end gap-3">
                    <div className="col-span-7">
                      <Field label="Article" error={errors.items?.[index]?.article?.message}>
                        <select className={inputClass} {...register(`items.${index}.article`)}>
                          {ARTICLES.map((a) => (
                            <option key={a.name}>{a.name}</option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="col-span-4">
                      <Field label="Tonnage approx. (t)" error={errors.items?.[index]?.tonnage?.message}>
                        <input
                          type="number"
                          min={0}
                          className={inputClass}
                          {...register(`items.${index}.tonnage`)}
                        />
                      </Field>
                    </div>
                    <div className="col-span-1 pb-1">
                      <button
                        type="button"
                        aria-label="Supprimer"
                        className="rounded-lg border border-line p-2 text-muted hover:border-danger hover:text-danger disabled:opacity-40"
                        disabled={fields.length === 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {errors.items?.root?.message && (
                <p className="mt-3 text-sm text-danger">{errors.items.root.message}</p>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-4">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setHasPhoto((v) => !v)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    hasPhoto ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:bg-canvas"
                  }`}
                >
                  <Camera className="h-4 w-4" /> {hasPhoto ? "Photo ajoutée" : "Prendre une photo"}
                </button>
                <button
                  type="button"
                  onClick={() => setGeo("33.5731° N, 7.5898° O")}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors ${
                    geo ? "border-primary bg-primary-soft text-primary" : "border-line text-muted hover:bg-canvas"
                  }`}
                >
                  <MapPin className="h-4 w-4" /> {geo ?? "Localiser"}
                </button>
              </div>
              <Button onClick={submit} disabled={saving}>
                <QrCode className="h-4 w-4" /> {saving ? "Enregistrement…" : "Enregistrer & générer le QR"}
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Déclarations récentes" subtitle="Suivi des arrivées attendues" />
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-muted">
                    <th className="px-5 py-3 font-medium">Code</th>
                    <th className="px-5 py-3 font-medium">Matricule</th>
                    <th className="px-5 py-3 font-medium">Source</th>
                    <th className="px-5 py-3 font-medium">Chargement</th>
                    <th className="px-5 py-3 font-medium">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {declarations.map((d) => (
                    <tr key={d.code} className="border-b border-line last:border-0 hover:bg-canvas">
                      <td className="px-5 py-3 font-medium text-ink">{d.code}</td>
                      <td className="px-5 py-3 text-ink">{d.matricule}</td>
                      <td className="px-5 py-3 text-muted">{d.source}</td>
                      <td className="px-5 py-3 text-muted">
                        {d.items.map((i) => `${i.article} (${i.tonnage} t)`).join(", ")}
                      </td>
                      <td className="px-5 py-3">
                        <Pill tone={STATUS_TONE[d.status]}>{d.status}</Pill>
                      </td>
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
              <QrCode className="h-4 w-4 text-primary" /> Code QR
            </div>
            {last ? (
              <div className="mt-4 flex flex-col items-center text-center">
                <QrVisual value={last.code} />
                <p className="mt-3 font-mono text-sm font-semibold text-ink">{last.code}</p>
                <p className="text-xs text-muted">
                  {last.matricule} · {last.items.reduce((s, i) => s + i.tonnage, 0)} t
                </p>
                <Pill tone="warning">À présenter au pont à bascule</Pill>
              </div>
            ) : (
              <div className="mt-4 flex flex-col items-center gap-2 rounded-lg border border-dashed border-line py-10 text-center">
                <Truck className="h-8 w-8 text-line" />
                <p className="px-6 text-xs text-muted">
                  Le code QR s'affichera ici après l'enregistrement de la déclaration.
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
