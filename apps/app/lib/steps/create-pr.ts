import { handleGitHubError, parseError } from "@/lib/error";
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

  const octokit = await getInstallationOctokit(installationId).catch(
    (error: unknown) => {
      throw new Error(
        `[createPullRequest] Failed to get GitHub client: ${parseError(error)}`
      );
    }
  );

  const [owner, repo] = repoFullName.split("/");

  // Check if a PR already exists from this branch (idempotency check for retries)
  try {
    const { data: existingPRs } = await octokit.rest.pulls.list({
      owner,
      repo,
      head: `${owner}:${branchName}`,
      state: "open",
    });

    if (existingPRs.length > 0) {
      // PR already exists, return it instead of creating a duplicate
      const existingPR = existingPRs[0];
      return {
        prNumber: existingPR.number,
        prUrl: existingPR.html_url,
      };
    }
  } catch (error) {
    // Non-fatal: continue to create PR if check fails
    console.error(`Failed to check for existing PR: ${parseError(error)}`);
  }

  const title = isLLMFix
    ? "AI-generated fix using Ultracite Cloud"
    : "Auto-generated fix using Ultracite Cloud";

  let response: Awaited<
    ReturnType<typeof octokit.request<"POST /repos/{owner}/{repo}/pulls">>
  >;

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
    return handleGitHubError(error, "Failed to create pull request");
  }

  if (response.status !== 201) {
    throw new Error(`Failed to create PR with status ${response.status}`);
  }

  return {
    prNumber: response.data.number,
    prUrl: response.data.html_url,
  };
}
