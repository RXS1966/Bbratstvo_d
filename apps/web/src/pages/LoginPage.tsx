import {
  Alert,
  AlertDescription,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label
} from "@repo/ui";
import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";
import { defaultPathForRole } from "@/features/auth/roles";
import { formatApiErrorMessage } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";
import { getPublicOrigin } from "@/lib/publicUrl";

export function LoginPage() {
  const { state, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const publicOrigin = getPublicOrigin();
  const backendOn = isBackendEnabled();

  React.useEffect(() => {
    if (state.status === "authenticated") {
      navigate("/app", { replace: true });
    }
  }, [state.status, navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const user = await login(username.trim(), password);
      const next = params.get("next");
      navigate(
        next ? decodeURIComponent(next) : defaultPathForRole(user.role),
        { replace: true }
      );
    } catch (err) {
      setError(
        formatApiErrorMessage(
          err,
          "Не удалось войти. Проверьте логин и пароль."
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 text-slate-900">
      <Card className="mx-auto w-full max-w-sm">
        <CardHeader>
          <CardTitle>Вход</CardTitle>
          <CardDescription>
            Публичное приложение на одном домене с API. Без SSO и LDAP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {publicOrigin ? (
            <p className="mb-4 text-xs text-slate-500">
              Публичный URL: <code>{publicOrigin}</code>
            </p>
          ) : null}

          <Alert variant="info" className="mb-4">
            <AlertDescription>
              {backendOn ? (
                <>
                  FastAPI: <strong>demo</strong> / <strong>demo</strong>{" "}
                  (кандидат), <strong>manager</strong> / <strong>manager</strong>
                  , <strong>admin</strong> / <strong>admin</strong>.
                </>
              ) : (
                <>
                  Демо без API — любой логин/пароль. Для FastAPI:{" "}
                  <code>VITE_USE_BACKEND=1</code> в <code>apps/web/.env</code>.
                </>
              )}
            </AlertDescription>
          </Alert>

          <form className="space-y-4" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin"
                required
              />
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Входим…" : "Войти"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
