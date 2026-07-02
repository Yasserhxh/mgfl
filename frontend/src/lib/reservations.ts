import { USE_REAL_API } from "./config";
import {
  createReservationApi,
  endReservationApi,
  fetchReservationsApi,
  fetchSpots as fetchSpotsApi,
  updateSpot,
  type CreateReservationBody,
  type ReservationDto,
  type SpotStatusLabel,
} from "./services";

// --- Règle de frais (§6.4) — miroir exact du calcul backend ---

/** Tarif journalier de réservation d'un emplacement (MAD/jour). */
export const DAILY_RATE = 250;

const MS_PER_DAY = 86_400_000;

/**
 * Nombre de jours inclusif entre deux dates ISO `yyyy-MM-dd` (min 1).
 * Exemple : 2026-07-01 → 2026-07-03 = 3 jours. Une fin antérieure au début
 * est clampée à 1 jour (le formulaire rejette ce cas en amont).
 */
export function reservationDays(debut: string, fin: string): number {
  const start = Date.parse(debut);
  const end = Date.parse(fin);
  if (Number.isNaN(start) || Number.isNaN(end)) return 1;
  return Math.max(1, Math.floor((end - start) / MS_PER_DAY) + 1);
}

/** Frais de réservation en MAD : jours inclusifs × tarif journalier. */
export function reservationFee(debut: string, fin: string): number {
  return reservationDays(debut, fin) * DAILY_RATE;
}

// --- Emplacements (spots) ---

export interface Slot {
  id: string;
  store: string; // magasin
  bay: string;
  status: SpotStatusLabel;
  matricule?: string; // si occupé
  reservedBy?: string; // commerçant si réservé
  fee?: number; // frais de réservation en cours
}

/** Chaque magasin dispose de 2 emplacements (A/B). */
export const STORES = ["M-01", "M-02", "M-03", "M-04", "M-05", "M-06"];

export function seedSpots(): Slot[] {
  const preset: Record<string, Partial<Slot>[]> = {
    "M-01": [{ status: "Occupé", matricule: "45821-A-6" }, { status: "Libre" }],
    "M-02": [{ status: "Réservé", reservedBy: "Ets. Bennani", fee: 750 }, { status: "Occupé", matricule: "11902-B-3" }],
    "M-03": [{ status: "Libre" }, { status: "Libre" }],
    "M-04": [{ status: "Occupé", matricule: "77410-C-1" }, { status: "Réservé", reservedBy: "Sté. Alami", fee: 500 }],
    "M-05": [{ status: "Libre" }, { status: "Occupé", matricule: "20933-A-9" }],
    "M-06": [{ status: "Libre" }, { status: "Libre" }],
  };
  return STORES.flatMap((store) =>
    (["A", "B"] as const).map((bay, i) => ({
      id: `${store}-${bay}`,
      store,
      bay,
      status: (preset[store]?.[i]?.status ?? "Libre") as SpotStatusLabel,
      matricule: preset[store]?.[i]?.matricule,
      reservedBy: preset[store]?.[i]?.reservedBy,
      fee: preset[store]?.[i]?.fee,
    })),
  );
}

// Mock backend (mode démo) : données en mémoire. En mode réel, tout passe par
// l'API et le cache est porté par TanStack Query (clés ["spots"] / ["reservations"]).
let spots: Slot[] = seedSpots();

/** Accès direct au jeu mock (mode mock + tests). */
export function getSpots(): Slot[] {
  return spots;
}

/** Grille des emplacements — fonction de query TanStack (`["spots"]`). */
export async function fetchSpots(): Promise<Slot[]> {
  if (USE_REAL_API) {
    const data = await fetchSpotsApi();
    return data.map((s) => ({
      id: s.id,
      store: s.store,
      bay: s.bay,
      status: s.status,
      matricule: s.matricule ?? undefined,
      reservedBy: s.reservedBy ?? undefined,
      fee: s.fee ?? undefined,
    }));
  }
  return spots.map((s) => ({ ...s }));
}

/**
 * Occupation déclarée par l'agent d'organisation : Libre → Occupé, puis
 * libération automatique au départ (Occupé → Libre). Sans effet sur Réservé.
 */
export async function toggleOccupancy(spot: Slot): Promise<void> {
  if (spot.status === "Réservé") return;
  const next: Slot =
    spot.status === "Libre"
      ? { ...spot, status: "Occupé", matricule: "—— (à déclarer)" }
      : { ...spot, status: "Libre", matricule: undefined };
  if (USE_REAL_API) {
    await updateSpot(spot.id, { status: next.status, matricule: next.matricule ?? null });
    return;
  }
  spots = spots.map((s) => (s.id === spot.id ? next : s));
}

// --- Réservations : magasin/baie, commerçant, période, frais ---

export type Reservation = ReservationDto;

/** Jeu de démo cohérent avec les emplacements "Réservé" du seed. */
const SEED_RESERVATIONS: Reservation[] = [
  {
    id: "R-2026-0001",
    spotId: "M-02-A",
    store: "M-02",
    bay: "A",
    merchant: "Ets. Bennani",
    debut: "2026-07-01",
    fin: "2026-07-03",
    days: 3,
    fee: 750,
    status: "Active",
  },
  {
    id: "R-2026-0002",
    spotId: "M-04-B",
    store: "M-04",
    bay: "B",
    merchant: "Sté. Alami",
    debut: "2026-07-02",
    fin: "2026-07-03",
    days: 2,
    fee: 500,
    status: "Active",
  },
];

let reservations: Reservation[] = USE_REAL_API ? [] : SEED_RESERVATIONS.map((r) => ({ ...r }));

/** Accès direct au jeu mock (mode mock + tests). */
export function getReservations(): Reservation[] {
  return reservations;
}

/** Liste des réservations — fonction de query TanStack (`["reservations"]`). */
export async function fetchReservations(): Promise<Reservation[]> {
  if (USE_REAL_API) return fetchReservationsApi();
  return reservations.map((r) => ({ ...r }));
}

function nextReservationId(): string {
  const nums = reservations
    .map((r) => Number(r.id.split("-").pop()))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `R-2026-${String(max + 1).padStart(4, "0")}`;
}

/**
 * Crée une réservation (API en mode réel, mémoire en mock) et passe
 * l'emplacement au statut « Réservé » — le backend bascule l'emplacement
 * lui-même ; l'appelant invalide les caches ["reservations"] et ["spots"].
 */
export async function createReservation(input: CreateReservationBody): Promise<Reservation> {
  if (USE_REAL_API) return createReservationApi(input);
  const merchant = input.merchant.trim();
  if (!merchant) throw new Error("Le nom du commerçant est requis.");
  if (!input.debut || !input.fin) throw new Error("Les dates de début et de fin sont requises.");
  const spot = spots.find((s) => s.id === input.spotId);
  if (!spot) throw new Error("Emplacement introuvable.");
  if (spot.status !== "Libre") throw new Error(`L'emplacement ${spot.id} n'est pas libre.`);
  const days = reservationDays(input.debut, input.fin);
  const reservation: Reservation = {
    id: nextReservationId(),
    spotId: spot.id,
    store: spot.store,
    bay: spot.bay,
    merchant,
    debut: input.debut,
    fin: input.fin,
    days,
    fee: days * DAILY_RATE,
    status: "Active",
  };
  reservations = [reservation, ...reservations];
  spots = spots.map((s) =>
    s.id === spot.id
      ? { ...s, status: "Réservé", reservedBy: merchant, fee: reservation.fee, matricule: undefined }
      : s,
  );
  return reservation;
}

/** Termine une réservation (statut « Terminée ») et libère l'emplacement. */
export async function endReservation(id: string): Promise<Reservation> {
  if (USE_REAL_API) return endReservationApi(id);
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) throw new Error("Réservation introuvable.");
  if (reservation.status === "Terminée") return reservation;
  const updated: Reservation = { ...reservation, status: "Terminée" };
  reservations = reservations.map((r) => (r.id === id ? updated : r));
  spots = spots.map((s) =>
    s.id === reservation.spotId
      ? { ...s, status: "Libre", reservedBy: undefined, fee: undefined }
      : s,
  );
  return updated;
}

/** Réinitialise les stores mock (tests uniquement). */
export function resetMockReservations() {
  spots = seedSpots();
  reservations = SEED_RESERVATIONS.map((r) => ({ ...r }));
}
