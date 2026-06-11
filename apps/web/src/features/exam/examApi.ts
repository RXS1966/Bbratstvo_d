import { apiFetch } from "@/lib/api";

export type ExamQuestion = {
  id: string;
  sort_order: number;
  question_text: string;
  user_answer: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
};

export type ExamSession = {
  id: string;
  diagnostic_session_id: string;
  diagnostic_role_title: string | null;
  title: string;
  status: "draft" | "running" | "completed" | string;
  time_limit_minutes: number;
  started_at: string | null;
  completed_at: string | null;
  overall_score: number | null;
  overall_feedback: string | null;
  result_summary: string | null;
  questions: ExamQuestion[];
  created_at: string;
  updated_at: string;
};

export type CreateExamPayload = {
  diagnostic_session_id: string;
  time_limit_minutes?: number;
};

export function listExamSessions(
  token: string,
  status?: string
): Promise<ExamSession[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<ExamSession[]>(`/api/exam/sessions${query}`, { token });
}

export function createExamSession(
  token: string,
  payload: CreateExamPayload
): Promise<ExamSession> {
  return apiFetch<ExamSession>("/api/exam/sessions", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function startExamSession(
  token: string,
  sessionId: string
): Promise<ExamSession> {
  return apiFetch<ExamSession>(`/api/exam/sessions/${sessionId}/start`, {
    method: "POST",
    token
  });
}

export function updateExamAnswer(
  token: string,
  sessionId: string,
  questionId: string,
  userAnswer: string
): Promise<ExamQuestion> {
  return apiFetch<ExamQuestion>(
    `/api/exam/sessions/${sessionId}/questions/${questionId}/answer`,
    {
      method: "PATCH",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_answer: userAnswer })
    }
  );
}

export function completeExamSession(
  token: string,
  sessionId: string
): Promise<ExamSession> {
  return apiFetch<ExamSession>(`/api/exam/sessions/${sessionId}/complete`, {
    method: "POST",
    token
  });
}
