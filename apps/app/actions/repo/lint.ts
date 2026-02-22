"use server";

import { start } from "workflow/api";
import { api } from "../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { lintRepoWorkflow } from "@/app/api/cron/lint/lint-repo";

export const triggerLintRun = async (repoId: string) => {
  try {
    const repo = await convexClient.query(api.repos.getById, {
      id: repoId as any,
    });

    if (!repo) {
      return { success: false, error: "Repository not found" };
    }

    const org = await (async () => {
      const allOrgs = await convexClient.query(
        api.organizations.getSubscribedWithInstallation,
        {}
      );
      return allOrgs.find((o) => o._id === repo.organizationId) ?? null;
    })();

    if (!org) {
      return { success: false, error: "Organization not found" };
    }

    if (!org.githubInstallationId) {
      return {
        success: false,
        error: "GitHub App not installed for this organization",
      };
    }

    if (!org.stripeCustomerId) {
      return {
        success: false,
        error: "Billing not configured for this organization",
      };
    }

    await start(lintRepoWorkflow, [
      {
        organizationId: org._id,
        repoId: repo._id,
        repoFullName: repo.fullName,
        defaultBranch: repo.defaultBranch,
        installationId: org.githubInstallationId,
        stripeCustomerId: org.stripeCustomerId,
      },
    ]);

    return { success: true, error: undefined };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return { success: false, error: message };
  }
};
