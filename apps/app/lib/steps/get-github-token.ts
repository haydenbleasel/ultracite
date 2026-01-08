import { getInstallationOctokit } from "@/lib/github/app";
import { parseError } from "@/lib/error";

export async function getGitHubToken(installationId: number): Promise<string> {
  "use step";

  let octokit;

  try {
    octokit = await getInstallationOctokit(installationId);
  } catch (error) {
    throw new Error(`[getGitHubToken] Failed to get GitHub client: ${parseError(error)}`);
  }

  let token;

  try {
    const auth = (await octokit.auth({
      type: "installation",
    })) as { token: string };
    token = auth.token;
  } catch (error) {
    throw new Error(`Failed to get GitHub token: ${parseError(error)}`);
  }

  return token;
}
