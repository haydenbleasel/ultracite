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

interface RepoTableProps {
  runs: LintRun[];
}

export const RepoTable = ({ runs }: RepoTableProps) => {
  if (runs.length === 0) {
    return (
      <div className="flex h-full flex-1 items-center justify-center">
        <p className="text-muted-foreground text-sm">No lint runs yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-background shadow-xs">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Issues</TableHead>
            <TableHead>PR</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <LintStatusBadge status={run.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {run.issuesFound ?? "-"}
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
                {run.createdAt.toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
