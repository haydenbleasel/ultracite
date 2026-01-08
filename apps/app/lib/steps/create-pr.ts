import { getInstallationOctokit } from "@/lib/github/app";
import { parseError } from "@/lib/error";
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

  let octokit;

  try {
    octokit = await getInstallationOctokit(installationId);
  } catch (error) {
    throw new Error(`[createPullRequest] Failed to get GitHub client: ${parseError(error)}`);
  }

  const [owner, repo] = repoFullName.split("/");

  const title = isLLMFix
    ? "AI-generated fix using Ultracite Cloud"
    : "Auto-generated fix using Ultracite Cloud";

  let response;

  try {
    response = await octokit.request("POST /repos/{owner}/{repo}/pulls", {
      owner,
      repo,
      title,
      body: `${changelog ?? "Check the files for changes."}

---

*This PR was automatically created by [Ultracite Cloud](https://www.ultracite.ai/cloud)*`,
      head: branchName,
      base: defaultBranch,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });
  } catch (error) {
    throw new Error(`Failed to create pull request: ${parseError(error)}`);
  }

  if (response.status !== 201) {
    throw new Error(
      `Failed to create PR with status ${response.status}`
    );
  }

  return {
    prNumber: response.data.number,
    prUrl: response.data.html_url,
  };
}
