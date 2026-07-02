/**
 * Coherent TanStack Query cache keys for all server state (spec §10).
 * Every useQuery/useMutation must reference these keys — never inline strings —
 * so mutations can reliably invalidate the affected caches.
 */
export const queryKeys = {
  articles: ["articles"] as const,
  preDeclarations: ["pre-declarations"] as const,
  spots: ["spots"] as const,
  reservations: ["reservations"] as const,
  prixReference: ["prix-reference"] as const,
  infractions: ["infractions"] as const,
  etatsDeBase: ["etats-de-base"] as const,
  referentiels: (resource: string) => ["referentiels", resource] as const,
};
