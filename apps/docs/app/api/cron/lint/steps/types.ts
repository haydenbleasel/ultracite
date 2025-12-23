export interface LintRepoParams {
  organizationId: string;
  repoId: string;
  repoFullName: string;
  defaultBranch: string;
  installationId: number;
}

export interface LintRepoResult {
  repo: string;
  status: "success" | "error";
  prUrl?: string;
  error?: string;
}

export interface LintStepResult {
  prCreated: boolean;
  issuesFound: number;
  issueFixed?: string;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

export interface PullRequestResult {
  prNumber: number;
  prUrl: string;
}
