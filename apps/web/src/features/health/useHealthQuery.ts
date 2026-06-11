import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

export type HealthPayload = {
  status: string;
  llm_configured?: boolean;
  db_ok?: boolean;
};

export function useHealthQuery(enabled: boolean) {
  return useQuery({
    queryKey: ["health"],
    enabled: enabled && isBackendEnabled(),
    queryFn: () => apiFetch<HealthPayload>("/api/health")
  });
}
