import { Alert, AlertDescription } from "@repo/ui";

export function BackendRequiredAlert() {
  return (
    <Alert variant="warning">
      <AlertDescription>
        Включите <code>VITE_USE_BACKEND=1</code> в <code>apps/web/.env</code> и
        запустите FastAPI (<code>apps/api/run.ps1</code>) + PostgreSQL (
        <code>docker compose up -d</code>).
      </AlertDescription>
    </Alert>
  );
}
