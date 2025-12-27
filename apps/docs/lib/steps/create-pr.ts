import { getInstallationOctokit } from "@/lib/github/app";
import type { PullRequestResult } from "./types";

export interface CreatePRParams {
  installationId: number;
  repoFullName: string;
  defaultBranch: string;
  branchName: string;
  file: string;
  isLLMFix: boolean;
  changelog?: string;
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
    isLLMFix,
    changelog,
  } = params;

  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const title = isLLMFix
    ? "AI-generated fix using Ultracite Cloud"
    : "Auto-generated fix using Ultracite Cloud";

  const response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
    owner,
    repo,
    title,
    body: `## Summary

This PR fixes linting issues detected by Ultracite.

## Changes

${changelog ?? "Check the files for changes."}

---

*This PR was automatically created by [Ultracite Cloud](https://www.ultracite.ai)*`,
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
