import { apiFetch } from "@/lib/api";

export type ManagerTeamSession = {
  owner_username: string;
  session_id: string;
  role_title: string;
  status: string;
  cases_total: number;
  cases_submitted: number;
  progress_label: string;
  updated_at: string;
};

export type ManagerExamItem = {
  owner_username: string;
  exam_session_id: string;
  diagnostic_session_id: string;
  title: string;
  status: string;
  overall_score: number | null;
  questions_total: number;
  questions_answered: number;
  updated_at: string;
};

export type ManagerOverview = {
  sessions: ManagerTeamSession[];
  exams: ManagerExamItem[];
  candidates_count: number;
};

export type ManagerCandidateSummary = {
  username: string;
  sessions_total: number;
  sessions_completed: number;
  cases_submitted: number;
  exams_completed: number;
  last_activity_at: string | null;
};

export type ManagerCaseDetail = {
  id: string;
  title: string;
  status: string;
  score: number | null;
  feedback: string | null;
  updated_at: string;
};

export type ManagerSessionDetail = {
  session_id: string;
  role_title: string;
  context: string;
  status: string;
  result_summary: string | null;
  cases_total: number;
  cases_submitted: number;
  progress_label: string;
  updated_at: string;
  cases: ManagerCaseDetail[];
  exams: ManagerExamItem[];
};

export type ManagerCandidateDetail = {
  username: string;
  sessions: ManagerSessionDetail[];
};

export function fetchManagerOverview(token: string): Promise<ManagerOverview> {
  return apiFetch<ManagerOverview>("/api/manager/overview", { token });
}

export function fetchManagerCandidates(
  token: string
): Promise<ManagerCandidateSummary[]> {
  return apiFetch<ManagerCandidateSummary[]>("/api/manager/candidates", {
    token
  });
}

export function fetchManagerCandidateDetail(
  token: string,
  username: string
): Promise<ManagerCandidateDetail> {
  return apiFetch<ManagerCandidateDetail>(
    `/api/manager/candidates/${encodeURIComponent(username)}`,
    { token }
  );
}

export async function downloadManagerExportCsv(token: string): Promise<void> {
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${token}`);
  headers.set("Accept", "text/csv");

  const res = await fetch("/api/manager/export.csv", {
    headers,
    credentials: "include"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || "Не удалось скачать CSV");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "team-overview.csv";
  link.click();
  URL.revokeObjectURL(url);
}
