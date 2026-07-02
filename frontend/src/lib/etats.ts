import { api } from "./api";
import { USE_REAL_API } from "./config";

/** Résumé d'un état de base (document fiscal/logistique généré au pesage). */
export interface EtatDeBaseSummary {
  number: string;
  /** Date ISO 8601. */
  date: string;
  matricule: string;
  magasin: string;
  totalNetWeight: number;
  totalMerchandiseValue: number;
  totalTax: number;
  /** Libellé français renvoyé par le backend : « Généré », « Imprimé », « Réceptionné »… */
  status: string;
}

/**
 * Liste des états de base — fonction de query TanStack (`["etats-de-base"]`).
 * API en mode réel ; états de session en mémoire en mode mock.
 */
export async function fetchEtats(): Promise<EtatDeBaseSummary[]> {
  if (USE_REAL_API) {
    const { data } = await api.get<EtatDeBaseSummary[]>("/api/etats-de-base");
    return data;
  }
  return etats.map((e) => ({ ...e }));
}

/**
 * Télécharge le PDF d'un état de base (mode réel) : réponse binaire
 * `application/pdf` enregistrée sous `etat-de-base-{number}.pdf` via une
 * URL d'objet temporaire + clic sur une ancre.
 */
export async function downloadEtatPdf(number: string): Promise<void> {
  const { data } = await api.get<Blob>(`/api/etats-de-base/${encodeURIComponent(number)}/pdf`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(data);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `etat-de-base-${number}.pdf`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// --- Mode mock : états générés pendant la session (pesages du pont à bascule) ---

let etats: EtatDeBaseSummary[] = [];

function nextEtatNumber(): string {
  const nums = etats.map((e) => Number(e.number.split("-").pop())).filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `EDB-2026-${String(max + 1).padStart(4, "0")}`;
}

export interface RegisterMockEtatInput {
  matricule: string;
  magasin: string;
  totalNetWeight: number;
  totalMerchandiseValue: number;
  totalTax: number;
}

/** Enregistre un état de base en mémoire (mode mock) et renvoie son numéro. */
export function registerMockEtat(input: RegisterMockEtatInput): string {
  const number = nextEtatNumber();
  etats = [
    {
      number,
      date: new Date().toISOString(),
      matricule: input.matricule,
      magasin: input.magasin,
      totalNetWeight: input.totalNetWeight,
      totalMerchandiseValue: input.totalMerchandiseValue,
      totalTax: input.totalTax,
      status: "Généré",
    },
    ...etats,
  ];
  return number;
}
