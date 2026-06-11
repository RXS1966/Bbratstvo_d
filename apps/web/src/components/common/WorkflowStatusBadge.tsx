import { Badge } from "@repo/ui";

export type WorkflowStatus = "draft" | "running" | "completed" | string;

function statusBadgeVariant(
  status: WorkflowStatus
): "secondary" | "warning" | "success" {
  if (status === "running") {
    return "warning";
  }
  if (status === "completed") {
    return "success";
  }
  return "secondary";
}

export function workflowStatusLabel(status: WorkflowStatus): string {
  if (status === "draft") {
    return "черновик";
  }
  if (status === "running") {
    return "в работе";
  }
  if (status === "completed") {
    return "завершён";
  }
  return status;
}

type Props = {
  status: WorkflowStatus;
};

export function WorkflowStatusBadge({ status }: Props) {
  return (
    <Badge variant={statusBadgeVariant(status)}>
      {workflowStatusLabel(status)}
    </Badge>
  );
}
