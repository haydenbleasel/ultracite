import type { LintRunStatus } from "@/lib/types";
import { Badge } from "@repo/design-system/components/ui/badge";

interface LintStatusBadgeProps {
  status: LintRunStatus | string | null;
}

const statusConfig: Record<
  string,
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
  SKIPPED: { label: "Skipped", variant: "secondary" },
};

export const LintStatusBadge = ({ status }: LintStatusBadgeProps) => {
  if (!status) {
    return <Badge variant="outline">No runs</Badge>;
  }

  const config = statusConfig[status] ?? {
    label: status,
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
};
