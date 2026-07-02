import { Card } from "../../components/ui";
import { QrVisual } from "../../components/QrVisual";
import { kg, mad } from "../../lib/api";
import type { PreDeclaration } from "../../lib/store";

export interface BreakdownLine {
  article: string;
  netWeight: number;
  value: number;
  tax: number;
}

interface Props {
  voyage: PreDeclaration;
  magasin: string;
  gross: number;
  tare: number;
  packaging: number;
  net: number;
  totalValue: number;
  totalTax: number;
  breakdown: BreakdownLine[];
  /** Numéro de l'état de base (renvoyé par le backend au pesage). */
  etatNumber?: string;
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="font-medium text-ink">{value}</p>
    </div>
  );
}

/** État de base imprimable (zone `print-area` : seul contenu imprimé). */
export default function EtatDocument({
  voyage,
  magasin,
  gross,
  tare,
  packaging,
  net,
  totalValue,
  totalTax,
  breakdown,
  etatNumber,
}: Props) {
  return (
    <Card className="print-area p-6">
      <div className="flex items-start justify-between border-b border-line pb-4">
        <div>
          <p className="text-lg font-bold text-ink">État de base</p>
          <p className="text-sm text-muted">Marché de Gros de Fruits et Légumes · Casablanca</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-semibold text-ink">{voyage.code}</p>
          {etatNumber && <p className="font-mono text-xs text-muted">État {etatNumber}</p>}
          <p className="text-xs text-muted">Pont à bascule</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 py-4 text-sm sm:grid-cols-4">
        <Info label="Transporteur" value={voyage.transporteur} />
        <Info label="Matricule" value={voyage.matricule} />
        <Info label="Source" value={voyage.source} />
        <Info label="Destination" value={`Magasin ${magasin}`} />
      </div>

      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-line bg-canvas text-left text-xs text-muted">
              <th className="px-4 py-2 font-medium">Article</th>
              <th className="px-4 py-2 font-medium">Poids net</th>
              <th className="px-4 py-2 font-medium">Valeur</th>
              <th className="px-4 py-2 font-medium">Taxe</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((l) => (
              <tr key={l.article} className="border-b border-line last:border-0">
                <td className="px-4 py-2 font-medium text-ink">{l.article}</td>
                <td className="px-4 py-2 text-muted">{kg(l.netWeight)}</td>
                <td className="px-4 py-2 text-muted">{mad(l.value)}</td>
                <td className="px-4 py-2 font-medium text-ink">{mad(l.tax)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-canvas font-bold text-ink">
              <td className="px-4 py-2">Totaux</td>
              <td className="px-4 py-2">{kg(net)}</td>
              <td className="px-4 py-2">{mad(totalValue)}</td>
              <td className="px-4 py-2 text-primary">{mad(totalTax)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex items-end justify-between gap-6">
        <div className="text-xs text-muted">
          <p>Poids brut : {kg(gross)} · Tare : {kg(tare)} · Emballage : {kg(packaging)}</p>
          <p className="mt-6 border-t border-dashed border-line pt-2">
            Accusé de réception du magasin (cachet humide) :
          </p>
        </div>
        <QrVisual value={voyage.code} size={96} />
      </div>
    </Card>
  );
}
