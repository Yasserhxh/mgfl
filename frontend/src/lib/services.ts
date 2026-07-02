import { api } from "./api";
import { USE_REAL_API } from "./config";

// --- Prix de référence ---
export interface PriceRow {
  code: string;
  name: string;
  min: number;
  max: number;
  taxRate: number;
}

/** Weekly grid seed — mock-mode data and fallback when the API is unreachable. */
export const INITIAL_PRIX: PriceRow[] = [
  { code: "PDT", name: "Pomme de terre", min: 3.5, max: 4.5, taxRate: 0.02 },
  { code: "TOM", name: "Tomate", min: 5.0, max: 7.0, taxRate: 0.025 },
  { code: "OIG", name: "Oignon", min: 2.5, max: 3.5, taxRate: 0.015 },
  { code: "FRA", name: "Fraise", min: 16.0, max: 24.0, taxRate: 0.03 },
  { code: "CGT", name: "Courgette", min: 4.0, max: 6.0, taxRate: 0.02 },
  { code: "CAR", name: "Carotte", min: 3.0, max: 4.0, taxRate: 0.018 },
];

// Mock backend: in-memory grid (real mode goes through the API).
let prixRows: PriceRow[] = INITIAL_PRIX.map((r) => ({ ...r }));

/** Reference price grid — TanStack query function (`["prix-reference"]`). */
export async function fetchPrix(): Promise<PriceRow[]> {
  if (USE_REAL_API) {
    const { data } = await api.get<PriceRow[]>("/api/prix-reference");
    return data;
  }
  return prixRows.map((r) => ({ ...r }));
}

/** Publishes the weekly grid (mutation — API in real mode, memory in mock mode). */
export async function publishPrix(rows: PriceRow[]): Promise<PriceRow[]> {
  if (USE_REAL_API) {
    const { data } = await api.put<PriceRow[]>("/api/prix-reference", { rows });
    return data;
  }
  prixRows = rows.map((r) => ({ ...r }));
  return prixRows.map((r) => ({ ...r }));
}

// --- Emplacements ---
export type SpotStatusLabel = "Libre" | "Occupé" | "Réservé";

export interface SpotDto {
  id: string;
  store: string;
  bay: string;
  status: SpotStatusLabel;
  matricule?: string | null;
  reservedBy?: string | null;
  fee?: number | null;
}

export const fetchSpots = () => api.get<SpotDto[]>("/api/emplacements").then((r) => r.data);

export const updateSpot = (
  id: string,
  patch: { status: SpotStatusLabel; matricule?: string | null; reservedBy?: string | null; fee?: number | null },
) => api.put<SpotDto>(`/api/emplacements/${id}`, patch).then((r) => r.data);

// --- Réservations d'emplacements (§6.4) ---
export type ReservationStatus = "Active" | "Terminée";

export interface ReservationDto {
  id: string;
  spotId: string;
  store: string;
  bay: string;
  merchant: string;
  /** Dates ISO `yyyy-MM-dd`. */
  debut: string;
  fin: string;
  /** Nombre de jours inclusif (min 1). */
  days: number;
  /** Frais en MAD (days × tarif journalier). */
  fee: number;
  status: ReservationStatus;
}

export interface CreateReservationBody {
  spotId: string;
  merchant: string;
  debut: string;
  fin: string;
}

export const fetchReservationsApi = () =>
  api.get<ReservationDto[]>("/api/reservations").then((r) => r.data);

export const createReservationApi = (body: CreateReservationBody) =>
  api.post<ReservationDto>("/api/reservations", body).then((r) => r.data);

export const endReservationApi = (id: string) =>
  api.post<ReservationDto>(`/api/reservations/${encodeURIComponent(id)}/end`, {}).then((r) => r.data);

// --- Infractions ---
export type InfractionKind = "Evasion" | "ManqueDeclaration" | "EmballageDifferent";

export interface InfractionDto {
  reference: string;
  matricule: string;
  type: InfractionKind;
  amount: number;
  date: string;
}

/** Penalty per infraction type (§7.5 — all doubled), mirror of the backend formula. */
export function infractionPenalty(
  type: InfractionKind,
  taxAmount: number,
  undeclaredWeight: number,
  articlePrice: number,
): number {
  switch (type) {
    case "ManqueDeclaration":
      return undeclaredWeight * articlePrice * 2;
    case "Evasion":
    case "EmballageDifferent":
    default:
      return taxAmount * 2;
  }
}

/** Demo log seed — mock-mode data and fallback when the API is unreachable. */
export const INITIAL_INFRACTIONS: InfractionDto[] = [
  { reference: "INF-2026-011", matricule: "45821-A-6", type: "Evasion", amount: 480, date: "Hier 14:20" },
  { reference: "INF-2026-012", matricule: "11902-B-3", type: "ManqueDeclaration", amount: 1600, date: "Hier 16:05" },
];

// Mock backend: in-memory log (real mode goes through the API).
let infractionsLog: InfractionDto[] = USE_REAL_API ? [] : INITIAL_INFRACTIONS.map((i) => ({ ...i }));

function nextInfractionRef(): string {
  const nums = infractionsLog
    .map((i) => Number(i.reference.split("-").pop()))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 12;
  return `INF-2026-${String(max + 1).padStart(3, "0")}`;
}

export interface RecordInfractionInput {
  matricule: string;
  type: InfractionKind;
  taxAmount: number;
  undeclaredWeight: number;
  articlePrice: number;
}

/** Infractions log — TanStack query function (`["infractions"]`). */
export async function fetchInfractions(): Promise<InfractionDto[]> {
  if (USE_REAL_API) {
    const { data } = await api.get<InfractionDto[]>("/api/infractions");
    return data;
  }
  return infractionsLog.map((i) => ({ ...i }));
}

/** Records an infraction (mutation — API in real mode, memory in mock mode). */
export async function recordInfraction(payload: RecordInfractionInput): Promise<InfractionDto> {
  if (USE_REAL_API) {
    const { data } = await api.post<InfractionDto>("/api/infractions", payload);
    return data;
  }
  const dto: InfractionDto = {
    reference: nextInfractionRef(),
    matricule: payload.matricule,
    type: payload.type,
    amount: infractionPenalty(payload.type, payload.taxAmount, payload.undeclaredWeight, payload.articlePrice),
    date: "À l'instant",
  };
  infractionsLog = [dto, ...infractionsLog];
  return dto;
}
