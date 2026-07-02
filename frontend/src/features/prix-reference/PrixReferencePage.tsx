import { useEffect, useMemo, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, TrendingUp } from "lucide-react";
import { Card, CardHeader, Button, Pill, inputClass } from "../../components/ui";
import { mad } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { INITIAL_PRIX, fetchPrix, publishPrix } from "../../lib/services";
import { prixGridSchema, type PrixGridValues } from "./schema";

/** Prochain jeudi (mise à jour hebdomadaire des prix). */
function nextThursday(): string {
  const d = new Date();
  const delta = (4 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + delta);
  return d.toLocaleDateString("fr-MA", { weekday: "long", day: "numeric", month: "long" });
}

/** Grid inputs may hold raw strings while editing — coerce for live display. */
function toNumber(value: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default function PrixReferencePage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: queryKeys.prixReference, queryFn: fetchPrix });
  const [published, setPublished] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<PrixGridValues>({
    resolver: zodResolver(prixGridSchema),
    defaultValues: { rows: INITIAL_PRIX },
  });
  const { fields } = useFieldArray({ control, name: "rows" });

  // Sync the fetched grid into the form unless the user has pending edits (draft).
  useEffect(() => {
    if (data && !isDirty) reset({ rows: data });
  }, [data, isDirty, reset]);

  const watchedRows = watch("rows");
  // Any edit after publication turns the grid back into a draft.
  const isPublished = published && !isDirty;

  const publishMutation = useMutation({
    mutationFn: publishPrix,
    onSuccess: (rows) => {
      setPublished(true);
      reset({ rows });
      void queryClient.invalidateQueries({ queryKey: queryKeys.prixReference });
    },
  });

  const publish = handleSubmit((values) => publishMutation.mutate(values.rows));

  const invalidCount = useMemo(
    () => watchedRows.filter((r) => toNumber(r.max) < toNumber(r.min)).length,
    [watchedRows],
  );
  const thursday = useMemo(nextThursday, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Prix de référence</h1>
        <p className="text-sm text-muted">
          Mise à jour hebdomadaire (chaque jeudi) des prix min/max et du prix unitaire de la taxe défini par la commission.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Prochaine mise à jour</p>
            <p className="text-sm font-bold capitalize text-ink">{thursday}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info-soft text-info">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Articles suivis</p>
            <p className="text-sm font-bold text-ink">{fields.length}</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 p-5">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${
              isPublished ? "bg-success-soft text-success" : "bg-warning-soft text-warning"
            }`}
          >
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Statut de la semaine</p>
            <p className="text-sm font-bold text-ink">{isPublished ? "Publié" : "Brouillon"}</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Grille des prix"
          subtitle="Modifier les valeurs puis publier la grille de la semaine"
          action={<Pill tone={isPublished ? "success" : "muted"}>{isPublished ? "À jour" : "Non publié"}</Pill>}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Article</th>
                <th className="px-5 py-3 font-medium">Prix min (MAD/kg)</th>
                <th className="px-5 py-3 font-medium">Prix max (MAD/kg)</th>
                <th className="px-5 py-3 font-medium">Prix de référence</th>
                <th className="px-5 py-3 font-medium">Prix de la taxe</th>
              </tr>
            </thead>
            <tbody>
              {fields.map((field, index) => {
                const row = watchedRows[index] ?? field;
                const min = toNumber(row.min);
                const max = toNumber(row.max);
                const ref = (min + max) / 2;
                const invalid = max < min;
                const rowErrors = errors.rows?.[index];
                const maxError =
                  rowErrors?.max?.message ??
                  (invalid ? "Le prix max doit être supérieur ou égal au prix min." : undefined);
                return (
                  <tr key={field.id} className="border-b border-line last:border-0">
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink">{field.name}</span>
                      <span className="ml-2 text-xs text-muted">{field.code}</span>
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        step="0.1"
                        className={`${inputClass} w-28`}
                        aria-label={`Prix min ${field.name}`}
                        {...register(`rows.${index}.min`)}
                      />
                      {rowErrors?.min?.message && (
                        <p className="mt-1 text-[11px] text-danger">{rowErrors.min.message}</p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        step="0.1"
                        className={`${inputClass} w-28 ${invalid ? "border-danger" : ""}`}
                        aria-label={`Prix max ${field.name}`}
                        {...register(`rows.${index}.max`)}
                      />
                      {maxError && <p className="mt-1 text-[11px] text-danger">{maxError}</p>}
                    </td>
                    <td className="px-5 py-3 font-medium text-ink">{mad(ref)}</td>
                    <td className="px-5 py-3">
                      <input
                        type="number"
                        step="0.001"
                        className={`${inputClass} w-28`}
                        aria-label={`Prix taxe ${field.name}`}
                        {...register(`rows.${index}.taxRate`)}
                      />
                      {rowErrors?.taxRate?.message && (
                        <p className="mt-1 text-[11px] text-danger">{rowErrors.taxRate.message}</p>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-line px-5 py-4">
          <p className="text-xs text-muted">
            {invalidCount > 0
              ? `${invalidCount} article(s) avec prix max < min à corriger.`
              : "Le prix de référence est la moyenne des bornes min/max."}
          </p>
          <Button onClick={publish} disabled={invalidCount > 0 || isPublished || publishMutation.isPending}>
            <CheckCircle2 className="h-4 w-4" />
            {isPublished ? "Grille publiée" : publishMutation.isPending ? "Publication…" : "Publier la grille de la semaine"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
