import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@repo/ui";
import * as React from "react";
import { Link } from "react-router-dom";

import {
  buildChecklistSteps,
  currentStepId,
  loadCandidateProgressSafe,
  type CandidateProgress
} from "@/features/onboarding/candidateProgress";
import { useAuth } from "@/features/auth/AuthContext";

type CandidatePathChecklistProps = {
  /** Прогресс с родительской страницы (меньше запросов). */
  progress?: CandidateProgress | null;
  compact?: boolean;
};

export function CandidatePathChecklist({
  progress: progressProp,
  compact = false
}: CandidatePathChecklistProps) {
  const { token } = useAuth();
  const [progress, setProgress] = React.useState<CandidateProgress | null>(
    progressProp ?? null
  );
  const [loading, setLoading] = React.useState(progressProp === undefined);

  React.useEffect(() => {
    if (progressProp !== undefined) {
      setProgress(progressProp);
      setLoading(false);
      return;
    }
    setLoading(true);
    void loadCandidateProgressSafe(token).then((data) => {
      setProgress(data);
      setLoading(false);
    });
  }, [token, progressProp]);

  const steps = buildChecklistSteps(progress);
  const activeId = currentStepId(steps);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{compact ? "Ваш путь" : "Чеклист кандидата"}</CardTitle>
        <CardDescription>
          {loading
            ? "Загрузка прогресса…"
            : `Выполнено ${doneCount} из ${steps.length} шагов`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {steps.map((step, index) => {
            const isActive = step.id === activeId;
            const muted = !step.enabled && !step.done;
            return (
              <li
                key={step.id}
                className={`flex gap-3 rounded-lg border p-3 ${
                  isActive
                    ? "border-slate-900 bg-slate-50"
                    : "border-slate-200"
                } ${muted ? "opacity-50" : ""}`}
              >
                <span
                  className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    step.done
                      ? "bg-emerald-600 text-white"
                      : isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-200 text-slate-600"
                  }`}
                  aria-hidden
                >
                  {step.done ? "✓" : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  {step.enabled ? (
                    <Link
                      className={`text-sm font-medium hover:underline ${
                        step.done ? "text-slate-500" : "text-slate-900"
                      }`}
                      to={step.to}
                    >
                      {step.title}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium text-slate-500">
                      {step.title}
                    </span>
                  )}
                  <p className="mt-0.5 text-xs text-slate-500">{step.hint}</p>
                  {isActive ? (
                    <p className="mt-1 text-xs font-medium text-slate-800">
                      Сейчас этот шаг
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
