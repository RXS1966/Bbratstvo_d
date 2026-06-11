import { apiFetch } from "@/lib/api";

export type CaseItem = {
  id: string;
  diagnostic_session_id: string;
  diagnostic_role_title: string | null;
  title: string;
  brief: string;
  materials: string;
  user_answer: string | null;
  status: string;
  score: number | null;
  feedback: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateCasePayload = {
  diagnostic_session_id: string;
  title: string;
  brief: string;
  materials: string;
};

export function listCases(token: string): Promise<CaseItem[]> {
  return apiFetch<CaseItem[]>("/api/cases", { token });
}

export function createCase(
  token: string,
  payload: CreateCasePayload
): Promise<CaseItem> {
  return apiFetch<CaseItem>("/api/cases", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function submitCase(
  token: string,
  caseId: string,
  userAnswer: string
): Promise<CaseItem> {
  return apiFetch<CaseItem>(`/api/cases/${caseId}/submit`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_answer: userAnswer })
  });
}
