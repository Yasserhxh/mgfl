import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Scale,
  Truck,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Database,
  LogOut,
} from "lucide-react";
import type { ReactNode } from "react";
import { Logo } from "../components/Logo";
import { ROLE_LABELS, logout, useAuth, type AuthUser } from "../lib/auth";
import Dashboard from "../features/dashboard/Dashboard";
import EtatDeBasePage from "../features/etat-de-base/EtatDeBasePage";
import ArrivagePage from "../features/arrivage/ArrivagePage";
import PreDeclarationPage from "../features/pre-declaration/PreDeclarationPage";
import PrixReferencePage from "../features/prix-reference/PrixReferencePage";
import EmplacementsPage from "../features/emplacements/EmplacementsPage";
import InfractionsPage from "../features/infractions/InfractionsPage";
import ReferentielsPage from "../features/referentiels/ReferentielsPage";
import LoginPage from "../features/auth/LoginPage";

const nav = [
  { to: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { to: "/pre-declarations", label: "Pré-déclarations", icon: Truck },
  { to: "/arrivage", label: "Arrivage & pesage", icon: Scale },
  { to: "/etat-de-base", label: "État de base", icon: FileText },
  { to: "/emplacements", label: "Emplacements", icon: MapPin },
  { to: "/prix-reference", label: "Prix de référence", icon: TrendingUp },
  { to: "/infractions", label: "Infractions", icon: AlertTriangle },
  { to: "/referentiels", label: "Référentiels", icon: Database },
];

function Shell({ user, children }: { user: AuthUser; children: ReactNode }) {
  const roleLabel = ROLE_LABELS[user.role];
  const initial = (user.fullName.charAt(0) || "?").toUpperCase();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <Logo className="h-9 w-9" />
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight text-ink">MGFL</p>
            <p className="text-[11px] text-muted">Marché de Gros · Casablanca</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 px-3 py-2">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? "bg-primary font-medium text-white"
                    : "text-muted hover:bg-primary-soft hover:text-ink"
                }`
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              <span className="flex-1">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 border-t border-line px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] text-muted">Connecté en tant que</p>
            <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
            <p className="truncate text-[11px] text-muted">{roleLabel}</p>
          </div>
          <button
            onClick={logout}
            title="Se déconnecter"
            aria-label="Se déconnecter"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-6">
          <p className="text-sm font-medium text-muted">Système de gestion du marché de gros</p>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-ink">
              {initial}
            </div>
            <div className="hidden leading-tight sm:block">
              <p className="text-sm font-semibold text-ink">{user.fullName}</p>
              <p className="text-[11px] text-muted">{roleLabel}</p>
            </div>
            <button
              onClick={logout}
              title="Se déconnecter"
              aria-label="Se déconnecter"
              className="ml-1 flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-6">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  // Non authentifié : seule la page de connexion est accessible (sans le shell).
  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Shell user={user}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/pre-declarations" element={<PreDeclarationPage />} />
        <Route path="/arrivage" element={<ArrivagePage />} />
        <Route path="/etat-de-base" element={<EtatDeBasePage />} />
        <Route path="/emplacements" element={<EmplacementsPage />} />
        <Route path="/prix-reference" element={<PrixReferencePage />} />
        <Route path="/infractions" element={<InfractionsPage />} />
        <Route path="/referentiels" element={<ReferentielsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}
