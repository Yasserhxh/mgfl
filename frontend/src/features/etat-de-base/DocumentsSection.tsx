import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Printer } from "lucide-react";
import { Button, Card, CardHeader, Pill } from "../../components/ui";
import { kg, mad, problemMessage } from "../../lib/api";
import { USE_REAL_API } from "../../lib/config";
import { downloadEtatPdf, fetchEtats, type EtatDeBaseSummary } from "../../lib/etats";
import { queryKeys } from "../../lib/queryKeys";

const STATUS_TONE: Record<string, "success" | "info" | "primary"> = {
  Généré: "success",
  Imprimé: "info",
  Réceptionné: "primary",
};

const dateFormat = new Intl.DateTimeFormat("fr-MA", { dateStyle: "short", timeStyle: "short" });

function frDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d);
}

/**
 * Documents générés : liste des états de base avec téléchargement PDF (mode
 * réel) ou impression navigateur sur une mise en page propre (mode mock).
 */
export default function DocumentsSection() {
  // fetchEtats is mode-agnostic (API in real mode, session states in mock mode).
  const { data: etats = [] } = useQuery({
    queryKey: queryKeys.etatsDeBase,
    queryFn: fetchEtats,
  });

  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** État sélectionné pour l'impression (mode mock). */
  const [printEtat, setPrintEtat] = useState<EtatDeBaseSummary | null>(null);

  // Ouvre le dialogue d'impression une fois le document imprimable rendu.
  useEffect(() => {
    if (!printEtat) return;
    const timer = window.setTimeout(() => window.print(), 50);
    return () => window.clearTimeout(timer);
  }, [printEtat]);

  const download = async (number: string) => {
    if (downloading) return;
    setDownloading(number);
    setError(null);
    try {
      await downloadEtatPdf(number);
    } catch (err) {
      setError(problemMessage(err) ?? "Téléchargement du PDF impossible. Réessayer.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <>
      <Card className="no-print">
        <CardHeader
          title="Documents générés"
          subtitle={
            USE_REAL_API
              ? "États de base enregistrés — téléchargement PDF"
              : "États de base générés pendant la session — impression navigateur"
          }
          action={<Pill tone="muted">{etats.length} document(s)</Pill>}
        />
        {etats.length === 0 ? (
          <p className="p-5 text-sm text-muted">
            Aucun état de base généré pour le moment. Les documents apparaissent après un pesage au pont à bascule.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-3 font-medium">N°</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Matricule</th>
                  <th className="px-5 py-3 font-medium">Magasin</th>
                  <th className="px-5 py-3 font-medium">Poids net</th>
                  <th className="px-5 py-3 font-medium">Valeur</th>
                  <th className="px-5 py-3 font-medium">Taxe</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                  <th className="px-5 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {etats.map((e) => (
                  <tr key={e.number} className="border-b border-line last:border-0">
                    <td className="px-5 py-3 font-mono font-medium text-ink">{e.number}</td>
                    <td className="px-5 py-3 text-muted">{frDateTime(e.date)}</td>
                    <td className="px-5 py-3 text-muted">{e.matricule}</td>
                    <td className="px-5 py-3 text-muted">{e.magasin}</td>
                    <td className="px-5 py-3 text-muted">{kg(e.totalNetWeight)}</td>
                    <td className="px-5 py-3 text-ink">{mad(e.totalMerchandiseValue)}</td>
                    <td className="px-5 py-3 font-medium text-primary">{mad(e.totalTax)}</td>
                    <td className="px-5 py-3">
                      <Pill tone={STATUS_TONE[e.status] ?? "muted"}>{e.status}</Pill>
                    </td>
                    <td className="px-5 py-3 text-right">
                      {USE_REAL_API ? (
                        <Button variant="ghost" onClick={() => download(e.number)} disabled={downloading !== null}>
                          <Download className="h-4 w-4" />
                          {downloading === e.number ? "Téléchargement…" : "PDF"}
                        </Button>
                      ) : (
                        <Button variant="ghost" onClick={() => setPrintEtat(e)}>
                          <Printer className="h-4 w-4" /> Imprimer
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {error && <p className="border-t border-line px-5 py-3 text-sm text-danger">{error}</p>}
      </Card>

      {/* Document imprimable (mode mock) : masqué à l'écran, seul contenu imprimé. */}
      {printEtat && (
        <div className="print-area hidden print:block">
          <div className="flex items-start justify-between border-b border-line pb-4">
            <div>
              <p className="text-lg font-bold text-ink">État de base</p>
              <p className="text-sm text-muted">Marché de Gros de Fruits et Légumes · Casablanca</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm font-semibold text-ink">{printEtat.number}</p>
              <p className="text-xs text-muted">{frDateTime(printEtat.date)}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4 py-4 text-sm">
            <div>
              <p className="text-xs font-medium text-muted">Matricule</p>
              <p className="font-medium text-ink">{printEtat.matricule}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Magasin réceptionnaire</p>
              <p className="font-medium text-ink">{printEtat.magasin}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Statut</p>
              <p className="font-medium text-ink">{printEtat.status}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted">Date</p>
              <p className="font-medium text-ink">{frDateTime(printEtat.date)}</p>
            </div>
          </div>

          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-4 py-2 font-medium">Poids net total</th>
                <th className="px-4 py-2 font-medium">Valeur marchandise</th>
                <th className="px-4 py-2 font-medium">Taxe totale</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-bold text-ink">
                <td className="px-4 py-2">{kg(printEtat.totalNetWeight)}</td>
                <td className="px-4 py-2">{mad(printEtat.totalMerchandiseValue)}</td>
                <td className="px-4 py-2">{mad(printEtat.totalTax)}</td>
              </tr>
            </tbody>
          </table>

          <p className="mt-8 border-t border-dashed border-line pt-2 text-xs text-muted">
            Accusé de réception du magasin (cachet humide) :
          </p>
        </div>
      )}
    </>
  );
}
