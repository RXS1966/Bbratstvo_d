import { apiFetch } from "@/lib/api";

import { normalizeRole, roleFromUsername, type UserRole } from "./roles";

export type MeResponse = {
  username: string;
  role: string;
};

export async function fetchMe(token: string): Promise<{
  username: string;
  role: UserRole;
}> {
  const me = await apiFetch<MeResponse>("/api/auth/me", { token });
  return {
    username: me.username,
    role: normalizeRole(me.role)
  };
}

export function resolveRoleOffline(username: string): UserRole {
  return roleFromUsername(username);
}
