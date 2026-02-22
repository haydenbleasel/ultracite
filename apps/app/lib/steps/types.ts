import type { Id } from "../../convex/_generated/dataModel";

export interface LintRepoParams {
  defaultBranch: string;
  installationId: number;
  organizationId: Id<"organizations">;
  repoFullName: string;
  repoId: Id<"repos">;
  stripeCustomerId: string;
}

export interface LintStepResult {
  prCreated: boolean;
  prNumber?: number;
  prUrl?: string;
}

export interface PullRequestResult {
  prNumber: number;
  prUrl: string;
}
