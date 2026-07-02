import { useState } from "react";
import type { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { ZodType, ZodTypeDef } from "zod/v3";
import { Card, CardHeader, Button, Field, inputClass } from "../../components/ui";
import { problemMessage } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import type { RefId, Resource } from "../../lib/referentiels";

export interface FieldDef {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  options?: { value: string; label: string }[];
  step?: string;
  placeholder?: string;
}

export interface ColumnDef<TDto> {
  header: string;
  render: (row: TDto) => ReactNode;
}

/** Valeurs brutes du formulaire (toutes en chaînes ; converties/validées par le schéma Zod). */
export type FormValues = Record<string, string>;

/**
 * Zod (v3) schema of a resource form: parses the raw form strings into the
 * typed API input. The `_def.typeName` member is what `zodResolver` relies on
 * to detect a Zod 3 schema.
 */
export type CrudSchema<TInput> = ZodType<TInput, ZodTypeDef, FormValues> & {
  _def: { typeName: string };
};

interface CrudSectionProps<TDto extends { id: RefId }, TInput> {
  title: string;
  subtitle: string;
  /** Cache key segment of the resource (see `queryKeys.referentiels`). */
  resourceKey: string;
  resource: Resource<TDto, TInput>;
  columns: ColumnDef<TDto>[];
  fields: FieldDef[];
  /** Zod schema supplied by each tab — field-level French messages. */
  schema: CrudSchema<TInput>;
  emptyValues: FormValues;
  toValues: (row: TDto) => FormValues;
}

type Editing = { mode: "create" } | { mode: "edit"; id: RefId } | null;

export function CrudSection<TDto extends { id: RefId }, TInput>({
  title,
  subtitle,
  resourceKey,
  resource,
  columns,
  fields,
  schema,
  emptyValues,
  toValues,
}: CrudSectionProps<TDto, TInput>) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.referentiels(resourceKey);
  const {
    data: rows = [],
    isPending: loading,
    error: queryError,
  } = useQuery({ queryKey, queryFn: () => resource.list() });

  const [editing, setEditing] = useState<Editing>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, TInput>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues,
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey });
    // The articles referential also feeds the app-wide articles cache.
    if (resourceKey === "articles") {
      void queryClient.invalidateQueries({ queryKey: queryKeys.articles });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (vars: { editing: Exclude<Editing, null>; input: TInput }) => {
      if (vars.editing.mode === "create") await resource.create(vars.input);
      else await resource.update(vars.editing.id, vars.input);
    },
    onSuccess: invalidate,
  });

  const removeMutation = useMutation({
    mutationFn: (id: RefId) => resource.remove(id),
    onSuccess: invalidate,
  });

  const saving = saveMutation.isPending;

  const startCreate = () => {
    setEditing({ mode: "create" });
    reset(emptyValues);
    setFormError(null);
  };

  const startEdit = (row: TDto) => {
    setEditing({ mode: "edit", id: row.id });
    reset(toValues(row));
    setFormError(null);
  };

  const cancel = () => {
    setEditing(null);
    setFormError(null);
  };

  const save = handleSubmit(async (input) => {
    if (!editing || saving) return;
    try {
      await saveMutation.mutateAsync({ editing, input });
      setEditing(null);
      setFormError(null);
    } catch (err) {
      setFormError(problemMessage(err) ?? "Échec de l'enregistrement. Réessayer.");
    }
  });

  const remove = async (row: TDto) => {
    if (!window.confirm("Supprimer cette entrée ? Cette action est définitive.")) return;
    try {
      await removeMutation.mutateAsync(row.id);
      setRemoveError(null);
    } catch (err) {
      setRemoveError(problemMessage(err) ?? "Échec de la suppression.");
    }
  };

  const loadError = queryError
    ? problemMessage(queryError) ?? "Impossible de charger les données."
    : removeError;

  return (
    <Card>
      <CardHeader
        title={title}
        subtitle={subtitle}
        action={
          <Button onClick={startCreate} disabled={editing !== null}>
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        }
      />

      {editing && (
        <div className="border-b border-line bg-canvas px-5 py-4">
          <p className="mb-3 text-xs font-semibold text-ink">
            {editing.mode === "create" ? "Nouvelle entrée" : "Modifier l'entrée"}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} error={errors[f.key]?.message}>
                {f.type === "select" ? (
                  <select className={inputClass} {...register(f.key)}>
                    <option value="">— Sélectionner —</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.type}
                    step={f.step}
                    placeholder={f.placeholder}
                    className={inputClass}
                    {...register(f.key)}
                  />
                )}
              </Field>
            ))}
          </div>
          {formError && <p className="mt-3 text-sm text-danger">{formError}</p>}
          <div className="mt-4 flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
            <Button variant="ghost" onClick={cancel}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-muted">
              {columns.map((c) => (
                <th key={c.header} className="px-5 py-3 font-medium">
                  {c.header}
                </th>
              ))}
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-6 text-center text-muted">
                  Chargement…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-5 py-6 text-center text-muted">
                  Aucune entrée.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={String(row.id)} className="border-b border-line last:border-0">
                  {columns.map((c) => (
                    <td key={c.header} className="px-5 py-3">
                      {c.render(row)}
                    </td>
                  ))}
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => startEdit(row)}
                        title="Modifier"
                        aria-label="Modifier"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-primary-soft hover:text-primary"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => remove(row)}
                        title="Supprimer"
                        aria-label="Supprimer"
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {loadError && <p className="border-t border-line px-5 py-3 text-sm text-danger">{loadError}</p>}
    </Card>
  );
}
