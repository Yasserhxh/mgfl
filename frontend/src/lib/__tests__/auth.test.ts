import { beforeEach, describe, expect, it } from "vitest";
import { api } from "../api";
import { getAuthState, login, logout } from "../auth";

// These tests run in mock mode (VITE_API_MODE is unset), so login checks demo accounts locally.

beforeEach(() => {
  logout();
  sessionStorage.clear();
});

describe("auth store (mode mock)", () => {
  it("connecte un compte de démonstration valide", async () => {
    const user = await login("admin", "Admin@2026");
    expect(user.role).toBe("Admin");
    const state = getAuthState();
    expect(state.user?.username).toBe("admin");
    expect(state.token).toBeTruthy();
    // Le token est injecté dans axios et reflété dans le sessionStorage.
    expect(api.defaults.headers.common.Authorization).toBe(`Bearer ${state.token}`);
    expect(sessionStorage.getItem("mgfl.auth")).toContain("admin");
  });

  it("accepte les autres comptes démo", async () => {
    const user = await login("agent.pab", "Pesage@2026");
    expect(user.role).toBe("AgentPontBascule");
    expect(user.fullName.length).toBeGreaterThan(0);
  });

  it("rejette des identifiants invalides sans ouvrir de session", async () => {
    await expect(login("admin", "mauvais-mot-de-passe")).rejects.toThrow(
      "Nom d'utilisateur ou mot de passe incorrect.",
    );
    expect(getAuthState().user).toBeNull();
    expect(sessionStorage.getItem("mgfl.auth")).toBeNull();
  });

  it("logout purge la session (mémoire, axios, sessionStorage)", async () => {
    await login("commission", "Prix@2026");
    logout();
    expect(getAuthState().user).toBeNull();
    expect(getAuthState().token).toBeNull();
    expect(api.defaults.headers.common.Authorization).toBeUndefined();
    expect(sessionStorage.getItem("mgfl.auth")).toBeNull();
  });
});
