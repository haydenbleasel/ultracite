"use server";

import { database, type Repo } from "@repo/backend/src/database";
import { getInstallationOctokit } from "@/lib/github/app";

const validateBranch = async (
  repoId: string,
  branchName: string
): Promise<{ valid: boolean; error?: string }> => {
  const repo = await database.repo.findUnique({
    where: { id: repoId },
    include: { organization: true },
  });

  if (!repo) {
    return { valid: false, error: "Repository not found" };
  }

  const installationId = repo.organization.githubInstallationId;

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
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    });

    return { valid: true };
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) {
      return { valid: false, error: `Branch "${branchName}" does not exist` };
    }

    return { valid: false, error: "Failed to validate branch" };
  }
};

export const updateRepo = async (repoId: string, data: Partial<Repo>) => {
  try {
    if (data.defaultBranch) {
      const validation = await validateBranch(repoId, data.defaultBranch);

      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
    }

    await database.repo.update({
      where: { id: repoId },
      data,
    });

    return { success: true, error: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return { success: false, error: message };
  }
};
