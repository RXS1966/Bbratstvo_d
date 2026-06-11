import {
  Alert,
  AlertDescription,
  Badge,
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
import { Link } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";
import { useCases } from "@/features/cases/useCases";
import { formatApiErrorMessage } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

function caseStatusLabel(status: string): string {
  if (status === "draft") {
    return "черновик";
  }
  if (status === "submitted") {
    return "отправлен";
  }
  return status;
}

function caseBadgeVariant(
  status: string
): "secondary" | "success" | "warning" {
  if (status === "submitted") {
    return "success";
  }
  return "secondary";
}

export function CasePage() {
  const { token } = useAuth();
  const {
    completedSessions,
    cases,
    isLoading,
    error: queryError,
    createMutation,
    submitMutation
  } = useCases(token);

  const [actionError, setActionError] = React.useState<string | null>(null);

  const [sessionId, setSessionId] = React.useState("");
  const [title, setTitle] = React.useState("");
  const [brief, setBrief] = React.useState("");
  const [materials, setMaterials] = React.useState("");
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (completedSessions.length > 0 && !sessionId) {
      setSessionId(completedSessions[0].id);
    }
  }, [completedSessions, sessionId]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !sessionId) {
      return;
    }
    setActionError(null);
    try {
      await createMutation.mutateAsync({
        diagnostic_session_id: sessionId,
        title,
        brief,
        materials
      });
      setTitle("");
      setBrief("");
      setMaterials("");
    } catch (err) {
      setActionError(
        formatApiErrorMessage(
          err,
          "Не удалось создать кейс. Нужен завершённый диагностический срез."
        )
      );
    }
  }

  async function onSubmit(caseId: string) {
    if (!token) {
      return;
    }
    const answer = answers[caseId]?.trim();
    if (!answer) {
      setActionError("Введите ответ перед отправкой.");
      return;
    }
    setActionError(null);
    try {
      await submitMutation.mutateAsync({ caseId, userAnswer: answer });
    } catch (err) {
      setActionError(
        formatApiErrorMessage(err, "Не удалось отправить ответ на кейс.")
      );
    }
  }

  if (!isBackendEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Кейс</CardTitle>
          <CardDescription>
            Включите <code>VITE_USE_BACKEND=1</code> и запустите FastAPI +
            PostgreSQL.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const busy = createMutation.isPending || submitMutation.isPending;

  const errorMessage = queryError
    ? formatApiErrorMessage(queryError, "Не удалось загрузить данные кейсов.")
    : actionError;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Новый кейс</CardTitle>
          <CardDescription>
            Кейс привязан к завершённому диагностическому срезу.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedSessions.length === 0 && !isLoading ? (
            <Alert variant="warning">
              <AlertDescription>
                Нет завершённых срезов. Сначала завершите срез в разделе
                «Диагностика».
              </AlertDescription>
            </Alert>
          ) : (
            <form className="space-y-4" onSubmit={onCreate}>
              <div className="space-y-2">
                <Label htmlFor="diagnostic_session">Диагностический срез</Label>
                <select
                  id="diagnostic_session"
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  required
                >
                  {completedSessions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.role_title} ({s.id.slice(0, 8)}…)
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="case_title">Название кейса</Label>
                <Input
                  id="case_title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Кейс: возражение по цене"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="case_brief">Условие</Label>
                <Textarea
                  id="case_brief"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Опишите ситуацию для кандидата…"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="case_materials">Материалы</Label>
                <Textarea
                  id="case_materials"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                  placeholder="Ссылки, факты, вводные…"
                />
              </div>
              <Button type="submit" disabled={busy || !sessionId}>
                Создать кейс
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {errorMessage ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Мои кейсы</CardTitle>
          <CardDescription>
            {isLoading ? "Загрузка…" : `Всего: ${cases.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isLoading && cases.length === 0 ? (
            <p className="text-sm text-slate-600">
              Кейсов пока нет — создайте первый выше.
            </p>
          ) : null}
          {cases.map((item) => (
            <div
              key={item.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.title}</span>
                <Badge variant={caseBadgeVariant(item.status)}>
                  {caseStatusLabel(item.status)}
                </Badge>
              </div>
              {item.diagnostic_role_title ? (
                <p className="mt-1 text-xs text-slate-500">
                  Срез: {item.diagnostic_role_title}
                </p>
              ) : null}
              <p className="mt-2 text-sm text-slate-600">{item.brief}</p>
              {item.materials ? (
                <p className="mt-1 text-xs text-slate-500">
                  Материалы: {item.materials}
                </p>
              ) : null}
              {item.status === "draft" ? (
                <div className="mt-3 space-y-2">
                  <Label htmlFor={`answer-${item.id}`}>Ваш ответ</Label>
                  <Textarea
                    id={`answer-${item.id}`}
                    value={answers[item.id] ?? item.user_answer ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [item.id]: e.target.value
                      }))
                    }
                    placeholder="Введите решение кейса…"
                  />
                  <Button
                    size="sm"
                    disabled={busy}
                    onClick={() => void onSubmit(item.id)}
                  >
                    {busy ? "Оцениваем ответ…" : "Отправить на оценку"}
                  </Button>
                </div>
              ) : null}
              {item.status === "submitted" ? (
                <div className="mt-3">
                  <Link
                    className="text-sm font-medium text-slate-900 underline"
                    to={`/app/result?session=${item.diagnostic_session_id}`}
                  >
                    Смотреть результат по срезу
                  </Link>
                </div>
              ) : null}
              {item.status === "submitted" && item.score !== null ? (
                <p className="mt-2 text-sm text-slate-700">
                  Балл:{" "}
                  <span className="font-semibold">{item.score}</span> / 100
                </p>
              ) : null}
              {item.feedback ? (
                <Alert variant="info" className="mt-3">
                  <AlertDescription>{item.feedback}</AlertDescription>
                </Alert>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
