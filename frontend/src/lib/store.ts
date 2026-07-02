import { api } from "./api";
import { USE_REAL_API } from "./config";
import { registerMockEtat } from "./etats";

/** Référentiel articles (prix de référence + prix unitaire de la taxe). */
export interface ArticleRef {
  name: string;
  referencePrice: number; // MAD/kg
  taxUnitPrice: number; // MAD/kg
}

export const ARTICLES: ArticleRef[] = [
  { name: "Pomme de terre", referencePrice: 4, taxUnitPrice: 0.02 },
  { name: "Tomate", referencePrice: 6, taxUnitPrice: 0.025 },
  { name: "Oignon", referencePrice: 3, taxUnitPrice: 0.015 },
  { name: "Fraise", referencePrice: 20, taxUnitPrice: 0.03 },
  { name: "Courgette", referencePrice: 5, taxUnitPrice: 0.02 },
  { name: "Carotte", referencePrice: 3.5, taxUnitPrice: 0.018 },
  { name: "Poivron", referencePrice: 7, taxUnitPrice: 0.022 },
  { name: "Orange", referencePrice: 5, taxUnitPrice: 0.02 },
];

export const taxRateOf = (article: string) =>
  ARTICLES.find((a) => a.name === article)?.taxUnitPrice ?? 0.02;
export const refPriceOf = (article: string) =>
  ARTICLES.find((a) => a.name === article)?.referencePrice ?? 0;

// Const tuples so the Zod form schemas can derive `z.enum` from them.
export const SOURCES = [
  "Souss-Massa (Agadir)",
  "Doukkala (El Jadida)",
  "Gharb (Kénitra)",
  "Saïss (Meknès)",
  "Import",
] as const;

export const MAGASINS = ["M-01", "M-02", "M-03", "M-04", "M-05", "M-06"] as const;

export interface VoyageItem {
  article: string;
  tonnage: number; // tonnage approximatif déclaré
}

export type PreStatus = "En attente" | "Pesé" | "Clôturé";

export interface PreDeclaration {
  code: string;
  matricule: string;
  transporteur: string;
  source: string;
  items: VoyageItem[];
  createdAt: string;
  status: PreStatus;
  // Renseignés au pont à bascule :
  netWeight?: number;
  tax?: number;
  magasin?: string;
}

export interface ArrivalLine {
  article: string;
  netWeight: number;
  value: number;
  tax: number;
  taxRate: number;
}

export interface ArrivalResult {
  code: string;
  netWeight: number;
  totalValue: number;
  totalTax: number;
  magasin: string;
  lines: ArrivalLine[];
  /** Numéro de l'état de base généré (téléchargement PDF en mode réel). */
  etatNumber: string;
}

const SEED: PreDeclaration[] = [
  {
    code: "PRE-2026-0042",
    matricule: "45821-A-6",
    transporteur: "Transport Atlas",
    source: "Souss-Massa (Agadir)",
    items: [{ article: "Tomate", tonnage: 8 }],
    createdAt: "Aujourd'hui 06:12",
    status: "Clôturé",
    netWeight: 7850,
    tax: 196.25,
    magasin: "M-02",
  },
  {
    code: "PRE-2026-0043",
    matricule: "11902-B-3",
    transporteur: "Sté. Nord Logistique",
    source: "Gharb (Kénitra)",
    items: [{ article: "Pomme de terre", tonnage: 12 }],
    createdAt: "Aujourd'hui 07:40",
    status: "En attente",
  },
  {
    code: "PRE-2026-0044",
    matricule: "77410-C-1",
    transporteur: "Transport Chaouia",
    source: "Doukkala (El Jadida)",
    items: [
      { article: "Oignon", tonnage: 6 },
      { article: "Carotte", tonnage: 3 },
    ],
    createdAt: "Aujourd'hui 08:15",
    status: "En attente",
  },
];

// Mock backend (mode démo) : données en mémoire. En mode réel, tout passe par l'API
// et le cache est porté par TanStack Query (clé ["pre-declarations"]).
let state: PreDeclaration[] = USE_REAL_API ? [] : [...SEED];

function updateMock(code: string, patch: Partial<PreDeclaration>) {
  state = state.map((d) => (d.code === code ? { ...d, ...patch } : d));
}

/** Recherche d'une pré-déclaration par code dans le jeu mock (mode mock + tests). */
export function getByCode(code: string) {
  return state.find((d) => d.code.toLowerCase() === code.trim().toLowerCase());
}

function nextCode() {
  const nums = state.map((d) => Number(d.code.split("-").pop())).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 44;
  return `PRE-2026-${String(max + 1).padStart(4, "0")}`;
}

/** Liste des pré-déclarations — fonction de query (API en mode réel, mémoire en mock). */
export async function fetchPreDeclarations(): Promise<PreDeclaration[]> {
  if (USE_REAL_API) {
    const { data } = await api.get<PreDeclaration[]>("/api/pre-declarations");
    return data;
  }
  return state.map((d) => ({ ...d, items: d.items.map((i) => ({ ...i })) }));
}

export interface CreatePreDeclarationInput {
  matricule: string;
  transporteur: string;
  source: string;
  items: VoyageItem[];
}

/** Crée une pré-déclaration (mutation — API en mode réel, mémoire en mode mock). */
export async function createPreDeclaration(input: CreatePreDeclarationInput): Promise<PreDeclaration> {
  if (USE_REAL_API) {
    const { data } = await api.post<PreDeclaration>("/api/pre-declarations", input);
    return data;
  }
  const decl: PreDeclaration = {
    code: nextCode(),
    matricule: input.matricule,
    transporteur: input.transporteur,
    source: input.source,
    items: input.items,
    createdAt: "À l'instant",
    status: "En attente",
  };
  state = [decl, ...state];
  return decl;
}

// --- Contrôle de vraisemblance (§7.3 — BLOQUANT) ---

/** Poids de référence par caisse (kg) — utilisé par le contrôle de vraisemblance en mode mock. */
export const CRATE_REF_WEIGHTS: Record<string, number> = {
  "Pomme de terre": 30,
  Tomate: 20,
  Oignon: 25,
  Fraise: 5,
  Courgette: 18,
  Carotte: 22,
  Poivron: 12,
  Orange: 20,
};

/** Seuil de tolérance du contrôle de vraisemblance (±15 %). */
export const PLAUSIBILITY_TOLERANCE = 0.15;

export interface PlausibilityResult {
  ok: boolean;
  reason?: string;
  realPerCrate: number;
  referencePerCrate: number;
}

/**
 * Compare le poids réel par caisse (poids total déclaré / nb caisses) au poids
 * de référence paramétré. Hors tolérance → données incohérentes → blocage.
 */
export function checkPlausibility(article: string, declaredWeight: number, crates: number): PlausibilityResult {
  const reference = CRATE_REF_WEIGHTS[article] ?? 0;
  if (reference <= 0 || crates <= 0) {
    return { ok: true, realPerCrate: 0, referencePerCrate: reference };
  }
  const realPerCrate = declaredWeight / crates;
  const deviation = Math.abs(realPerCrate - reference) / reference;
  if (deviation > PLAUSIBILITY_TOLERANCE) {
    return {
      ok: false,
      realPerCrate,
      referencePerCrate: reference,
      reason:
        `Article « ${article} » : ${realPerCrate.toFixed(1)} kg/caisse constaté contre ` +
        `${reference} kg/caisse de référence (écart ${Math.round(deviation * 100)} % > ` +
        `${Math.round(PLAUSIBILITY_TOLERANCE * 100)} %). Vérification manuelle requise.`,
    };
  }
  return { ok: true, realPerCrate, referencePerCrate: reference };
}

/** Erreur levée (mode mock) quand le contrôle de vraisemblance bloque la génération. */
export class ArrivalBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArrivalBlockedError";
  }
}

export interface ArrivalLineInput {
  article: string;
  crates: number | null;
}

export interface SubmitArrivalInput {
  code: string;
  grossWeight: number;
  tareWeight: number;
  packagingWeight: number;
  magasin: string;
  /** Nb de caisses par article (optionnel) — déclenche le contrôle de vraisemblance. */
  lines?: ArrivalLineInput[];
}

/** Pesage : persiste l'arrivage + l'état de base (API) ou met à jour la mémoire (mock). */
export async function submitArrival(input: SubmitArrivalInput): Promise<ArrivalResult> {
  if (USE_REAL_API) {
    // Le backend renvoie 422 ProblemDetails (sans persister) si le contrôle
    // de vraisemblance échoue — l'erreur axios remonte à l'appelant.
    const { data } = await api.post<ArrivalResult>("/api/arrivals", input);
    return data;
  }
  // Mode mock : calcul local (même formule que le backend).
  const voyage = getByCode(input.code);
  const net = Math.max(0, input.grossWeight - input.tareWeight - input.packagingWeight);
  const totalTonnage = voyage?.items.reduce((s, i) => s + i.tonnage, 0) ?? 0;
  // Contrôle de vraisemblance BLOQUANT : aucune persistance en cas d'écart.
  if (input.lines?.length && voyage && totalTonnage > 0) {
    const reasons = input.lines
      .filter((l): l is { article: string; crates: number } => l.crates !== null && l.crates > 0)
      .map((l) => {
        const item = voyage.items.find((i) => i.article === l.article);
        const share = item ? net * (item.tonnage / totalTonnage) : 0;
        return checkPlausibility(l.article, share, l.crates);
      })
      .filter((r) => !r.ok)
      .map((r) => r.reason ?? "");
    if (reasons.length > 0) throw new ArrivalBlockedError(reasons.join(" "));
  }
  const lines: ArrivalLine[] = (voyage?.items ?? []).map((it) => {
    const share = totalTonnage > 0 ? net * (it.tonnage / totalTonnage) : 0;
    return {
      article: it.article,
      netWeight: share,
      value: share * refPriceOf(it.article),
      tax: share * taxRateOf(it.article),
      taxRate: taxRateOf(it.article),
    };
  });
  const totalTax = lines.reduce((s, l) => s + l.tax, 0);
  const totalValue = lines.reduce((s, l) => s + l.value, 0);
  updateMock(input.code, { status: "Pesé", netWeight: net, tax: totalTax, magasin: input.magasin });
  // État de base de session (mode mock) — listé sur la page « État de base ».
  const etatNumber = registerMockEtat({
    matricule: voyage?.matricule ?? "—",
    magasin: input.magasin,
    totalNetWeight: net,
    totalMerchandiseValue: totalValue,
    totalTax,
  });
  return { code: input.code, netWeight: net, totalValue, totalTax, magasin: input.magasin, lines, etatNumber };
}

/**
 * Sortie du véhicule : clôture le voyage (statut « Clôturé ») et libère
 * l'emplacement de parking côté backend (API en mode réel, mémoire en mock).
 */
export async function departVoyage(code: string): Promise<PreDeclaration> {
  if (USE_REAL_API) {
    const { data } = await api.post<PreDeclaration>(`/api/arrivals/${code}/depart`, {});
    return data;
  }
  const voyage = getByCode(code);
  if (!voyage) throw new Error("Voyage introuvable.");
  updateMock(code, { status: "Clôturé" });
  return { ...voyage, status: "Clôturé" };
}
