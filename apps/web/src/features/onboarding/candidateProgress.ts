import { listCases } from "@/features/cases/casesApi";
import { listDiagnosticSessions } from "@/features/diagnostic/diagnosticApi";
import { listExamSessions } from "@/features/exam/examApi";
import { isBackendEnabled } from "@/lib/backend";

export type CandidateProgress = {
  hasSession: boolean;
  hasCompletedDiagnostic: boolean;
  hasSubmittedCase: boolean;
  hasCompletedExam: boolean;
};

export type ChecklistStep = {
  id: string;
  title: string;
  hint: string;
  to: string;
  done: boolean;
  enabled: boolean;
};

export async function fetchCandidateProgress(
  token: string
): Promise<CandidateProgress> {
  const [sessions, cases, exams] = await Promise.all([
    listDiagnosticSessions(token),
    listCases(token),
    listExamSessions(token)
  ]);

  const hasSession = sessions.length > 0;
  const hasCompletedDiagnostic = sessions.some((s) => s.status === "completed");
  const hasSubmittedCase = cases.some((c) => c.status === "submitted");
  const hasCompletedExam = exams.some((e) => e.status === "completed");

  return {
    hasSession,
    hasCompletedDiagnostic,
    hasSubmittedCase,
    hasCompletedExam
  };
}

export function buildChecklistSteps(
  progress: CandidateProgress | null
): ChecklistStep[] {
  const p = progress ?? {
    hasSession: false,
    hasCompletedDiagnostic: false,
    hasSubmittedCase: false,
    hasCompletedExam: false
  };

  return [
    {
      id: "diagnostic-create",
      title: "Создать диагностический срез",
      hint: "Роль, контекст и KPI",
      to: "/app/diagnostic",
      done: p.hasSession,
      enabled: true
    },
    {
      id: "diagnostic-complete",
      title: "Запустить и завершить срез",
      hint: "Кнопки в списке «Мои срезы»",
      to: "/app/diagnostic",
      done: p.hasCompletedDiagnostic,
      enabled: p.hasSession
    },
    {
      id: "case-submit",
      title: "Кейс: создать и отправить на оценку",
      hint: "Нужен завершённый срез",
      to: "/app/case",
      done: p.hasSubmittedCase,
      enabled: p.hasCompletedDiagnostic
    },
    {
      id: "result-view",
      title: "Результат: сводка по срезу",
      hint: "Кейсы и экзамен",
      to: "/app/result",
      done: p.hasSubmittedCase || p.hasCompletedExam,
      enabled: p.hasCompletedDiagnostic
    },
    {
      id: "exam-complete",
      title: "Экзаменатор: пройти финальный экзамен",
      hint: "3 вопроса и LLM-оценка",
      to: "/app/exam",
      done: p.hasCompletedExam,
      enabled: p.hasCompletedDiagnostic
    }
  ];
}

export function currentStepId(steps: ChecklistStep[]): string | null {
  const active = steps.find((s) => s.enabled && !s.done);
  return active?.id ?? null;
}

export async function loadCandidateProgressSafe(
  token: string | null
): Promise<CandidateProgress | null> {
  if (!token || !isBackendEnabled()) {
    return null;
  }
  try {
    return await fetchCandidateProgress(token);
  } catch {
    return null;
  }
}
