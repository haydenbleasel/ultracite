import { parseError } from "@/lib/error";
import { getInstallationOctokit } from "@/lib/github/app";

export async function getGitHubToken(installationId: number): Promise<string> {
  "use step";

  let octokit;

  try {
    octokit = await getInstallationOctokit(installationId);
  } catch (error) {
    throw new Error(
      `[getGitHubToken] Failed to get GitHub client: ${parseError(error)}`,
      { cause: error }
    );
  }

  let token;

  try {
    const auth = (await octokit.auth({
      type: "installation",
    })) as { token: string };
    ({ token } = auth);
  } catch (error) {
    throw new Error(`Failed to get GitHub token: ${parseError(error)}`, {
      cause: error,
    });
  }

  return token;
}
