import { useSyncExternalStore } from "react";
import axios from "axios";
import { api, setAuthToken } from "./api";
import { USE_REAL_API } from "./config";

/** Rôles applicatifs (alignés sur le backend — sérialisés en chaînes). */
export type Role =
  | "Admin"
  | "AgentPontBascule"
  | "AgentOrganisation"
  | "CommissionPrix"
  | "Commercant"
  | "Transporteur";

export const ROLE_LABELS: Record<Role, string> = {
  Admin: "Administrateur",
  AgentPontBascule: "Agent Pont à Bascule",
  AgentOrganisation: "Agent d'organisation",
  CommissionPrix: "Commission des prix",
  Commercant: "Commerçant",
  Transporteur: "Transporteur",
};

export interface AuthUser {
  username: string;
  fullName: string;
  role: Role;
}

export interface AuthState {
  user: AuthUser | null;
  token: string | null;
}

interface LoginResponse {
  token: string;
  expiresAt: string;
  user: AuthUser;
}

/** Comptes de démonstration (système de démo — affichés sur la page de connexion). */
export const DEMO_ACCOUNTS: ReadonlyArray<{
  username: string;
  password: string;
  fullName: string;
  role: Role;
}> = [
  { username: "admin", password: "Admin@2026", fullName: "Administrateur MGFL", role: "Admin" },
  { username: "agent.pab", password: "Pesage@2026", fullName: "Agent Pont à Bascule", role: "AgentPontBascule" },
  { username: "agent.orga", password: "Parking@2026", fullName: "Agent d'Organisation", role: "AgentOrganisation" },
  { username: "commission", password: "Prix@2026", fullName: "Commission des Prix", role: "CommissionPrix" },
  { username: "commercant", password: "Marche@2026", fullName: "Commerçant du Marché", role: "Commercant" },
  { username: "transporteur", password: "Route@2026", fullName: "Transporteur Partenaire", role: "Transporteur" },
];

const STORAGE_KEY = "mgfl.auth";

let state: AuthState = { user: null, token: null };

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setState(next: AuthState) {
  state = next;
  emit();
}

export function getAuthState(): AuthState {
  return state;
}

function persistSession(token: string, user: AuthUser) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user }));
  } catch {
    /* stockage indisponible : la session restera en mémoire uniquement */
  }
}

function clearPersistedSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

function applySession(token: string, user: AuthUser) {
  setAuthToken(token);
  persistSession(token, user);
  setState({ user, token });
}

/** Déconnexion : purge le token (mémoire, axios, sessionStorage). */
export function logout() {
  setAuthToken(null);
  clearPersistedSession();
  setState({ user: null, token: null });
}

/**
 * Connexion : API en mode réel, vérification locale des comptes démo en mode mock.
 * Rejette avec un message français en cas d'identifiants invalides.
 */
export async function login(username: string, password: string): Promise<AuthUser> {
  if (USE_REAL_API) {
    const { data } = await api.post<LoginResponse>("/api/auth/login", { username, password });
    applySession(data.token, data.user);
    return data.user;
  }
  const account = DEMO_ACCOUNTS.find(
    (a) => a.username === username.trim().toLowerCase() && a.password === password,
  );
  if (!account) throw new Error("Nom d'utilisateur ou mot de passe incorrect.");
  const user: AuthUser = { username: account.username, fullName: account.fullName, role: account.role };
  applySession(`mock-token-${account.username}`, user);
  return user;
}

/**
 * Restaure la session depuis le sessionStorage (rafraîchissement de page) :
 * ré-injecte l'en-tête Authorization puis, en mode réel, valide le token via /api/auth/me.
 */
function restoreSession() {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const saved = JSON.parse(raw) as { token?: string; user?: AuthUser };
    if (!saved.token || !saved.user?.username || !saved.user.role) return;
    setAuthToken(saved.token);
    setState({ user: saved.user, token: saved.token });
    if (USE_REAL_API) {
      api
        .get<AuthUser>("/api/auth/me")
        .then(({ data }) => setState({ user: data, token: saved.token ?? null }))
        .catch(() => logout());
    }
  } catch {
    clearPersistedSession();
  }
}

restoreSession();

// Intercepteur 401 : session expirée ou token invalide → purge + redirection /login.
// (On laisse passer le 401 du login lui-même : il est géré par la page de connexion.)
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? "";
      if (!url.includes("/api/auth/login")) {
        logout();
        if (window.location.pathname !== "/login") window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export function useAuth(): AuthState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
