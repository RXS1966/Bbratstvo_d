import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createCase,
  listCases,
  submitCase,
  type CaseItem
} from "@/features/cases/casesApi";
import {
  listDiagnosticSessions,
  type DiagnosticSession
} from "@/features/diagnostic/diagnosticApi";
import { isBackendEnabled } from "@/lib/backend";

const completedSessionsKey = ["diagnostic", "sessions", "completed"] as const;
const casesKey = ["cases", "list"] as const;
const progressKey = ["candidate", "progress"] as const;

export function useCases(token: string | null) {
  const queryClient = useQueryClient();
  const enabled = Boolean(token) && isBackendEnabled();

  const completedSessionsQuery = useQuery({
    queryKey: completedSessionsKey,
    enabled,
    queryFn: () => listDiagnosticSessions(token!, "completed")
  });

  const casesQuery = useQuery({
    queryKey: casesKey,
    enabled,
    queryFn: () => listCases(token!)
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: completedSessionsKey });
    void queryClient.invalidateQueries({ queryKey: casesKey });
    void queryClient.invalidateQueries({ queryKey: progressKey });
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      diagnostic_session_id: string;
      title: string;
      brief: string;
      materials: string;
    }) => createCase(token!, payload),
    onSuccess: invalidate
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { caseId: string; userAnswer: string }) =>
      submitCase(token!, payload.caseId, payload.userAnswer),
    onSuccess: invalidate
  });

  return {
    completedSessions:
      (completedSessionsQuery.data ?? []) as DiagnosticSession[],
    cases: (casesQuery.data ?? []) as CaseItem[],
    isLoading: completedSessionsQuery.isLoading || casesQuery.isLoading,
    error: completedSessionsQuery.error ?? casesQuery.error,
    createMutation,
    submitMutation,
    invalidate
  };
}

