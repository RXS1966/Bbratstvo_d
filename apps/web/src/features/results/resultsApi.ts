import { apiFetch } from "@/lib/api";

import type { DiagnosticSession } from "@/features/diagnostic/diagnosticApi";

export type ResultListItem = {
  session_id: string;
  role_title: string;
  status: string;
  result_summary: string | null;
  cases_total: number;
  cases_submitted: number;
  progress_label: string;
  exams_total: number;
  exams_completed: number;
  exam_progress_label: string;
  exam_best_score: number | null;
  updated_at: string;
};

export type ResultCaseItem = {
  id: string;
  title: string;
  status: string;
  user_answer: string | null;
  score: number | null;
  feedback: string | null;
  updated_at: string;
};

export type ResultExamQuestionItem = {
  sort_order: number;
  question_text: string;
  status: string;
  score: number | null;
  feedback: string | null;
};

export type ResultExamItem = {
  id: string;
  title: string;
  status: string;
  overall_score: number | null;
  overall_feedback: string | null;
  result_summary: string | null;
  questions_total: number;
  questions_answered: number;
  updated_at: string;
  questions: ResultExamQuestionItem[];
};

export type ResultDetail = {
  session: DiagnosticSession;
  cases: ResultCaseItem[];
  cases_total: number;
  cases_submitted: number;
  progress_label: string;
  exams: ResultExamItem[];
  exams_total: number;
  exams_completed: number;
  exam_progress_label: string;
};

export function listResults(token: string): Promise<ResultListItem[]> {
  return apiFetch<ResultListItem[]>("/api/results", { token });
}

export function getResult(
  token: string,
  sessionId: string
): Promise<ResultDetail> {
  return apiFetch<ResultDetail>(`/api/results/${sessionId}`, { token });
}
