import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeExamSession,
  createExamSession,
  listExamSessions,
  startExamSession,
  updateExamAnswer,
  type ExamSession
} from "@/features/exam/examApi";
import {
  listDiagnosticSessions,
  type DiagnosticSession
} from "@/features/diagnostic/diagnosticApi";
import { isBackendEnabled } from "@/lib/backend";

const completedSessionsKey = ["diagnostic", "sessions", "completed"] as const;
const examsKey = ["exam", "sessions"] as const;
const progressKey = ["candidate", "progress"] as const;

export function useExamSessions(token: string | null) {
  const queryClient = useQueryClient();
  const enabled = Boolean(token) && isBackendEnabled();

  const completedSessionsQuery = useQuery({
    queryKey: completedSessionsKey,
    enabled,
    queryFn: () => listDiagnosticSessions(token!, "completed")
  });

  const examsQuery = useQuery({
    queryKey: examsKey,
    enabled,
    queryFn: () => listExamSessions(token!)
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: completedSessionsKey });
    void queryClient.invalidateQueries({ queryKey: examsKey });
    void queryClient.invalidateQueries({ queryKey: progressKey });
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      diagnostic_session_id: string;
      time_limit_minutes: number;
    }) => createExamSession(token!, payload),
    onSuccess: invalidate
  });

  const startMutation = useMutation({
    mutationFn: (examId: string) => startExamSession(token!, examId),
    onSuccess: invalidate
  });

  const saveAnswerMutation = useMutation({
    mutationFn: (payload: {
      examId: string;
      questionId: string;
      userAnswer: string;
    }) =>
      updateExamAnswer(token!, payload.examId, payload.questionId, payload.userAnswer),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: examsKey });
    }
  });

  const completeMutation = useMutation({
    mutationFn: (examId: string) => completeExamSession(token!, examId),
    onSuccess: invalidate
  });

  return {
    completedSessions:
      (completedSessionsQuery.data ?? []) as DiagnosticSession[],
    exams: (examsQuery.data ?? []) as ExamSession[],
    isLoading: completedSessionsQuery.isLoading || examsQuery.isLoading,
    error: completedSessionsQuery.error ?? examsQuery.error,
    createMutation,
    startMutation,
    saveAnswerMutation,
    completeMutation,
    invalidate
  };
}

