import { apiFetch } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

export type LoginResponse = {
  token: string;
  username: string;
};

function isDemoAuthEnabled(): boolean {
  const raw = import.meta.env.VITE_DEMO_AUTH;

  if (raw === "0" || raw === "false") {
    return false;
  }

  if (raw === "1" || raw === "true") {
    return true;
  }

  return import.meta.env.DEV;
}

function demoLogin(username: string): LoginResponse {
  const safeUsername = username?.trim() || "demo";
  return {
    token: `demo-token:${safeUsername}`,
    username: safeUsername
  };
}

export async function loginRequest(
  username: string,
  password: string
): Promise<LoginResponse> {
  if (!isBackendEnabled() && isDemoAuthEnabled()) {
    return demoLogin(username);
  }

  try {
    return await apiFetch<LoginResponse>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
  } catch (err) {
    if (!isDemoAuthEnabled()) {
      throw err;
    }

    return demoLogin(username);
  }
}
