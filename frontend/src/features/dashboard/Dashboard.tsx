import { Card, CardHeader, Pill } from "../../components/ui";
import { mad } from "../../lib/api";

type Kpi = { label: string; value: string; delta?: string; tone: "success" | "warning" | "info" | "danger" | "primary" };

const kpis: Kpi[] = [
  { label: "Arrivages du jour", value: "28", delta: "+4", tone: "primary" },
  { label: "États de base générés", value: "24", delta: "+3", tone: "success" },
  { label: "Générations bloquées", value: "2", delta: "vraisemblance", tone: "warning" },
  { label: "Infractions constatées", value: "1", delta: "+1", tone: "danger" },
];

const recent = [
  { matricule: "12345-A-6", article: "Pomme de terre", poids: "3 000 kg", taxe: 240, statut: "Généré", tone: "success" as const },
  { matricule: "55821-B-1", article: "Tomate", poids: "2 400 kg", taxe: 288, statut: "Imprimé", tone: "info" as const },
  { matricule: "98012-C-9", article: "Fraise", poids: "350 kg", taxe: 210, statut: "Bloqué", tone: "warning" as const },
  { matricule: "11234-A-2", article: "Oignon (vrac)", poids: "5 000 kg", taxe: 225, statut: "Réceptionné", tone: "success" as const },
];

export default function Dashboard() {
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Tableau de bord</h1>
        <p className="text-sm text-muted">Activité du pont à bascule — 30 derniers jours</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted">{k.label}</p>
              {k.delta && <Pill tone={k.tone}>{k.delta}</Pill>}
            </div>
            <p className="mt-3 text-3xl font-bold text-ink">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Arrivages récents" subtitle="Derniers passages au pont à bascule" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Matricule</th>
                <th className="px-5 py-3 font-medium">Article</th>
                <th className="px-5 py-3 font-medium">Poids net</th>
                <th className="px-5 py-3 font-medium">Taxe</th>
                <th className="px-5 py-3 font-medium">Statut</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.matricule} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="px-5 py-3 font-medium text-ink">{r.matricule}</td>
                  <td className="px-5 py-3 text-ink">{r.article}</td>
                  <td className="px-5 py-3 text-muted">{r.poids}</td>
                  <td className="px-5 py-3 font-medium text-ink">{mad(r.taxe)}</td>
                  <td className="px-5 py-3">
                    <Pill tone={r.tone}>{r.statut}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
