import * as React from "react";

import { AuthContext } from "@/features/auth/AuthContext";
import { loginRequest } from "@/features/auth/authApi";
import { fetchMe, resolveRoleOffline } from "@/features/auth/meApi";
import {
  clearStoredAuth,
  readStoredAuth,
  writeStoredAuth
} from "@/features/auth/authStorage";
import type { AuthState } from "@/features/auth/authTypes";
import type { UserRole } from "@/features/auth/roles";
import { isBackendEnabled } from "@/lib/backend";

async function loadUser(
  token: string,
  username: string
): Promise<{ username: string; role: UserRole }> {
  if (isBackendEnabled() && !token.startsWith("demo-token:")) {
    return fetchMe(token);
  }
  return { username, role: resolveRoleOffline(username) };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({ status: "loading" });
  const [token, setToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    const stored = readStoredAuth();
    if (!stored) {
      setState({ status: "anonymous" });
      setToken(null);
      return;
    }

    let cancelled = false;
    loadUser(stored.token, stored.username)
      .then((user) => {
        if (!cancelled) {
          setState({ status: "authenticated", user });
          setToken(stored.token);
        }
      })
      .catch(() => {
        if (!cancelled) {
          clearStoredAuth();
          setState({ status: "anonymous" });
          setToken(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = React.useCallback(async (username: string, password: string) => {
    const resp = await loginRequest(username, password);
    const user = await loadUser(resp.token, resp.username);
    writeStoredAuth({ username: user.username, token: resp.token });
    setState({ status: "authenticated", user });
    setToken(resp.token);
    return user;
  }, []);

  const logout = React.useCallback(() => {
    clearStoredAuth();
    setState({ status: "anonymous" });
    setToken(null);
  }, []);

  const value = React.useMemo(() => {
    return {
      state,
      login,
      logout,
      token,
      user: state.status === "authenticated" ? state.user : null
    };
  }, [state, login, logout, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
