import { ExternalLinkIcon, GitBranchIcon } from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LintRun, Repo } from "@/lib/database/generated/client";
import { LintStatusBadge } from "./lint-status-badge";

interface RepoCardProps {
  repo: Repo & {
    lintRuns: LintRun[];
  };
}

export const RepoCard = ({ repo }: RepoCardProps) => {
  const latestRun = repo.lintRuns[0];

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link
            className="hover:underline"
            href={`https://github.com/${repo.fullName}`}
            rel="noopener noreferrer"
            target="_blank"
          >
            {repo.fullName}
          </Link>
          <ExternalLinkIcon className="size-3 text-muted-foreground" />
        </CardTitle>
        <CardDescription className="flex items-center gap-1">
          <GitBranchIcon className="size-3" />
          {repo.defaultBranch}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <LintStatusBadge status={latestRun?.status ?? null} />
        {latestRun?.prUrl ? (
          <Link
            className="text-muted-foreground text-xs hover:underline"
            href={latestRun.prUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            PR #{latestRun.prNumber}
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
};
