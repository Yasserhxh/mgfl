import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck } from "lucide-react";
import { Button, Card, CardHeader, Pill } from "../../components/ui";
import { mad, problemMessage } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { endReservation, fetchReservations } from "../../lib/reservations";

/** `yyyy-MM-dd` → `dd/MM/yyyy` (sans passer par Date : évite tout décalage de fuseau). */
function frDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}

/** Liste des réservations d'emplacements avec clôture des réservations actives. */
export default function ReservationsCard() {
  const queryClient = useQueryClient();
  const { data: reservations = [] } = useQuery({
    queryKey: queryKeys.reservations,
    queryFn: fetchReservations,
  });
  const [error, setError] = useState<string | null>(null);
  const [ending, setEnding] = useState<string | null>(null);

  // Ending a reservation frees the spot: refresh both caches.
  const endMutation = useMutation({
    mutationFn: endReservation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.spots });
    },
  });

  const terminate = async (id: string) => {
    if (ending) return;
    setEnding(id);
    setError(null);
    try {
      await endMutation.mutateAsync(id);
    } catch (err) {
      setError(problemMessage(err) ?? "Impossible de terminer cette réservation. Réessayer.");
    } finally {
      setEnding(null);
    }
  };

  const active = reservations.filter((r) => r.status === "Active").length;

  return (
    <Card>
      <CardHeader
        title="Réservations"
        subtitle="Réservations d'emplacements par les commerçants — frais à leur charge"
        action={<Pill tone="warning">{active} active(s)</Pill>}
      />
      {reservations.length === 0 ? (
        <p className="p-5 text-sm text-muted">Aucune réservation enregistrée.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs text-muted">
                <th className="px-5 py-3 font-medium">Magasin / baie</th>
                <th className="px-5 py-3 font-medium">Commerçant</th>
                <th className="px-5 py-3 font-medium">Période</th>
                <th className="px-5 py-3 font-medium">Frais</th>
                <th className="px-5 py-3 font-medium">Statut</th>
                <th className="px-5 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3 font-medium text-ink">
                    {r.store} · {r.bay}
                  </td>
                  <td className="px-5 py-3 text-ink">{r.merchant}</td>
                  <td className="px-5 py-3 text-muted">
                    {frDate(r.debut)} → {frDate(r.fin)}
                    <span className="ml-1 text-xs">
                      ({r.days} {r.days > 1 ? "jours" : "jour"})
                    </span>
                  </td>
                  <td className="px-5 py-3 font-medium text-primary">{mad(r.fee)}</td>
                  <td className="px-5 py-3">
                    <Pill tone={r.status === "Active" ? "info" : "muted"}>{r.status}</Pill>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {r.status === "Active" && (
                      <Button variant="ghost" onClick={() => terminate(r.id)} disabled={ending !== null}>
                        <CalendarCheck className="h-4 w-4" />
                        {ending === r.id ? "Clôture…" : "Terminer"}
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
  );
}
