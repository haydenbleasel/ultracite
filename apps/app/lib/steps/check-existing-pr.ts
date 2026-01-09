import { handleGitHubError, parseError } from "@/lib/error";
import { getInstallationOctokit } from "@/lib/github/app";

export interface ExistingPRResult {
  hasExistingPR: boolean;
  prUrl?: string;
  prNumber?: number;
}

export async function checkExistingPR(
  installationId: number,
  repoFullName: string
): Promise<ExistingPRResult> {
  "use step";

  const [owner, repo] = repoFullName.split("/");

  let octokit;

  try {
    octokit = await getInstallationOctokit(installationId);
  } catch (error) {
    throw new Error(
      `[checkExistingPR] Failed to get GitHub client: ${parseError(error)}`,
      { cause: error }
    );
  }

  // List open PRs and check if any have a head branch starting with ultracite/fix-
  let pulls: Awaited<ReturnType<typeof octokit.rest.pulls.list>>["data"];

  try {
    const response = await octokit.rest.pulls.list({
      owner,
      per_page: 100,
      repo,
      state: "open",
    });
    pulls = response.data;
  } catch (error) {
    return handleGitHubError(error, "Failed to list pull requests");
  }

  const existingPR = pulls.find((pr) =>
    pr.head.ref.startsWith("ultracite/fix-")
  );

  if (existingPR) {
    return {
      hasExistingPR: true,
      prNumber: existingPR.number,
      prUrl: existingPR.html_url,
    };
  }

  return { hasExistingPR: false };
}
