import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import LoginPage from "../LoginPage";
import { getAuthState, logout } from "../../../lib/auth";

// Mock mode: credentials are checked locally against the demo accounts.

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/login"]}>
      <LoginPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  logout();
  sessionStorage.clear();
});

afterEach(cleanup);

describe("LoginPage", () => {
  it("affiche le formulaire et les comptes de démonstration", () => {
    renderPage();
    expect(screen.getByText("Connexion")).toBeInTheDocument();
    expect(screen.getByLabelText("Nom d'utilisateur")).toBeInTheDocument();
    expect(screen.getByLabelText("Mot de passe")).toBeInTheDocument();
    expect(screen.getByText("Comptes de démonstration")).toBeInTheDocument();
    expect(screen.getByText(/admin \/ Admin@2026/)).toBeInTheDocument();
  });

  it("affiche une erreur pour des identifiants invalides (mode mock)", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Nom d'utilisateur"), "admin");
    await user.type(screen.getByLabelText("Mot de passe"), "mauvais");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Nom d'utilisateur ou mot de passe incorrect.",
    );
    expect(getAuthState().user).toBeNull();
  });

  it("connecte un compte démo valide", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Nom d'utilisateur"), "agent.pab");
    await user.type(screen.getByLabelText("Mot de passe"), "Pesage@2026");
    await user.click(screen.getByRole("button", { name: /se connecter/i }));
    // RHF submission (resolver + login) is asynchronous.
    await waitFor(() => expect(getAuthState().user?.role).toBe("AgentPontBascule"));
  });
});
