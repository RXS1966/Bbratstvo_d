import { NavLink, Outlet } from "react-router-dom";
import { Badge, Button, cn } from "@repo/ui";

import { useAuth } from "@/features/auth/AuthContext";
import { RoleRoute } from "@/features/auth/RoleRoute";
import { navItemsForRole, roleLabel } from "@/features/auth/roles";

export function AppLayout() {
  const { user, logout } = useAuth();
  const navItems = user ? navItemsForRole(user.role) : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">
              Нейроэкзаменатор
            </div>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <span className="truncate text-xs text-slate-600">
                {user?.username ? `Вы: ${user.username}` : "Сессия"}
              </span>
              {user ? (
                <Badge variant="secondary">{roleLabel(user.role)}</Badge>
              ) : null}
            </div>
          </div>
          <Button variant="outline" onClick={logout}>
            Выйти
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[240px_1fr]">
        <aside className="md:sticky md:top-6 md:self-start">
          <nav className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
            <div className="px-2 pb-2 pt-1 text-xs font-semibold text-slate-500">
              Разделы
            </div>
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={Boolean(item.end)}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-md px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-slate-900 text-slate-50"
                          : "text-slate-700 hover:bg-slate-100"
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="min-w-0">
          <RoleRoute>
            <Outlet />
          </RoleRoute>
        </main>
      </div>
    </div>
  );
}
