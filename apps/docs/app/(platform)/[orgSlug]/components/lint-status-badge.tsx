import { Badge } from "@repo/design-system/components/ui/badge";
import type { LintRunStatus } from "@ultracite/backend/database";

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
  PENDING: { label: "Pending", variant: "outline" },
  RUNNING: { label: "Running", variant: "secondary" },
  SUCCESS_NO_ISSUES: { label: "Passing", variant: "default" },
  SUCCESS_PR_CREATED: { label: "PR Created", variant: "default" },
  FAILED: { label: "Failed", variant: "destructive" },
};

export const LintStatusBadge = ({ status }: LintStatusBadgeProps) => {
  if (!status) {
    return <Badge variant="outline">No runs</Badge>;
  }

  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
