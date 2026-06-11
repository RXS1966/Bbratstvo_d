import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui";
import * as React from "react";
import { Link } from "react-router-dom";

import { CandidatePathChecklist } from "@/components/onboarding/CandidatePathChecklist";
import { useAuth } from "@/features/auth/AuthContext";
import { navItemsForRole, roleLabel } from "@/features/auth/roles";
import { useHealthQuery } from "@/features/health/useHealthQuery";
import { isBackendEnabled } from "@/lib/backend";
import { getPublicOrigin } from "@/lib/publicUrl";

export function HomePage() {
  const { user, token } = useAuth();
  const publicOrigin = getPublicOrigin();
  const healthQuery = useHealthQuery(Boolean(token));
  const apiOk = healthQuery.data
    ? healthQuery.data.status === "ok" && healthQuery.data.db_ok !== false
    : healthQuery.isError
      ? false
      : null;
  const llmOk = healthQuery.data
    ? Boolean(healthQuery.data.llm_configured)
    : healthQuery.isError
      ? false
      : null;

  const links = user ? navItemsForRole(user.role).filter((i) => !i.end) : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>Панель</CardTitle>
            {user ? (
              <Badge variant="secondary">{roleLabel(user.role)}</Badge>
            ) : null}
            {apiOk === true ? (
              <Badge variant="success">API online</Badge>
            ) : null}
            {apiOk === false ? (
              <Badge variant="warning">API offline</Badge>
            ) : null}
            {llmOk === true ? (
              <Badge variant="success">LLM on</Badge>
            ) : null}
            {apiOk === true && llmOk === false ? (
              <Badge variant="warning">LLM off</Badge>
            ) : null}
          </div>
          <CardDescription>
            Вы вошли как{" "}
            <span className="font-medium text-slate-900">
              {user?.username ?? "—"}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {publicOrigin ? (
            <p className="text-sm text-slate-600">
              Публичный URL: <code>{publicOrigin}</code>
            </p>
          ) : null}
          {isBackendEnabled() && apiOk === false ? (
            <Alert variant="destructive">
              <AlertDescription>
                FastAPI недоступен. Запустите{" "}
                <code>uvicorn app.main:app --reload --port 8000</code> в{" "}
                <code>apps/api</code>.
              </AlertDescription>
            </Alert>
          ) : null}
          {user?.role === "manager" ? (
            <p className="text-sm text-slate-600">
              Вы видите обзор команды. Создание срезов и кейсов доступно
              кандидатам (логин <strong>demo</strong>).
            </p>
          ) : null}
        </CardContent>
      </Card>

      {user?.role === "candidate" || user?.role === "admin" ? (
        <CandidatePathChecklist compact />
      ) : null}

      {links.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Разделы MVP</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2">
              {links.map((item) => (
                <li key={item.to}>
                  <Link
                    className="block rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
                    to={item.to}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
