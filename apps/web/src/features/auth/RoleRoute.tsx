import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";
import {
  canAccessPath,
  defaultPathForRole
} from "@/features/auth/roles";

export function RoleRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return null;
  }

  if (!canAccessPath(user.role, location.pathname)) {
    return (
      <Navigate to={defaultPathForRole(user.role)} replace />
    );
  }

  return children;
}
