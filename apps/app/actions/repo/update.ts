"use server";

import { database, type Repo } from "@repo/backend/src/database";

import { getInstallationOctokit } from "@/lib/github/app";

const validateBranch = async (
  repoId: string,
  branchName: string
): Promise<{ valid: boolean; error?: string }> => {
  const repo = await database.repo.findUnique({
    include: { organization: true },
    where: { id: repoId },
  });

  if (!repo) {
    return { error: "Repository not found", valid: false };
  }

  const installationId = repo.organization.githubInstallationId;

  if (!installationId) {
    return {
      error: "GitHub App not installed for this organization",
      valid: false,
    };
  }

  const [owner, repoName] = repo.fullName.split("/");

  try {
    const octokit = await getInstallationOctokit(installationId);

    await octokit.request("GET /repos/{owner}/{repo}/branches/{branch}", {
      branch: branchName,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
      owner,
      repo: repoName,
    });

    return { valid: true };
  } catch (error) {
    if (error instanceof Error && "status" in error && error.status === 404) {
      return { error: `Branch "${branchName}" does not exist`, valid: false };
    }

    return { error: "Failed to validate branch", valid: false };
  }
};

export const updateRepo = async (repoId: string, data: Partial<Repo>) => {
  try {
    if (data.defaultBranch) {
      const validation = await validateBranch(repoId, data.defaultBranch);

      if (!validation.valid) {
        return { error: validation.error, success: false };
      }
    }

    await database.repo.update({
      data,
      where: { id: repoId },
    });

    return { error: undefined, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return { error: message, success: false };
  }
};
