import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DoorOpen, Truck } from "lucide-react";
import { Button, Card, CardHeader, Pill } from "../../components/ui";
import { problemMessage } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { departVoyage, fetchPreDeclarations } from "../../lib/store";

/**
 * Véhicules pesés en attente de sortie : clôture du voyage au départ
 * (libération automatique de l'emplacement côté backend).
 */
export default function DeparturesCard() {
  const queryClient = useQueryClient();
  const { data: declarations = [] } = useQuery({
    queryKey: queryKeys.preDeclarations,
    queryFn: fetchPreDeclarations,
  });
  const weighed = declarations.filter((d) => d.status === "Pesé");
  const [error, setError] = useState<string | null>(null);
  const [departing, setDeparting] = useState<string | null>(null);

  // Departure closes the voyage and frees the parking spot on the backend.
  const departMutation = useMutation({
    mutationFn: departVoyage,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.preDeclarations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.spots });
    },
  });

  const depart = async (code: string) => {
    if (departing) return;
    setDeparting(code);
    setError(null);
    try {
      await departMutation.mutateAsync(code);
    } catch (err) {
      setError(problemMessage(err) ?? "Impossible de clôturer ce voyage. Réessayer.");
    } finally {
      setDeparting(null);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Véhicules sur le marché"
        subtitle="Voyages pesés — clôturer à la sortie du véhicule (libère l'emplacement)"
        action={<Pill tone="info">{weighed.length} pesé(s)</Pill>}
      />
      <div className="divide-y divide-line">
        {weighed.length === 0 && (
          <p className="p-5 text-sm text-muted">Aucun véhicule pesé en attente de sortie.</p>
        )}
        {weighed.map((d) => (
          <div key={d.code} className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-info-soft text-info">
                <Truck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="font-mono text-sm font-medium text-ink">{d.code}</p>
                <p className="truncate text-xs text-muted">
                  {d.transporteur} · {d.matricule}
                  {d.magasin ? ` · Magasin ${d.magasin}` : ""}
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={() => depart(d.code)} disabled={departing !== null}>
              <DoorOpen className="h-4 w-4" />
              {departing === d.code ? "Clôture…" : "Sortie (clôturer)"}
            </Button>
          </div>
        ))}
      </div>
      {error && <p className="border-t border-line px-5 py-3 text-sm text-danger">{error}</p>}
    </Card>
  );
}
