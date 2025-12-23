import "server-only";

import { App, type Octokit } from "octokit";
import { env } from "@/lib/env";

let app: App | null = null;

export const getGitHubApp = (): App => {
  if (!app) {
    app = new App({
      appId: env.GITHUB_APP_ID,
      privateKey: env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
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
