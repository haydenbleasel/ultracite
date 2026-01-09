import "server-only";
import { App, type Octokit } from "octokit";

import { env } from "@/lib/env";

let app: App | null = null;

export const getGitHubApp = (): App => {
  if (!app) {
    app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.replaceAll('\\n', "\n"),
    });
  }
  return app;
};

export const getInstallationOctokit = (
  installationId: number
): Promise<Octokit> => {
  const githubApp = getGitHubApp();
  return githubApp.getInstallationOctokit(installationId);
};

export const getInstallationToken = async (
  installationId: number
): Promise<string> => {
  const githubApp = getGitHubApp();
  const { data } = await githubApp.octokit.request(
    "POST /app/installations/{installation_id}/access_tokens",
    {
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      installation_id: installationId,
    }
  );
  return data.token;
};
