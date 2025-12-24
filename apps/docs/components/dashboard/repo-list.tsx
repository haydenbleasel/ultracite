import type { LintRun, Repo } from "@/lib/database/generated/client";
import { RepoTable } from "./repo-table";

interface RepoListProps {
  repos: (Repo & {
    lintRuns: LintRun[];
  })[];
}

export const RepoList = ({ repos }: RepoListProps) => (
    <div className="space-y-4">
      {repos.map((repo) => (
        <div className="bg-secondary rounded-xl p-2 space-y-2">
          <div className="flex items-center justify-between gap-2 py-1 px-2">
            <h3 className="font-semibold text-sm">{repo.fullName}</h3>
            <p className="text-muted-foreground text-xs">{repo.defaultBranch}</p>
          </div>
          <RepoTable runs={repo.lintRuns} repo={repo} />
        </div>
      ))}
    </div>
  );
