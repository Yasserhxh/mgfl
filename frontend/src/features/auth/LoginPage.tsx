import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { KeyRound, LogIn, User } from "lucide-react";
import { Logo } from "../../components/Logo";
import { Card, Button, Field, inputClass } from "../../components/ui";
import { errorStatus, problemMessage } from "../../lib/api";
import { DEMO_ACCOUNTS, ROLE_LABELS, login } from "../../lib/auth";
import { loginSchema, type LoginValues } from "./schema";

export default function LoginPage() {
  const navigate = useNavigate();
  /** Server-side failure (401 / network) — field errors are handled by Zod. */
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const submit = handleSubmit(async (values) => {
    setServerError(null);
    try {
      await login(values.username, values.password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (errorStatus(err) === 401) {
        setServerError(problemMessage(err) ?? "Nom d'utilisateur ou mot de passe incorrect.");
      } else if (err instanceof Error && !errorStatus(err)) {
        setServerError(err.message);
      } else {
        setServerError("Connexion impossible. Vérifier que le serveur est démarré puis réessayer.");
      }
    }
  });

  const prefill = (u: string, p: string) => {
    setValue("username", u, { shouldValidate: true });
    setValue("password", p, { shouldValidate: true });
    setServerError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <Logo className="h-12 w-12" />
          <div>
            <h1 className="text-xl font-bold tracking-tight text-ink">MGFL</h1>
            <p className="text-sm text-muted">Marché de Gros de Fruits et Légumes · Casablanca</p>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-sm font-bold text-ink">Connexion</h2>
          <p className="mb-4 mt-0.5 text-xs text-muted">
            Se connecter pour accéder au système de gestion du marché.
          </p>

          <form className="space-y-4" onSubmit={submit} noValidate>
            <Field label="Nom d'utilisateur" error={errors.username?.message}>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  className={`${inputClass} pl-9`}
                  autoComplete="username"
                  placeholder="ex. agent.pab"
                  {...register("username")}
                />
              </div>
            </Field>
            <Field label="Mot de passe" error={errors.password?.message}>
              <div className="relative">
                <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="password"
                  className={`${inputClass} pl-9`}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register("password")}
                />
              </div>
            </Field>

            {serverError && (
              <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              <LogIn className="h-4 w-4" />
              {isSubmitting ? "Connexion…" : "Se connecter"}
            </Button>
          </form>
        </Card>

        <Card className="p-5">
          <p className="text-xs font-semibold text-ink">Comptes de démonstration</p>
          <p className="mb-3 mt-0.5 text-[11px] text-muted">
            Système de démo — cliquer sur un compte pour pré-remplir le formulaire.
          </p>
          <div className="space-y-1">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.username}
                type="button"
                onClick={() => prefill(a.username, a.password)}
                className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-primary-soft"
              >
                <span className="font-mono text-xs text-ink">
                  {a.username} / {a.password}
                </span>
                <span className="text-[11px] text-muted">{ROLE_LABELS[a.role]}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
