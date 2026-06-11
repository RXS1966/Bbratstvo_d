import * as React from "react";

import type { AuthState, User } from "@/features/auth/authTypes";

export type AuthContextValue = {
  state: AuthState;
  login: (username: string, password: string) => Promise<User>;
  logout: () => void;
  token: string | null;
  user: User | null;
};

export const AuthContext = React.createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
