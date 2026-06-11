import type { UserRole } from "@/features/auth/roles";

export type User = {
  username: string;
  role: UserRole;
};

export type AuthState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; user: User };
