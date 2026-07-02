import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, Truck, Lock, CheckCircle2, CalendarPlus } from "lucide-react";
import { Card, Pill } from "../../components/ui";
import { mad } from "../../lib/api";
import { queryKeys } from "../../lib/queryKeys";
import { STORES, fetchSpots, toggleOccupancy, type Slot } from "../../lib/reservations";
import type { SpotStatusLabel } from "../../lib/services";
import ReservationDialog from "./ReservationDialog";
import ReservationsCard from "./ReservationsCard";

const STATUS_TONE: Record<SpotStatusLabel, "success" | "info" | "warning"> = {
  Libre: "success",
  Occupé: "info",
  Réservé: "warning",
};

export default function EmplacementsPage() {
  const queryClient = useQueryClient();
  const { data: slots = [] } = useQuery({ queryKey: queryKeys.spots, queryFn: fetchSpots });
  const [reserveTarget, setReserveTarget] = useState<Slot | null>(null);

  // Libre ↔ Occupé (déclaration d'occupation / libération automatique au départ).
  const toggleMutation = useMutation({
    mutationFn: toggleOccupancy,
    onSettled: () => void queryClient.invalidateQueries({ queryKey: queryKeys.spots }),
  });

  const stats = useMemo(() => {
    const by = (s: SpotStatusLabel) => slots.filter((x) => x.status === s).length;
    return { total: slots.length, libre: by("Libre"), occupe: by("Occupé"), reserve: by("Réservé") };
  }, [slots]);

  const revenue = useMemo(
    () => slots.reduce((s, x) => s + (x.status === "Réservé" ? x.fee ?? 0 : 0), 0),
    [slots],
  );

  const kpis = [
    { label: "Emplacements", value: stats.total, icon: MapPin, tone: "primary" as const },
    { label: "Libres", value: stats.libre, icon: CheckCircle2, tone: "success" as const },
    { label: "Occupés", value: stats.occupe, icon: Truck, tone: "info" as const },
    { label: "Réservés", value: stats.reserve, icon: Lock, tone: "warning" as const },
  ];

  const toneBg: Record<string, string> = {
    primary: "bg-primary-soft text-primary",
    success: "bg-success-soft text-success",
    info: "bg-info-soft text-info",
    warning: "bg-warning-soft text-warning",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Gestion des emplacements</h1>
        <p className="text-sm text-muted">
          Deux emplacements par magasin — occupation déclarée par l'agent d'organisation, libération automatique au départ.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label} className="flex items-center gap-3 p-5">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${toneBg[k.tone]}`}>
              <k.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted">{k.label}</p>
              <p className="text-xl font-bold text-ink">{k.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STORES.map((store) => {
          const bays = slots.filter((s) => s.store === store);
          return (
            <Card key={store} className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-ink">Magasin {store}</p>
                <span className="text-xs text-muted">2 emplacements</span>
              </div>
              <div className="space-y-2">
                {bays.map((s) => (
                  <div
                    key={s.id}
                    className="flex w-full items-center justify-between gap-2 rounded-lg border border-line px-3 py-2"
                  >
                    {/* Occupation : Libre ↔ Occupé (libération automatique au départ). */}
                    <button
                      onClick={() => toggleMutation.mutate(s)}
                      disabled={s.status === "Réservé"}
                      className="min-w-0 flex-1 rounded-lg text-left transition-colors hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-80"
                    >
                      <p className="text-sm font-medium text-ink">Emplacement {s.bay}</p>
                      <p className="truncate text-xs text-muted">
                        {s.status === "Occupé" && `Camion ${s.matricule}`}
                        {s.status === "Réservé" && `${s.reservedBy} · ${mad(s.fee ?? 0)}`}
                        {s.status === "Libre" && "Disponible"}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-2">
                      {s.status === "Libre" && (
                        <button
                          onClick={() => setReserveTarget(s)}
                          className="inline-flex items-center gap-1 rounded-lg border border-line px-2 py-1 text-xs font-medium text-ink transition-colors hover:border-primary hover:text-primary"
                        >
                          <CalendarPlus className="h-3.5 w-3.5" /> Réserver
                        </button>
                      )}
                      <Pill tone={STATUS_TONE[s.status]}>{s.status}</Pill>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <ReservationsCard />

      <Card className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium text-muted">Recettes de réservation (en cours)</p>
          <p className="text-sm text-muted">Frais facturés aux commerçants pour les emplacements réservés.</p>
        </div>
        <p className="text-2xl font-bold text-primary">{mad(revenue)}</p>
      </Card>

      {reserveTarget && (
        <ReservationDialog spot={reserveTarget} onClose={() => setReserveTarget(null)} />
      )}
    </div>
  );
}
