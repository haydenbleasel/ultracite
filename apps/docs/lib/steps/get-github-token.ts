import { getInstallationOctokit } from "@/lib/github/app";

export async function getGitHubToken(installationId: number): Promise<string> {
  "use step";

  const octokit = await getInstallationOctokit(installationId);

  const { token } = (await octokit.auth({
    type: "installation",
  })) as { token: string };

  return token;
}
