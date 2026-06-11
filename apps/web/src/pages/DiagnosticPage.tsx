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
  Label,
  Textarea
} from "@repo/ui";
import * as React from "react";

import { BackendRequiredAlert } from "@/components/common/BackendRequiredAlert";
import { WorkflowStatusBadge } from "@/components/common/WorkflowStatusBadge";
import { CandidatePathChecklist } from "@/components/onboarding/CandidatePathChecklist";
import { useDiagnosticSessions } from "@/features/diagnostic/useDiagnosticSessions";
import { useAuth } from "@/features/auth/AuthContext";
import { formatApiErrorMessage } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

export function DiagnosticPage() {
  const { token } = useAuth();
  const {
    sessions,
    progress,
    isLoading,
    error: queryError,
    createMutation,
    startMutation,
    completeMutation
  } = useDiagnosticSessions(token);

  const [actionError, setActionError] = React.useState<string | null>(null);
  const [roleTitle, setRoleTitle] = React.useState("");
  const [context, setContext] = React.useState("");
  const [kpiNotes, setKpiNotes] = React.useState("");

  const busy =
    createMutation.isPending ||
    startMutation.isPending ||
    completeMutation.isPending;

  const errorMessage = queryError
    ? formatApiErrorMessage(
        queryError,
        "Не удалось загрузить диагностические срезы."
      )
    : actionError;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      return;
    }
    setActionError(null);
    try {
      await createMutation.mutateAsync({
        role_title: roleTitle,
        context,
        kpi_notes: kpiNotes
      });
      setRoleTitle("");
      setContext("");
      setKpiNotes("");
    } catch (err) {
      setActionError(formatApiErrorMessage(err, "Не удалось создать срез."));
    }
  }

  async function onStart(id: string) {
    if (!token) {
      return;
    }
    setActionError(null);
    try {
      await startMutation.mutateAsync(id);
    } catch (err) {
      setActionError(formatApiErrorMessage(err, "Не удалось запустить срез."));
    }
  }

  async function onComplete(id: string) {
    if (!token) {
      return;
    }
    setActionError(null);
    try {
      await completeMutation.mutateAsync(id);
    } catch (err) {
      setActionError(formatApiErrorMessage(err, "Не удалось завершить срез."));
    }
  }

  if (!isBackendEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Диагностика</CardTitle>
        </CardHeader>
        <CardContent>
          <BackendRequiredAlert />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <CandidatePathChecklist progress={progress} />

      <Card>
        <CardHeader>
          <CardTitle>Новый диагностический срез</CardTitle>
          <CardDescription>
            Роль, контекст и KPI — первый шаг контура MVP.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onCreate}>
            <div className="space-y-2">
              <Label htmlFor="role_title">Роль / должность</Label>
              <Input
                id="role_title"
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Менеджер по продажам"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="context">Контекст среза</Label>
              <Textarea
                id="context"
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Цели, команда, период оценки…"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kpi_notes">KPI (заметки)</Label>
              <Textarea
                id="kpi_notes"
                value={kpiNotes}
                onChange={(e) => setKpiNotes(e.target.value)}
                placeholder="Ключевые показатели для среза…"
              />
            </div>
            <Button type="submit" disabled={busy}>
              Создать срез
            </Button>
          </form>
        </CardContent>
      </Card>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Мои срезы</CardTitle>
          <CardDescription>
            {isLoading ? "Загрузка…" : `Всего: ${sessions.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isLoading && sessions.length === 0 ? (
            <p className="text-sm text-slate-600">
              Срезов пока нет — создайте первый выше.
            </p>
          ) : null}
          {sessions.map((session) => (
            <div
              key={session.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{session.role_title}</span>
                <WorkflowStatusBadge status={session.status} />
              </div>
              <p className="mt-2 text-sm text-slate-600">{session.context}</p>
              {session.kpi_notes ? (
                <p className="mt-1 text-xs text-slate-500">
                  KPI: {session.kpi_notes}
                </p>
              ) : null}
              {session.result_summary ? (
                <Alert variant="info" className="mt-3">
                  <AlertDescription>{session.result_summary}</AlertDescription>
                </Alert>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {session.status === "draft" ? (
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void onStart(session.id)}
                  >
                    Запустить срез
                  </Button>
                ) : null}
                {session.status === "running" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => void onComplete(session.id)}
                  >
                    Завершить срез
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
