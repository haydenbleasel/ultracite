import { parseError } from "@/lib/error";
import { getInstallationOctokit } from "@/lib/github/app";

export async function getGitHubToken(installationId: number): Promise<string> {
  "use step";

  const octokit = await getInstallationOctokit(installationId).catch(
    (error: unknown) => {
      throw new Error(
        `[getGitHubToken] Failed to get GitHub client: ${parseError(error)}`
      );
    }
  );

  const auth = await (
    octokit.auth({ type: "installation" }) as Promise<{ token: string }>
  ).catch((error: unknown) => {
    throw new Error(`Failed to get GitHub token: ${parseError(error)}`);
  });

  return auth.token;
}
