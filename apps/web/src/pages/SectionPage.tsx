import {
  Alert,
  AlertDescription,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui";
import * as React from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { fetchSection } from "@/features/sections/sectionsApi";
import { formatApiErrorMessage } from "@/lib/api";
import { isBackendEnabled } from "@/lib/backend";

type SectionPageProps = {
  sectionId: string;
  fallbackTitle: string;
  fallbackDescription: string;
};

export function SectionPage({
  sectionId,
  fallbackTitle,
  fallbackDescription
}: SectionPageProps) {
  const { token } = useAuth();
  const [loading, setLoading] = React.useState(isBackendEnabled());
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<{
    title: string;
    description: string;
    status: string;
    message: string;
  } | null>(null);

  React.useEffect(() => {
    if (!isBackendEnabled() || !token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchSection(sectionId, token)
      .then((section) => {
        if (cancelled) {
          return;
        }
        setData({
          title: section.title,
          description: section.description,
          status: section.status,
          message: section.message
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setError(
            formatApiErrorMessage(
              err,
              "Не удалось загрузить раздел с сервера."
            )
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sectionId, token]);

  const title = data?.title ?? fallbackTitle;
  const description = data?.description ?? fallbackDescription;
  const status = data?.status ?? "offline";

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle>{title}</CardTitle>
          <Badge variant={status === "stub" ? "secondary" : "success"}>
            {loading ? "загрузка…" : status}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <Alert variant={isBackendEnabled() ? "info" : "default"}>
            <AlertDescription>
              {loading
                ? "Запрос к FastAPI…"
                : data?.message ??
                  "Заготовка: включите VITE_USE_BACKEND=1 и запустите apps/api."}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
