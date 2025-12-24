import { ExternalLinkIcon, GitBranchIcon } from "lucide-react";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LintRun, Repo } from "@/lib/database/generated/client";
import { LintStatusBadge } from "./lint-status-badge";

interface RepoTableProps {
  runs: LintRun[];
  repo: Repo;
}

export const RepoTable = ({ runs, repo }: RepoTableProps) => {
  if (runs.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No lint runs found.</p>
    );
  }

  return (
    <div className="bg-background rounded-lg border shadow-xs overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Repository</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>PR</TableHead>
            <TableHead>Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {runs.map((run) => (
            <TableRow key={run.id}>
              <TableCell>
                <Link
                  className="flex items-center gap-2 hover:underline"
                  href={`https://github.com/${repo.fullName}`}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {repo.fullName}
                  <ExternalLinkIcon className="size-3 text-muted-foreground" />
                </Link>
              </TableCell>
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
                {run.createdAt.toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
