/**
 * Shared domain types for the MGFL transporteur mobile app.
 * Mirrors the ASP.NET Core backend DTO contract.
 */

export interface User {
  username: string;
  fullName: string;
  role: string;
}

export interface Session {
  token: string;
  /** ISO 8601 expiration date of the JWT. */
  expiresAt: string;
  user: User;
}

export interface PreDeclarationItem {
  article: string;
  /** Approximate tonnage declared by the transporteur (in tonnes). */
  tonnage: number;
}

export type PreDeclarationStatus = 'En attente' | 'Pesé' | 'Clôturé';

export interface PreDeclaration {
  /** Business code, e.g. "PRE-2026-0045" — also the QR payload. */
  code: string;
  matricule: string;
  transporteur: string;
  source: string;
  items: PreDeclarationItem[];
  createdAt: string;
  status: PreDeclarationStatus;
  netWeight?: number;
  tax?: number;
  magasin?: string;
}

export interface NewPreDeclarationPayload {
  matricule: string;
  transporteur: string;
  source: string;
  items: PreDeclarationItem[];
  /**
   * Server URL of the merchandise photo (path relative to the API base URL).
   * In the offline queue it may still be a local device URI ("file:"/"content:"),
   * which means the photo has not been uploaded yet — it is uploaded and
   * substituted during queue flush.
   */
  photoUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface Article {
  code: string;
  name: string;
  famille: string;
  referenceWeightPerCrate: number;
  referencePrice: number;
  taxUnitPrice: number;
}

/** React Navigation route map (native stack). */
export type RootStackParamList = {
  Login: undefined;
  Voyages: undefined;
  NewPreDeclaration: undefined;
  Qr: { preDeclaration: PreDeclaration };
};
