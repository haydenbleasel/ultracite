import { getInstallationOctokit } from "@/lib/github/app";
import type { LintIssue, PullRequestResult } from "./types";

export async function createPullRequest(
  installationId: number,
  repoFullName: string,
  defaultBranch: string,
  branchName: string,
  issue: LintIssue
): Promise<PullRequestResult> {
  "use step";

  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const { data: pr } = await octokit.request(
    "POST /repos/{owner}/{repo}/pulls",
    {
      owner,
      repo,
      title: `fix: Ultracite lint fix for ${issue.rule}`,
      body: `## Summary

This PR fixes a linting issue detected by Ultracite.

**Rule**: \`${issue.rule}\`
**File**: \`${issue.file}\`

## Changes

Automatically applied the recommended fix for the \`${issue.rule}\` rule.

---

*This PR was automatically created by [Ultracite](https://ultracite.ai) using [Vercel Sandbox](https://vercel.com/docs/vercel-sandbox).*`,
      head: branchName,
      base: defaultBranch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  return {
    prNumber: pr.number,
    prUrl: pr.html_url,
  };
}
