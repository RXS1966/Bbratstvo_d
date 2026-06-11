const AUTH_KEY = "auth.simple";

type StoredAuth = {
  username: string;
  token: string;
};

export function readStoredAuth(): StoredAuth | null {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed?.username || !parsed?.token) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeStoredAuth(auth: StoredAuth): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_KEY);
}
