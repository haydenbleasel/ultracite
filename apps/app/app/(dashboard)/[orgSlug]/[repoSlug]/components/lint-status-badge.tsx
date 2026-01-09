import type { LintRunStatus } from "@repo/backend/database";
import { Badge } from "@repo/design-system/components/ui/badge";

interface LintStatusBadgeProps {
  status: LintRunStatus | null;
}

const statusConfig: Record<
  LintRunStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  FAILED: { label: "Failed", variant: "destructive" },
  PENDING: { label: "Pending", variant: "outline" },
  RUNNING: { label: "Running", variant: "secondary" },
  SKIPPED: { label: "Skipped", variant: "secondary" },
  SUCCESS_NO_ISSUES: { label: "Passing", variant: "default" },
  SUCCESS_PR_CREATED: { label: "PR Created", variant: "default" },
};

export const LintStatusBadge = ({ status }: LintStatusBadgeProps) => {
  if (!status) {
    return <Badge variant="outline">No runs</Badge>;
  }

  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
