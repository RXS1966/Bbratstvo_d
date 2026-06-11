import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  completeDiagnosticSession,
  createDiagnosticSession,
  listDiagnosticSessions,
  startDiagnosticSession,
  type DiagnosticSession
} from "@/features/diagnostic/diagnosticApi";
import { fetchCandidateProgress } from "@/features/onboarding/candidateProgress";
import { isBackendEnabled } from "@/lib/backend";

const sessionsKey = ["diagnostic", "sessions"] as const;
const progressKey = ["candidate", "progress"] as const;

export function useDiagnosticSessions(token: string | null) {
  const queryClient = useQueryClient();
  const enabled = Boolean(token) && isBackendEnabled();

  const sessionsQuery = useQuery({
    queryKey: sessionsKey,
    enabled,
    queryFn: () => listDiagnosticSessions(token!)
  });

  const progressQuery = useQuery({
    queryKey: progressKey,
    enabled,
    queryFn: () => fetchCandidateProgress(token!)
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: sessionsKey });
    void queryClient.invalidateQueries({ queryKey: progressKey });
  };

  const createMutation = useMutation({
    mutationFn: (payload: {
      role_title: string;
      context: string;
      kpi_notes: string;
    }) => createDiagnosticSession(token!, payload),
    onSuccess: invalidate
  });

  const startMutation = useMutation({
    mutationFn: (sessionId: string) =>
      startDiagnosticSession(token!, sessionId),
    onSuccess: invalidate
  });

  const completeMutation = useMutation({
    mutationFn: (sessionId: string) =>
      completeDiagnosticSession(token!, sessionId),
    onSuccess: invalidate
  });

  return {
    sessions: (sessionsQuery.data ?? []) as DiagnosticSession[],
    progress: progressQuery.data ?? null,
    isLoading: sessionsQuery.isLoading || progressQuery.isLoading,
    error: sessionsQuery.error ?? progressQuery.error,
    createMutation,
    startMutation,
    completeMutation,
    invalidate
  };
}
