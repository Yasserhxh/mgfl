import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:5080",
  headers: { "Content-Type": "application/json" },
});

// Le token JWT (quand l'auth est activée) est injecté ici.
export function setAuthToken(token: string | null) {
  if (token) api.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete api.defaults.headers.common.Authorization;
}

/** Corps d'erreur ProblemDetails (RFC 7807) renvoyé par l'API .NET. */
export interface ProblemDetails {
  title?: string;
  detail?: string;
  status?: number;
}

/** Extrait le message d'une erreur axios portant un ProblemDetails (detail, sinon title). */
export function problemMessage(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as ProblemDetails | undefined;
    return data?.detail ?? data?.title ?? null;
  }
  return null;
}

/** Statut HTTP d'une erreur axios (null si l'erreur n'en porte pas). */
export function errorStatus(err: unknown): number | null {
  return axios.isAxiosError(err) ? (err.response?.status ?? null) : null;
}

export const mad = (v: number) =>
  new Intl.NumberFormat("fr-MA", { style: "currency", currency: "MAD", maximumFractionDigits: 2 }).format(v);

export const kg = (v: number) =>
  `${new Intl.NumberFormat("fr-MA", { maximumFractionDigits: 3 }).format(v)} kg`;
