/** Вызовы реального FastAPI вместо локального демо. */
export function isBackendEnabled(): boolean {
  const raw = import.meta.env.VITE_USE_BACKEND;
  if (raw === "0" || raw === "false") {
    return false;
  }
  if (raw === "1" || raw === "true") {
    return true;
  }
  return import.meta.env.PROD;
}
