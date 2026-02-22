"use server";

import { api } from "../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { getInstallationOctokit } from "@/lib/github/app";

const validateBranch = async (
  repoId: string,
  branchName: string
): Promise<{ valid: boolean; error?: string }> => {
  const repo = await convexClient.query(api.repos.getById, {
    id: repoId as any,
  });

  if (!repo) {
    return { valid: false, error: "Repository not found" };
  }

  const org = await (async () => {
    const allOrgs = await convexClient.query(
      api.organizations.getSubscribedWithInstallation,
      {}
    );
    return allOrgs.find((o) => o._id === repo.organizationId) ?? null;
  })();

  const installationId = org?.githubInstallationId;

  if (!installationId) {
    return {
      valid: false,
      error: "GitHub App not installed for this organization",
    };
  }

  const [owner, repoName] = repo.fullName.split("/");

  try {
    const octokit = await getInstallationOctokit(installationId);

    await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
      owner,
      repo: repoName,
      branch: branchName,
      headers: { "X-GitHub-Api-Version": "2022-11-28" },
    });

    return { valid: true };
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) {
      return { valid: false, error: `Branch "${branchName}" does not exist` };
    }

    return { valid: false, error: "Failed to validate branch" };
  }
};

export const updateRepo = async (
  repoId: string,
  data: {
    defaultBranch?: string;
    dailyRunsEnabled?: boolean;
    prReviewEnabled?: boolean;
  }
) => {
  try {
    if (data.defaultBranch) {
      const validation = await validateBranch(repoId, data.defaultBranch);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    await convexClient.mutation(api.repos.update, {
      id: repoId as any,
      ...data,
    });

    return { success: true, error: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return { success: false, error: message };
  }
};
