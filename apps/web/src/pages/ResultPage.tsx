import {
  Alert,
  AlertDescription,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui";
import * as React from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";
import {
  getResult,
  listResults,
  type ResultDetail,
  type ResultListItem
} from "@/features/results/resultsApi";
import { formatApiErrorMessage } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

function caseBadgeVariant(
  status: string
): "secondary" | "success" | "warning" {
  if (status === "submitted") {
    return "success";
  }
  return "secondary";
}

function caseStatusLabel(status: string): string {
  if (status === "draft") {
    return "черновик";
  }
  if (status === "submitted") {
    return "отправлен";
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

export function ResultPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const sessionFromUrl = searchParams.get("session") ?? "";

  const [items, setItems] = React.useState<ResultListItem[]>([]);
  const [detail, setDetail] = React.useState<ResultDetail | null>(null);
  const [selectedId, setSelectedId] = React.useState(sessionFromUrl);
  const [loadingList, setLoadingList] = React.useState(true);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const reloadList = React.useCallback(async () => {
    if (!token || !isBackendEnabled()) {
      setLoadingList(false);
      return;
    }
    setLoadingList(true);
    setError(null);
    try {
      const data = await listResults(token);
      setItems(data);
    } catch (err) {
      setError(
        formatApiErrorMessage(err, "Не удалось загрузить список результатов.")
      );
    } finally {
      setLoadingList(false);
    }
  }, [token]);

  React.useEffect(() => {
    void reloadList();
  }, [reloadList]);

  React.useEffect(() => {
    if (sessionFromUrl) {
      setSelectedId(sessionFromUrl);
    }
  }, [sessionFromUrl]);

  React.useEffect(() => {
    if (!token || !selectedId || !isBackendEnabled()) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setError(null);
    getResult(token, selectedId)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            formatApiErrorMessage(
              err,
              "Не удалось загрузить результат по срезу."
            )
          );
          setDetail(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token, selectedId]);

  function selectSession(sessionId: string) {
    setSelectedId(sessionId);
    setSearchParams({ session: sessionId });
  }

  if (!isBackendEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Результат</CardTitle>
          <CardDescription>
            Включите <code>VITE_USE_BACKEND=1</code> и запустите FastAPI.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Итоги по срезам</CardTitle>
          <CardDescription>
            {loadingList
              ? "Загрузка…"
              : "Завершённые срезы: прогресс по кейсам и экзаменам."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loadingList && items.length === 0 ? (
            <Alert variant="warning">
              <AlertDescription>
                Нет завершённых срезов. Сначала завершите срез в разделе{" "}
                <Link
                  className="font-medium underline"
                  to="/app/diagnostic"
                >
                  Диагностика
                </Link>
                .
              </AlertDescription>
            </Alert>
          ) : null}
          {items.map((item) => (
            <div
              key={item.session_id}
              className={`rounded-lg border p-4 ${
                selectedId === item.session_id
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.role_title}</span>
                <Badge variant="success">завершён</Badge>
                <Badge variant="secondary">{item.progress_label}</Badge>
                <Badge variant="secondary">{item.exam_progress_label}</Badge>
              </div>
              {item.result_summary ? (
                <p className="mt-2 text-sm text-slate-600">
                  {item.result_summary}
                </p>
              ) : null}
              <Button
                className="mt-3"
                size="sm"
                variant={
                  selectedId === item.session_id ? "default" : "outline"
                }
                onClick={() => selectSession(item.session_id)}
              >
                {selectedId === item.session_id
                  ? "Открыто"
                  : "Смотреть детали"}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {selectedId ? (
        <Card>
          <CardHeader>
            <CardTitle>Детали результата</CardTitle>
            <CardDescription>
              {loadingDetail
                ? "Загрузка…"
                : [
                    detail?.progress_label,
                    detail?.exam_progress_label
                  ]
                    .filter(Boolean)
                    .join(" · ") || "Срез, кейсы и экзамены"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loadingDetail && detail ? (
              <>
                <div className="rounded-lg border border-slate-200 p-4">
                  <div className="font-medium">
                    {detail.session.role_title}
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    {detail.session.context}
                  </p>
                  {detail.session.kpi_notes ? (
                    <p className="mt-1 text-xs text-slate-500">
                      KPI: {detail.session.kpi_notes}
                    </p>
                  ) : null}
                  {detail.session.result_summary ? (
                    <Alert variant="info" className="mt-3">
                      <AlertDescription>
                        {detail.session.result_summary}
                      </AlertDescription>
                    </Alert>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Кейсы
                  </h3>
                  {detail.cases.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Кейсов по этому срезу пока нет.{" "}
                      <Link
                        className="font-medium underline"
                        to="/app/case"
                      >
                        Создать кейс
                      </Link>
                    </p>
                  ) : null}
                  {detail.cases.map((caseItem) => (
                    <div
                      key={caseItem.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{caseItem.title}</span>
                        <Badge variant={caseBadgeVariant(caseItem.status)}>
                          {caseStatusLabel(caseItem.status)}
                        </Badge>
                        {caseItem.score !== null ? (
                          <Badge variant="secondary">
                            балл: {caseItem.score}
                          </Badge>
                        ) : null}
                      </div>
                      {caseItem.user_answer ? (
                        <p className="mt-2 text-sm text-slate-700">
                          <span className="font-medium">Ответ: </span>
                          {caseItem.user_answer}
                        </p>
                      ) : null}
                      {caseItem.feedback ? (
                        <Alert variant="info" className="mt-3">
                          <AlertDescription>
                            {caseItem.feedback}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Экзаменатор
                  </h3>
                  {detail.exams.length === 0 ? (
                    <p className="text-sm text-slate-600">
                      Экзамен по срезу ещё не создан.{" "}
                      <Link
                        className="font-medium underline"
                        to="/app/exam"
                      >
                        Перейти к экзамену
                      </Link>
                    </p>
                  ) : null}
                  {detail.exams.map((exam) => (
                    <div
                      key={exam.id}
                      className="rounded-lg border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{exam.title}</span>
                        <Badge variant={examBadgeVariant(exam.status)}>
                          {examStatusLabel(exam.status)}
                        </Badge>
                        {exam.overall_score !== null ? (
                          <Badge variant="secondary">
                            итог: {exam.overall_score} / 100
                          </Badge>
                        ) : null}
                      </div>
                      {exam.result_summary ? (
                        <Alert variant="info" className="mt-3">
                          <AlertDescription>
                            {exam.result_summary}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      {exam.overall_feedback ? (
                        <Alert variant="info" className="mt-3">
                          <AlertDescription className="whitespace-pre-line">
                            {exam.overall_feedback}
                          </AlertDescription>
                        </Alert>
                      ) : null}
                      {exam.questions.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {exam.questions.map((q) => (
                            <div
                              key={q.sort_order}
                              className="rounded-md bg-slate-50 p-2 text-xs text-slate-600"
                            >
                              <span className="font-medium">
                                Вопрос {q.sort_order}
                                {q.score !== null ? ` (${q.score})` : ""}:
                              </span>{" "}
                              {q.feedback ?? q.question_text}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {exam.status !== "completed" ? (
                        <Link
                          className="mt-3 inline-block text-sm font-medium underline"
                          to="/app/exam"
                        >
                          Продолжить экзамен
                        </Link>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            ) : null}
            {!loadingDetail && !detail && selectedId ? (
              <p className="text-sm text-slate-600">
                Выберите срез из списка выше или завершите диагностику.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
