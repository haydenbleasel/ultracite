export interface LintRepoParams {
  defaultBranch: string;
  installationId: number;
  organizationId: string;
  repoFullName: string;
  repoId: string;
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
