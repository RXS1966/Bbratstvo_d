/**
 * Публичный origin приложения (для ссылок, редиректов, интеграций).
 * В dev по умолчанию — текущий origin браузера.
 */
export function getPublicOrigin(): string {
  const configured = import.meta.env.VITE_PUBLIC_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "";
}
