/**
 * Mode de données de l'application.
 *
 *   VITE_API_MODE = "mock"  → mode test, données en mémoire, aucun backend requis (défaut).
 *   VITE_API_MODE = "real"  → appels à l'API .NET (VITE_API_URL, défaut http://localhost:5080).
 */
export const USE_REAL_API = import.meta.env.VITE_API_MODE === "real";
