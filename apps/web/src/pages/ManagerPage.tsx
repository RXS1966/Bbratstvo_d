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
import { useSearchParams } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";
import {
  downloadManagerExportCsv,
  fetchManagerCandidateDetail,
  fetchManagerCandidates,
  fetchManagerOverview,
  type ManagerCandidateDetail,
  type ManagerCandidateSummary,
  type ManagerExamItem,
  type ManagerTeamSession
} from "@/features/manager/managerApi";
import { formatApiErrorMessage } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

function sessionStatusLabel(status: string): string {
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

function sessionBadgeVariant(
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

export function ManagerPage() {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedFromUrl = searchParams.get("candidate") ?? "";

  const [candidates, setCandidates] = React.useState<ManagerCandidateSummary[]>(
    []
  );
  const [sessions, setSessions] = React.useState<ManagerTeamSession[]>([]);
  const [exams, setExams] = React.useState<ManagerExamItem[]>([]);
  const [detail, setDetail] = React.useState<ManagerCandidateDetail | null>(
    null
  );
  const [selected, setSelected] = React.useState(selectedFromUrl);
  const [candidatesCount, setCandidatesCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [loadingDetail, setLoadingDetail] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  React.useEffect(() => {
    if (selectedFromUrl) {
      setSelected(selectedFromUrl);
    }
  }, [selectedFromUrl]);

  React.useEffect(() => {
    if (!token || !isBackendEnabled()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([fetchManagerOverview(token), fetchManagerCandidates(token)])
      .then(([overview, candidateList]) => {
        setSessions(overview.sessions);
        setExams(overview.exams ?? []);
        setCandidatesCount(overview.candidates_count);
        setCandidates(candidateList);
      })
      .catch((err) => {
        setError(
          formatApiErrorMessage(err, "Не удалось загрузить обзор команды.")
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  React.useEffect(() => {
    if (!token || !selected || !isBackendEnabled()) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoadingDetail(true);
    setError(null);
    fetchManagerCandidateDetail(token, selected)
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
              "Не удалось загрузить карточку кандидата."
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
  }, [token, selected]);

  async function onExportCsv() {
    if (!token) {
      return;
    }
    setExporting(true);
    setError(null);
    try {
      await downloadManagerExportCsv(token);
    } catch (err) {
      setError(
        formatApiErrorMessage(err, "Не удалось скачать CSV.")
      );
    } finally {
      setExporting(false);
    }
  }

  function selectCandidate(username: string) {
    if (!username) {
      setSelected("");
      setSearchParams({});
      return;
    }
    setSelected(username);
    setSearchParams({ candidate: username });
  }

  const filteredSessions = selected
    ? sessions.filter((s) => s.owner_username === selected)
    : sessions;
  const filteredExams = selected
    ? exams.filter((e) => e.owner_username === selected)
    : exams;

  if (!isBackendEnabled()) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Кабинет руководителя</CardTitle>
          <CardDescription>
            Включите <code>VITE_USE_BACKEND=1</code> и запустите FastAPI.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Кабинет руководителя</CardTitle>
          <CardDescription>
            Обзор команды: выберите кандидата для детализации по срезам,
            кейсам и экзаменам.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={exporting || loading}
            onClick={() => void onExportCsv()}
          >
            {exporting ? "Экспорт…" : "Скачать CSV"}
          </Button>
          {loading ? (
            <p className="text-sm text-slate-600">Загрузка…</p>
          ) : (
            <p className="text-sm text-slate-600">
              Кандидатов:{" "}
              <span className="font-medium text-slate-900">
                {candidatesCount}
              </span>
              . Срезов:{" "}
              <span className="font-medium text-slate-900">
                {sessions.length}
              </span>
              , экзаменов:{" "}
              <span className="font-medium text-slate-900">{exams.length}</span>
              .
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label
                className="text-xs font-medium text-slate-600"
                htmlFor="manager-candidate-filter"
              >
                Кандидат
              </label>
              <select
                id="manager-candidate-filter"
                className="flex h-10 min-w-[12rem] rounded-md border border-slate-200 bg-white px-3 text-sm"
                value={selected}
                onChange={(e) => selectCandidate(e.target.value)}
              >
                <option value="">Все кандидаты</option>
                {candidates.map((c) => (
                  <option key={c.username} value={c.username}>
                    {c.username} ({c.sessions_total} срез.
                    {c.cases_submitted} кейс.)
                  </option>
                ))}
              </select>
            </div>
            {selected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => selectCandidate("")}
              >
                Сбросить фильтр
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {selected ? (
        <Card>
          <CardHeader>
            <CardTitle>Кандидат: {selected}</CardTitle>
            <CardDescription>
              {loadingDetail
                ? "Загрузка деталей…"
                : `Срезов: ${detail?.sessions.length ?? 0}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!loadingDetail && detail?.sessions.length === 0 ? (
              <p className="text-sm text-slate-600">Нет срезов у кандидата.</p>
            ) : null}
            {detail?.sessions.map((session) => (
              <div
                key={session.session_id}
                className="rounded-lg border border-slate-200 p-4"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{session.role_title}</span>
                  <Badge variant={sessionBadgeVariant(session.status)}>
                    {sessionStatusLabel(session.status)}
                  </Badge>
                  <Badge variant="secondary">{session.progress_label}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-600">{session.context}</p>
                {session.result_summary ? (
                  <Alert variant="info" className="mt-3">
                    <AlertDescription>
                      {session.result_summary}
                    </AlertDescription>
                  </Alert>
                ) : null}

                {session.cases.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Кейсы
                    </p>
                    {session.cases.map((caseItem) => (
                      <div
                        key={caseItem.id}
                        className="rounded-md bg-slate-50 p-2 text-sm"
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className="font-medium">
                            {caseItem.title}
                          </span>
                          <Badge variant="secondary">
                            {caseItem.status}
                          </Badge>
                          {caseItem.score !== null ? (
                            <Badge variant="success">
                              {caseItem.score} / 100
                            </Badge>
                          ) : null}
                        </div>
                        {caseItem.feedback ? (
                          <p className="mt-1 text-xs text-slate-600">
                            {caseItem.feedback}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {session.exams.length > 0 ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold text-slate-700">
                      Экзамены по срезу
                    </p>
                    {session.exams.map((exam) => (
                      <div
                        key={exam.exam_session_id}
                        className="rounded-md bg-slate-50 p-2 text-sm"
                      >
                        <div className="flex flex-wrap gap-2">
                          <span className="font-medium">{exam.title}</span>
                          <Badge variant={sessionBadgeVariant(exam.status)}>
                            {sessionStatusLabel(exam.status)}
                          </Badge>
                          {exam.overall_score !== null ? (
                            <Badge variant="success">
                              {exam.overall_score} / 100
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Вопросов: {exam.questions_answered} из{" "}
                          {exam.questions_total}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>
            {selected ? `Срезы: ${selected}` : "Срезы команды"}
          </CardTitle>
          <CardDescription>
            {loading ? "Загрузка…" : `Записей: ${filteredSessions.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && filteredSessions.length === 0 ? (
            <p className="text-sm text-slate-600">Нет срезов для отображения.</p>
          ) : null}
          {filteredSessions.map((item) => (
            <div
              key={item.session_id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.role_title}</span>
                {!selected ? (
                  <Badge variant="secondary">{item.owner_username}</Badge>
                ) : null}
                <Badge variant={sessionBadgeVariant(item.status)}>
                  {sessionStatusLabel(item.status)}
                </Badge>
                <Badge variant="secondary">{item.progress_label}</Badge>
              </div>
              {!selected ? (
                <Button
                  className="mt-3"
                  size="sm"
                  variant="outline"
                  onClick={() => selectCandidate(item.owner_username)}
                >
                  Открыть кандидата
                </Button>
              ) : null}
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {selected ? `Экзамены: ${selected}` : "Экзамены команды"}
          </CardTitle>
          <CardDescription>
            {loading ? "Загрузка…" : `Записей: ${filteredExams.length}`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!loading && filteredExams.length === 0 ? (
            <p className="text-sm text-slate-600">Нет экзаменов.</p>
          ) : null}
          {filteredExams.map((item) => (
            <div
              key={item.exam_session_id}
              className="rounded-lg border border-slate-200 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{item.title}</span>
                {!selected ? (
                  <Badge variant="secondary">{item.owner_username}</Badge>
                ) : null}
                <Badge variant={sessionBadgeVariant(item.status)}>
                  {sessionStatusLabel(item.status)}
                </Badge>
                {item.overall_score !== null ? (
                  <Badge variant="success">
                    {item.overall_score} / 100
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Вопросов: {item.questions_answered} из {item.questions_total}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
