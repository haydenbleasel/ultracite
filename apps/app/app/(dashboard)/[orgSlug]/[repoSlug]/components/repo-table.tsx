import type { LintRun } from "@repo/backend/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/design-system/components/ui/table";
import Link from "next/link";
import { LintStatusBadge } from "./lint-status-badge";
import { RepoEmptyState } from "./repo-empty-state";

interface RepoTableProps {
  runs: LintRun[];
}

export const RepoTable = ({ runs }: RepoTableProps) => {
  if (!runs.length) {
    return <RepoEmptyState />;
  }

  return (
    <div className="flex-1 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>PR</TableHead>
            <TableHead>Timestamp</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <LintStatusBadge status={run.status} />
              </TableCell>
              <TableCell>
                {run.prUrl ? (
                  <Link
                    className="text-muted-foreground hover:underline"
                    href={run.prUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    #{run.prNumber}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {run.createdAt.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
