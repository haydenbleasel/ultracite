"use server";

import { database } from "@repo/backend/database";
import { start } from "workflow/api";
import { lintRepoWorkflow } from "@/app/api/cron/lint/lint-repo";

export const triggerLintRun = async (repoId: string) => {
  try {
    const repo = await database.repo.findUnique({
      where: { id: repoId },
      include: { organization: true },
    });

    if (!repo) {
      return { success: false, error: "Repository not found" };
    }

    const { organization } = repo;

    if (!organization.githubInstallationId) {
      return {
        success: false,
        error: "GitHub App not installed for this organization",
      };
    }

    if (!organization.stripeCustomerId) {
      return {
        success: false,
        error: "Billing not configured for this organization",
      };
    }

    await start(lintRepoWorkflow, [
      {
        organizationId: organization.id,
        repoId: repo.id,
        repoFullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        installationId: organization.githubInstallationId,
        stripeCustomerId: organization.stripeCustomerId,
      },
    ]);

    return { success: true, error: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return { success: false, error: message };
  }
};
