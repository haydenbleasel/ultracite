import { parseError } from "@/lib/error";
import { getInstallationOctokit } from "@/lib/github/app";

export async function addPRComment(
  installationId: number,
  repoFullName: string,
  prNumber: number,
  body: string
): Promise<void> {
  "use step";

  let octokit;

  try {
    octokit = await getInstallationOctokit(installationId);
  } catch (error) {
    throw new Error(
      `[addPRComment] Failed to get GitHub client: ${parseError(error)}`
    );
  }

  const [owner, repo] = repoFullName.split("/");

  let response;

  try {
    response = await octokit.request(
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
  } catch (error) {
    throw new Error(`Failed to add PR comment: ${parseError(error)}`);
  }

  if (response.status !== 201) {
    throw new Error(`Failed to add PR comment with status ${response.status}`);
  }
}
