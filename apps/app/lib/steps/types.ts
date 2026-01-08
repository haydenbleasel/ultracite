export interface LintRepoParams {
  organizationId: string;
  repoId: string;
  repoFullName: string;
  defaultBranch: string;
  installationId: number;
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
