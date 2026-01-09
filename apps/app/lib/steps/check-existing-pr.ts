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
      `[checkExistingPR] Failed to get GitHub client: ${parseError(error)}`
    );
  }

  // List open PRs and check if any have a head branch starting with ultracite/fix-
  let pulls: Awaited<ReturnType<typeof octokit.rest.pulls.list>>["data"];

  try {
    const response = await octokit.rest.pulls.list({
      owner,
      repo,
      state: "open",
      per_page: 100,
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
      prUrl: existingPR.html_url,
      prNumber: existingPR.number,
    };
  }

  return { hasExistingPR: false };
}
