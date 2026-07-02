import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarRange, X } from "lucide-react";
import { Button, Field, inputClass } from "../../components/ui";
import { mad, problemMessage } from "../../lib/api";
import { useAuth } from "../../lib/auth";
import { queryKeys } from "../../lib/queryKeys";
import {
  DAILY_RATE,
  createReservation,
  reservationDays,
  reservationFee,
  type Slot,
} from "../../lib/reservations";
import { reservationSchema, type ReservationValues } from "./schema";

/** Date du jour au format ISO `yyyy-MM-dd` (fuseau local). */
function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

interface Props {
  spot: Slot;
  onClose: () => void;
}

/** Formulaire modal de réservation d'un emplacement libre (§6.4). */
export default function ReservationDialog({ spot, onClose }: Props) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReservationValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: {
      // Pré-remplissage : nom du commerçant connecté (rôle Commerçant uniquement).
      merchant: user?.role === "Commercant" ? user.fullName : "",
      debut: todayIso(),
      fin: todayIso(),
    },
  });

  // Creating a reservation flips the spot to « Réservé »: refresh both caches.
  const createMutation = useMutation({
    mutationFn: createReservation,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.reservations });
      void queryClient.invalidateQueries({ queryKey: queryKeys.spots });
    },
  });
  const submitting = createMutation.isPending;

  // Live fee preview — recomputed as the merchant edits the dates.
  const merchant = watch("merchant");
  const debut = watch("debut");
  const fin = watch("fin");
  const datesFilled = debut !== "" && fin !== "";
  const datesOrdered = datesFilled && fin >= debut; // comparaison ISO yyyy-MM-dd
  const days = datesFilled ? reservationDays(debut, fin) : 0;
  const fee = datesFilled ? reservationFee(debut, fin) : 0;
  const canSubmit = merchant.trim() !== "" && datesOrdered && !submitting;

  const submit = handleSubmit(async (values) => {
    if (submitting) return;
    setError(null);
    try {
      await createMutation.mutateAsync({
        spotId: spot.id,
        merchant: values.merchant,
        debut: values.debut,
        fin: values.fin,
      });
      onClose();
    } catch (err) {
      // 400 (dates invalides) / 409 (emplacement non libre) → ProblemDetails.
      const fallback = err instanceof Error ? err.message : "Erreur lors de la réservation. Réessayer.";
      setError(problemMessage(err) ?? fallback);
    }
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Réserver l'emplacement ${spot.id}`}
        className="w-full max-w-md rounded-xl border border-line bg-surface shadow-card"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-bold text-ink">Réserver un emplacement</h2>
            <p className="mt-0.5 text-xs text-muted">
              Magasin {spot.store} · Emplacement {spot.bay} — tarif {mad(DAILY_RATE)}/jour
            </p>
          </div>
          <button
            aria-label="Fermer"
            className="rounded-lg p-1 text-muted hover:bg-canvas hover:text-ink"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <Field label="Commerçant" error={errors.merchant?.message}>
            <input className={inputClass} placeholder="Nom du commerçant" {...register("merchant")} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date début" error={errors.debut?.message}>
              <input type="date" className={inputClass} {...register("debut")} />
            </Field>
            <Field label="Date fin" error={errors.fin?.message}>
              <input type="date" className={inputClass} min={debut || undefined} {...register("fin")} />
            </Field>
          </div>

          {datesFilled && !datesOrdered && (
            <p className="text-sm text-danger">
              La date de fin doit être postérieure ou égale à la date de début.
            </p>
          )}

          {datesOrdered && (
            <div className="flex items-center gap-2 rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary">
              <CalendarRange className="h-4 w-4 shrink-0" />
              <span>
                {days} {days > 1 ? "jours" : "jour"} × {DAILY_RATE} MAD ={" "}
                <strong>{mad(fee)}</strong>
              </span>
            </div>
          )}

          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-line px-5 py-4">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {submitting ? "Réservation…" : "Réserver"}
          </Button>
        </div>
      </div>
    </div>
  );
}
