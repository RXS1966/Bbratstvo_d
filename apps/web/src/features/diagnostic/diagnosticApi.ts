import { apiFetch } from "@/lib/api";

export type DiagnosticSession = {
  id: string;
  role_title: string;
  context: string;
  kpi_notes: string;
  status: "draft" | "running" | "completed" | string;
  created_at: string;
  updated_at: string;
  result_summary: string | null;
};

export type CreateDiagnosticPayload = {
  role_title: string;
  context: string;
  kpi_notes: string;
};

export function listDiagnosticSessions(
  token: string,
  status?: string
): Promise<DiagnosticSession[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return apiFetch<DiagnosticSession[]>(
    `/api/diagnostic/sessions${query}`,
    { token }
  );
}

export function createDiagnosticSession(
  token: string,
  payload: CreateDiagnosticPayload
): Promise<DiagnosticSession> {
  return apiFetch<DiagnosticSession>("/api/diagnostic/sessions", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
}

export function startDiagnosticSession(
  token: string,
  sessionId: string
): Promise<DiagnosticSession> {
  return apiFetch<DiagnosticSession>(
    `/api/diagnostic/sessions/${sessionId}/start`,
    { method: "POST", token }
  );
}

export function completeDiagnosticSession(
  token: string,
  sessionId: string
): Promise<DiagnosticSession> {
  return apiFetch<DiagnosticSession>(
    `/api/diagnostic/sessions/${sessionId}/complete`,
    { method: "POST", token }
  );
}
