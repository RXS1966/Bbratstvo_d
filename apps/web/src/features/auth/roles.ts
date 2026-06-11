export type UserRole = "admin" | "manager" | "candidate";

export type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  roles: UserRole[];
};

export const APP_NAV_ITEMS: NavItem[] = [
  { to: "/app", label: "Главная", end: true, roles: ["admin", "manager", "candidate"] },
  {
    to: "/app/diagnostic",
    label: "Диагностика",
    roles: ["admin", "candidate"]
  },
  { to: "/app/case", label: "Кейс", roles: ["admin", "candidate"] },
  { to: "/app/result", label: "Результат", roles: ["admin", "candidate"] },
  { to: "/app/exam", label: "Экзаменатор", roles: ["admin", "candidate"] },
  {
    to: "/app/manager",
    label: "Кабинет руководителя",
    roles: ["admin", "manager"]
  }
];

export function normalizeRole(role: string): UserRole {
  if (role === "admin" || role === "manager") {
    return role;
  }
  return "candidate";
}

export function roleFromUsername(username: string): UserRole {
  const key = username.trim().toLowerCase();
  if (key === "admin") {
    return "admin";
  }
  if (key === "manager") {
    return "manager";
  }
  return "candidate";
}

export function roleLabel(role: UserRole): string {
  if (role === "admin") {
    return "Администратор";
  }
  if (role === "manager") {
    return "Руководитель";
  }
  return "Кандидат";
}

export function navItemsForRole(role: UserRole): NavItem[] {
  return APP_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

export function canAccessPath(role: UserRole, pathname: string): boolean {
  const path = pathname.replace(/\/$/, "") || "/app";
  const item = APP_NAV_ITEMS.find((nav) => {
    if (nav.end) {
      return path === nav.to;
    }
    return path === nav.to || path.startsWith(`${nav.to}/`);
  });
  if (!item) {
    return role === "admin";
  }
  return item.roles.includes(role);
}

export function defaultPathForRole(role: UserRole): string {
  if (role === "manager") {
    return "/app/manager";
  }
  if (role === "candidate") {
    return "/app/diagnostic";
  }
  return "/app";
}
