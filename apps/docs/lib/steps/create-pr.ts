import { getInstallationOctokit } from "@/lib/github/app";
import type { PullRequestResult } from "./types";

export interface CreatePRParams {
  installationId: number;
  repoFullName: string;
  defaultBranch: string;
  branchName: string;
  title: string;
  file: string;
  isLLMFix: boolean;
}

export async function createPullRequest(
  params: CreatePRParams
): Promise<PullRequestResult> {
  "use step";

  const {
    installationId,
    repoFullName,
    defaultBranch,
    branchName,
    title,
    file,
    isLLMFix,
  } = params;

  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const fixMethod = isLLMFix
    ? "AI-generated fix using openai/codex-mini"
    : "Automatically applied the recommended fix";

  const response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    title: `fix: ${title}`,
    body: `## Summary

This PR fixes a linting issue detected by Ultracite.

**File**: \`${file}\`

## Changes

${fixMethod}.

---

*This PR was automatically created by [Ultracite](https://ultracite.ai) using [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox).*`,
    head: branchName,
    base: defaultBranch,
    headers: {
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status !== 201) {
    throw new Error(`Failed to create PR: ${response.status}`);
  }

  return {
    prNumber: response.data.number,
    prUrl: response.data.html_url,
  };
}
