import { expect, type APIRequestContext } from "@playwright/test";

const apiBase = process.env.E2E_API_BASE_URL ?? "http://127.0.0.1:8000";

type LoginResponse = { token: string; username: string };

export async function loginToken(
  request: APIRequestContext,
  username: string,
  password: string
): Promise<string> {
  const res = await request.post(`${apiBase}/api/auth/login`, {
    data: { username, password }
  });
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as LoginResponse;
  expect(body.token).toBeTruthy();
  return body.token;
}

export async function getCompletedDiagnosticSessionId(
  request: APIRequestContext,
  token: string,
  roleTitle: string
): Promise<string> {
  const res = await request.get(`${apiBase}/api/diagnostic/sessions?status=completed`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(res.ok()).toBeTruthy();
  const items = (await res.json()) as Array<{ id: string; role_title: string }>;
  const match = items.find((s) => s.role_title === roleTitle);
  expect(match?.id).toBeTruthy();
  return match!.id;
}

export async function createAndStartExam(
  request: APIRequestContext,
  token: string,
  diagnosticSessionId: string,
  timeLimitMinutes: number
): Promise<string> {
  const createRes = await request.post(`${apiBase}/api/exam/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      diagnostic_session_id: diagnosticSessionId,
      time_limit_minutes: timeLimitMinutes
    }
  });
  if (!createRes.ok()) {
    throw new Error(
      `create exam failed: ${createRes.status()} ${await createRes.text()}`
    );
  }
  const created = (await createRes.json()) as { id: string };
  expect(created.id).toBeTruthy();

  const startRes = await request.post(
    `${apiBase}/api/exam/sessions/${created.id}/start`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!startRes.ok()) {
    throw new Error(
      `start exam failed: ${startRes.status()} ${await startRes.text()}`
    );
  }

  return created.id;
}

export async function answerAllQuestionsAndCompleteExam(
  request: APIRequestContext,
  token: string,
  examId: string
): Promise<void> {
  const examRes = await request.get(`${apiBase}/api/exam/sessions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  expect(examRes.ok()).toBeTruthy();
  const exams = (await examRes.json()) as Array<{
    id: string;
    questions: Array<{ id: string; sort_order: number }>;
  }>;
  const exam = exams.find((e) => e.id === examId);
  expect(exam).toBeTruthy();
  expect(exam!.questions).toHaveLength(3);

  for (const q of exam!.questions) {
    const ans = `E2E ответ на вопрос ${q.sort_order}.`;
    const res = await request.patch(
      `${apiBase}/api/exam/sessions/${examId}/questions/${q.id}/answer`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { user_answer: ans }
      }
    );
    expect(res.ok()).toBeTruthy();
  }

  const completeRes = await request.post(
    `${apiBase}/api/exam/sessions/${examId}/complete`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  expect(completeRes.ok()).toBeTruthy();
}

