import { getInstallationOctokit } from "@/lib/github/app";

export async function addPRComment(
  installationId: number,
  repoFullName: string,
  prNumber: number,
  body: string
): Promise<void> {
  "use step";

  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  const response = await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner,
      repo,
      issue_number: prNumber,
      body,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (response.status !== 201) {
    throw new Error(`Failed to add PR comment: ${response.status}`);
  }
}
