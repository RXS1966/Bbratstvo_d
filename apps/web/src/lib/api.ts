export type ApiError = {
  status: number;
  message: string;
};

type ValidationErrorItem = {
  loc?: (string | number)[];
  msg?: string;
};

function statusFallback(status: number): string {
  if (status === 401) {
    return "Требуется авторизация";
  }
  if (status === 403) {
    return "Недостаточно прав";
  }
  if (status === 404) {
    return "Не найдено";
  }
  if (status === 400) {
    return "Некорректный запрос";
  }
  if (status >= 500) {
    return "Ошибка сервера";
  }
  return "Ошибка запроса";
}

/** Разбор тела ответа FastAPI (detail string | validation array). */
export function parseApiErrorBody(text: string, status: number): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return statusFallback(status);
  }

  try {
    const data = JSON.parse(trimmed) as {
      detail?: unknown;
      message?: string;
    };

    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail.trim();
    }

    if (Array.isArray(data.detail)) {
      const parts = data.detail
        .map((item) => formatValidationItem(item))
        .filter((part) => part.length > 0);
      if (parts.length > 0) {
        return parts.join("; ");
      }
    }

    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
  } catch {
    /* не JSON — вернём текст как есть */
  }

  if (trimmed.length > 240) {
    return `${trimmed.slice(0, 240)}…`;
  }
  return trimmed;
}

function formatValidationItem(item: unknown): string {
  if (typeof item === "string") {
    return item;
  }
  if (typeof item !== "object" || item === null) {
    return "";
  }
  const row = item as ValidationErrorItem;
  const msg = row.msg?.trim() ?? "";
  if (!msg) {
    return "";
  }
  const loc = Array.isArray(row.loc)
    ? row.loc.filter((part) => part !== "body").join(".")
    : "";
  return loc ? `${loc}: ${msg}` : msg;
}

export function isApiError(err: unknown): err is ApiError {
  return (
    typeof err === "object" &&
    err !== null &&
    "status" in err &&
    "message" in err &&
    typeof (err as ApiError).status === "number" &&
    typeof (err as ApiError).message === "string"
  );
}

/** Сообщение для UI: из ApiError или запасной текст. */
export function formatApiErrorMessage(
  err: unknown,
  fallback: string
): string {
  if (isApiError(err) && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {}
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const res = await fetch(path, {
    ...options,
    headers,
    credentials: "include"
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const message = parseApiErrorBody(text, res.status);
    throw {
      status: res.status,
      message: message || res.statusText || statusFallback(res.status)
    } satisfies ApiError;
  }

  return (await res.json()) as T;
}
