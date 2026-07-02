import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Trash2, FileText, ShieldAlert } from "lucide-react";
import { Card, CardHeader, Button, Field, Pill, inputClass } from "../../components/ui";
import { api, mad, kg } from "../../lib/api";
import type { Article, EtatDeBaseRequest, EtatDeBaseResponse, LoadKind } from "../../types";
import DocumentsSection from "./DocumentsSection";

interface DraftLine {
  key: string;
  articleId: string;
  kind: LoadKind;
  crateCount: number;
  declaredWeight: number;
  bulkPercentage: number;
}

const FALLBACK: Article[] = [
  { id: "pdt", code: "PDT", name: "Pomme de terre", referenceWeightPerCrate: 30, referencePrice: 4, taxUnitPrice: 0.02 },
  { id: "tom", code: "TOM", name: "Tomate", referenceWeightPerCrate: 20, referencePrice: 6, taxUnitPrice: 0.02 },
  { id: "oig", code: "OIG", name: "Oignon", referenceWeightPerCrate: 25, referencePrice: 3, taxUnitPrice: 0.015 },
  { id: "fra", code: "FRA", name: "Fraise", referenceWeightPerCrate: 5, referencePrice: 20, taxUnitPrice: 0.03 },
];

let counter = 0;
const newLine = (articleId: string): DraftLine => ({
  key: `l${counter++}`,
  articleId,
  kind: "Emballe",
  crateCount: 100,
  declaredWeight: 3000,
  bulkPercentage: 0.5,
});

export default function EtatDeBasePage() {
  const { data: articles = FALLBACK } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      try {
        const { data } = await api.get<Article[]>("/api/articles");
        return data.length ? data : FALLBACK;
      } catch {
        return FALLBACK;
      }
    },
  });

  const byId = useMemo(() => Object.fromEntries(articles.map((a) => [a.id, a])), [articles]);
  const [totalWeight, setTotalWeight] = useState(3000);
  const [tolerance, setTolerance] = useState(15);
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine(FALLBACK[0].id)]);

  const update = (key: string, patch: Partial<DraftLine>) =>
    setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const generate = useMutation({
    mutationFn: async () => {
      const body: EtatDeBaseRequest = {
        totalDeclaredWeight: totalWeight,
        tolerance: tolerance / 100,
        lines: lines.map((l) => {
          const a = byId[l.articleId] ?? articles[0];
          return {
            articleId: a.id,
            articleLabel: a.name,
            kind: l.kind,
            referenceWeightPerCrate: a.referenceWeightPerCrate,
            referencePrice: a.referencePrice,
            taxUnitPrice: a.taxUnitPrice,
            crateCount: l.kind === "Emballe" ? l.crateCount : null,
            declaredWeight: l.kind === "Emballe" ? l.declaredWeight : null,
            bulkPercentage: l.kind === "Vrac" ? l.bulkPercentage : null,
          };
        }),
      };
      const { data } = await api.post<EtatDeBaseResponse>("/api/etats-de-base/generate", body, {
        validateStatus: (s) => s === 200 || s === 422,
      });
      return data;
    },
  });

  const result = generate.data;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Génération de l'état de base</h1>
        <p className="text-sm text-muted">
          Calcul des valeurs et de la taxe Ad Valorem, avec contrôle de vraisemblance.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Lignes d'articles"
          subtitle="Articles emballés (caisses) ou en vrac (pourcentage du poids total)"
          action={
            <Button variant="ghost" onClick={() => setLines((ls) => [...ls, newLine(articles[0].id)])}>
              <Plus className="h-4 w-4" /> Ligne
            </Button>
          }
        />

        <div className="space-y-3 p-5">
          {lines.map((l) => {
            const a = byId[l.articleId];
            return (
              <div key={l.key} className="grid grid-cols-1 gap-3 rounded-lg border border-line p-3 sm:grid-cols-12 sm:items-end">
                <div className="sm:col-span-4">
                  <Field label="Article">
                    <select
                      className={inputClass}
                      value={l.articleId}
                      onChange={(e) => update(l.key, { articleId: e.target.value })}
                    >
                      {articles.map((art) => (
                        <option key={art.id} value={art.id}>
                          {art.name} — {mad(art.referencePrice)}/kg
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <div className="sm:col-span-2">
                  <Field label="Type">
                    <select
                      className={inputClass}
                      value={l.kind}
                      onChange={(e) => update(l.key, { kind: e.target.value as LoadKind })}
                    >
                      <option value="Emballe">Emballé</option>
                      <option value="Vrac">Vrac</option>
                    </select>
                  </Field>
                </div>

                {l.kind === "Emballe" ? (
                  <>
                    <div className="sm:col-span-2">
                      <Field label="Nb caisses">
                        <input
                          type="number"
                          className={inputClass}
                          value={l.crateCount}
                          onChange={(e) => update(l.key, { crateCount: Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                    <div className="sm:col-span-3">
                      <Field label="Poids déclaré (kg)" hint={a ? `réf. ${a.referenceWeightPerCrate} kg/caisse` : undefined}>
                        <input
                          type="number"
                          className={inputClass}
                          value={l.declaredWeight}
                          onChange={(e) => update(l.key, { declaredWeight: Number(e.target.value) })}
                        />
                      </Field>
                    </div>
                  </>
                ) : (
                  <div className="sm:col-span-5">
                    <Field label="Pourcentage du poids total (%)">
                      <input
                        type="number"
                        className={inputClass}
                        value={Math.round(l.bulkPercentage * 100)}
                        onChange={(e) => update(l.key, { bulkPercentage: Number(e.target.value) / 100 })}
                      />
                    </Field>
                  </div>
                )}

                <div className="sm:col-span-1 sm:pb-1">
                  <button
                    aria-label="Supprimer la ligne"
                    className="rounded-lg border border-line p-2 text-muted hover:border-danger hover:text-danger"
                    onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-line px-5 py-4">
          <div className="flex gap-4">
            <Field label="Poids total déclaré (kg)">
              <input
                type="number"
                className={`${inputClass} w-44`}
                value={totalWeight}
                onChange={(e) => setTotalWeight(Number(e.target.value))}
              />
            </Field>
            <Field label="Tolérance vraisemblance (%)">
              <input
                type="number"
                className={`${inputClass} w-44`}
                value={tolerance}
                onChange={(e) => setTolerance(Number(e.target.value))}
              />
            </Field>
          </div>
          <Button onClick={() => generate.mutate()} disabled={generate.isPending || lines.length === 0}>
            <FileText className="h-4 w-4" />
            {generate.isPending ? "Génération…" : "Générer l'état de base"}
          </Button>
        </div>
      </Card>

      {result?.isBlocked && (
        <Card className="border-warning/40 p-5">
          <div className="flex gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-bold text-ink">Génération bloquée — contrôle de vraisemblance</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {result.blockReasons.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      {result && !result.isBlocked && (
        <Card>
          <CardHeader
            title="État de base généré"
            subtitle="Articles triés par prix de référence croissant"
            action={<Pill tone="success">Généré</Pill>}
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">Article</th>
                  <th className="px-5 py-3 font-medium">Caisses</th>
                  <th className="px-5 py-3 font-medium">Poids net</th>
                  <th className="px-5 py-3 font-medium">Prix réf.</th>
                  <th className="px-5 py-3 font-medium">Valeur</th>
                  <th className="px-5 py-3 font-medium">Taxe</th>
                </tr>
              </thead>
              <tbody>
                {result.lines.map((l, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-medium text-ink">{l.articleLabel}</td>
                    <td className="px-5 py-3 text-muted">{l.crateCount ?? "—"}</td>
                    <td className="px-5 py-3 text-muted">{kg(l.netWeight)}</td>
                    <td className="px-5 py-3 text-muted">{mad(l.referencePrice)}</td>
                    <td className="px-5 py-3 text-ink">{mad(l.merchandiseValue)}</td>
                    <td className="px-5 py-3 font-medium text-primary">{mad(l.adValoremTax)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-canvas font-bold text-ink">
                  <td className="px-5 py-3" colSpan={2}>Totaux</td>
                  <td className="px-5 py-3">{kg(result.totalNetWeight)}</td>
                  <td className="px-5 py-3" />
                  <td className="px-5 py-3">{mad(result.totalMerchandiseValue)}</td>
                  <td className="px-5 py-3 text-primary">{mad(result.totalTax)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      <DocumentsSection />
    </div>
  );
}
