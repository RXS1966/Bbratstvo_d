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
  Label,
  Textarea
} from "@repo/ui";
import * as React from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { useExamSessions } from "@/features/exam/useExamSessions";
import { formatApiErrorMessage } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

function examStatusLabel(status: string): string {
  if (status === "draft") {
    return "черновик";
  }
  if (status === "running") {
    return "в работе";
  }
  if (status === "completed") {
    return "завершён";
  }
  return status;
}

function examBadgeVariant(
  status: string
): "secondary" | "success" | "warning" {
  if (status === "running") {
    return "warning";
  }
  if (status === "completed") {
    return "success";
  }
  return "secondary";
}

function formatRemaining(
  startedAt: string,
  limitMinutes: number
): string | null {
  const start = new Date(startedAt).getTime();
  const end = start + limitMinutes * 60 * 1000;
  const left = end - Date.now();
  if (left <= 0) {
    return "время истекло";
  }
  const mins = Math.floor(left / 60000);
  const secs = Math.floor((left % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ExamPage() {
  const { token } = useAuth();
  const {
    completedSessions,
    exams,
    isLoading,
    error: queryError,
    createMutation,
    startMutation,
    saveAnswerMutation,
    completeMutation
  } = useExamSessions(token);

  const [actionError, setActionError] = React.useState<string | null>(null);
  const [tick, setTick] = React.useState(0);

  const [sessionId, setSessionId] = React.useState("");
  const [timeLimit, setTimeLimit] = React.useState(30);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (completedSessions.length > 0 && !sessionId) {
      setSessionId(completedSessions[0].id);
    }
  }, [completedSessions, sessionId]);

  const hasRunning = exams.some((e) => e.status === "running");

  React.useEffect(() => {
    if (!hasRunning) {
      return;
    }
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [hasRunning]);

  void tick;

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !sessionId) {
      return;
    }
    setActionError(null);
    try {
      await createMutation.mutateAsync({
        diagnostic_session_id: sessionId,
        time_limit_minutes: timeLimit
      });
    } catch (err) {
      setActionError(
        formatApiErrorMessage(
          err,
          "Не удалось создать экзамен. Нужен завершённый диагностический срез."
        )
      );
    }
  }

  async function onStart(examId: string) {
    if (!token) {
      return;
    }
    setActionError(null);
    try {
      await startMutation.mutateAsync(examId);
    } catch (err) {
      setActionError(formatApiErrorMessage(err, "Не удалось запустить экзамен."));
    }
  }

  async function onSaveAnswer(
    examId: string,
    questionId: string,
    answer: string
  ) {
    if (!token || !answer.trim()) {
      setActionError("Введите ответ.");
      return;
    }
    setActionError(null);
    try {
      await saveAnswerMutation.mutateAsync({
        examId,
        questionId,
        userAnswer: answer.trim()
      });
    } catch (err) {
      setActionError(formatApiErrorMessage(err, "Не удалось сохранить ответ."));
    }
  }

  async function onComplete(examId: string) {
    if (!token) {
      return;
    }
    setActionError(null);
    try {
      await completeMutation.mutateAsync(examId);
    } catch (err) {
      setActionError(
        formatApiErrorMessage(
          err,
          "Не удалось завершить экзамен. Ответьте на все вопросы."
        )
      );
    }
  }

  if (!isBackendEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Экзаменатор</CardTitle>
          <CardDescription>
            Включите <code>VITE_USE_BACKEND=1</code> и запустите FastAPI +
            PostgreSQL.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const busy =
    createMutation.isPending ||
    startMutation.isPending ||
    saveAnswerMutation.isPending ||
    completeMutation.isPending;

  const errorMessage = queryError
    ? formatApiErrorMessage(queryError, "Не удалось загрузить данные экзаменатора.")
    : actionError;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Новый экзамен</CardTitle>
          <CardDescription>
            Финальный сценарий по завершённому диагностическому срезу:
            3 вопроса, лимит времени.
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
                <Label htmlFor="exam_diagnostic">Диагностический срез</Label>
                <select
                  id="exam_diagnostic"
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
                <Label htmlFor="exam_time_limit">
                  Лимит времени (минут)
                </Label>
                <input
                  id="exam_time_limit"
                  type="number"
                  min={5}
                  max={180}
                  className="flex h-10 w-full max-w-[8rem] rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={timeLimit}
                  onChange={(e) =>
                    setTimeLimit(Number(e.target.value) || 30)
                  }
                />
              </div>
              <Button type="submit" disabled={busy || !sessionId}>
                Создать экзамен
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
          <CardTitle>Мои экзамены</CardTitle>
          <CardDescription>
            {isLoading ? "Загрузка…" : `Всего: ${exams.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!isLoading && exams.length === 0 ? (
            <p className="text-sm text-slate-600">
              Экзаменов пока нет — создайте первый выше.
            </p>
          ) : null}
          {exams.map((exam) => (
            <div
              key={exam.id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{exam.title}</span>
                <Badge variant={examBadgeVariant(exam.status)}>
                  {examStatusLabel(exam.status)}
                </Badge>
                {exam.status === "running" && exam.started_at ? (
                  <Badge variant="warning">
                    Осталось:{" "}
                    {formatRemaining(
                      exam.started_at,
                      exam.time_limit_minutes
                    ) ?? "—"}
                  </Badge>
                ) : null}
              </div>
              {exam.diagnostic_role_title ? (
                <p className="mt-1 text-xs text-slate-500">
                  Срез: {exam.diagnostic_role_title} · лимит{" "}
                  {exam.time_limit_minutes} мин
                </p>
              ) : null}

              {exam.status === "draft" ? (
                <Button
                  className="mt-3"
                  size="sm"
                  disabled={busy}
                  onClick={() => void onStart(exam.id)}
                >
                  Запустить экзамен
                </Button>
              ) : null}

              {exam.status === "running" && exam.questions.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {exam.questions.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-md border border-slate-100 bg-slate-50 p-3"
                    >
                      <p className="text-sm font-medium text-slate-800">
                        Вопрос {q.sort_order}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        {q.question_text}
                      </p>
                      <div className="mt-2 space-y-2">
                        <Label htmlFor={`exam-answer-${q.id}`}>
                          Ваш ответ
                        </Label>
                        <Textarea
                          id={`exam-answer-${q.id}`}
                          value={
                            answers[`${exam.id}:${q.id}`] ??
                            q.user_answer ??
                            ""
                          }
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [`${exam.id}:${q.id}`]: e.target.value
                            }))
                          }
                          placeholder="Развёрнутый ответ…"
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={busy}
                          onClick={() =>
                            void onSaveAnswer(
                              exam.id,
                              q.id,
                              answers[`${exam.id}:${q.id}`] ??
                                q.user_answer ??
                                ""
                            )
                          }
                        >
                          Сохранить ответ
                        </Button>
                        {q.status === "answered" ? (
                          <Badge variant="success" className="ml-2">
                            сохранён
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  <Button
                    disabled={busy}
                    onClick={() => void onComplete(exam.id)}
                  >
                    {busy
                      ? "Оцениваем ответы…"
                      : "Завершить экзамен (LLM)"}
                  </Button>
                </div>
              ) : null}

              {exam.status === "completed" ? (
                <div className="mt-3 space-y-2">
                  {exam.result_summary ? (
                    <Alert variant="info">
                      <AlertDescription>
                        {exam.result_summary}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {exam.overall_score !== null ? (
                    <p className="text-sm text-slate-700">
                      Итог:{" "}
                      <span className="font-semibold">
                        {exam.overall_score}
                      </span>{" "}
                      / 100
                    </p>
                  ) : null}
                  {exam.overall_feedback ? (
                    <Alert variant="info">
                      <AlertDescription className="whitespace-pre-line">
                        {exam.overall_feedback}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  {exam.questions.map((q) =>
                    q.feedback ? (
                      <div
                        key={q.id}
                        className="text-xs text-slate-600"
                      >
                        <span className="font-medium">
                          Вопрос {q.sort_order}
                          {q.score !== null ? ` (${q.score})` : ""}:
                        </span>{" "}
                        {q.feedback}
                      </div>
                    ) : null
                  )}
                </div>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
