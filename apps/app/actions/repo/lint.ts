"use server";

import { database } from "@repo/backend/database";
import { start } from "workflow/api";

import { lintRepoWorkflow } from "@/app/api/cron/lint/lint-repo";

export const triggerLintRun = async (repoId: string) => {
  try {
    const repo = await database.repo.findUnique({
      include: { organization: true },
      where: { id: repoId },
    });

    if (!repo) {
      return { error: "Repository not found", success: false };
    }

    const { organization } = repo;

    if (!organization.githubInstallationId) {
      return {
        error: "GitHub App not installed for this organization",
        success: false,
      };
    }

    if (!organization.stripeCustomerId) {
      return {
        error: "Billing not configured for this organization",
        success: false,
      };
    }

    await start(lintRepoWorkflow, [
      {
        defaultBranch: repo.defaultBranch,
        installationId: organization.githubInstallationId,
        organizationId: organization.id,
        repoFullName: repo.fullName,
        repoId: repo.id,
        stripeCustomerId: organization.stripeCustomerId,
      },
    ]);

    return { error: undefined, success: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return { error: message, success: false };
  }
};
