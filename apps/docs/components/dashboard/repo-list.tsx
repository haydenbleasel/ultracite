import type { LintRun, Repo } from "@/lib/database/generated/client";
import { RepoCard } from "./repo-card";

interface RepoListProps {
  repos: (Repo & {
    lintRuns: LintRun[];
  })[];
}

export const RepoList = ({ repos }: RepoListProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {repos.map((repo) => (
        <RepoCard key={repo.id} repo={repo} />
      ))}
    </div>
  );
};
