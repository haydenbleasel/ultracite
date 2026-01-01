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
  const octokit = await getInstallationOctokit(installationId);

  // List open PRs and check if any have a head branch starting with ultracite/fix-
  const { data: pulls } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: "open",
    per_page: 100,
  });

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
