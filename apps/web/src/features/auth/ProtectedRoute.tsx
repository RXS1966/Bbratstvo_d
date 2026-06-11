import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "@/features/auth/AuthContext";

export function ProtectedRoute() {
  const { state } = useAuth();
  const location = useLocation();

  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 text-slate-900">
        Загрузка…
      </div>
    );
  }

  if (state.status !== "authenticated") {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  return <Outlet />;
}
