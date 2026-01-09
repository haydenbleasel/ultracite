import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";

import { env } from "@/lib/env";

import { lintRepoWorkflow } from "./lint-repo";

export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await database.organization.findMany({
    include: {
      repos: {
        where: { dailyRunsEnabled: true },
      },
    },
    where: {
      githubInstallationId: { not: null },
      stripeCustomerId: { not: null },
    },
  });

  const workflowsStarted: string[] = [];
  const workflowsFailed: { repo: string; error: string }[] = [];

  for (const org of organizations) {
    if (!(org.githubInstallationId && org.stripeCustomerId)) {
      continue;
    }

    for (const repo of org.repos) {
      try {
        // Start a durable workflow for each repo
        await start(lintRepoWorkflow, [
          {
            defaultBranch: repo.defaultBranch,
            installationId: org.githubInstallationId,
            organizationId: org.id,
            repoFullName: repo.fullName,
            repoId: repo.id,
            stripeCustomerId: org.stripeCustomerId,
          },
        ]);

        workflowsStarted.push(repo.fullName);
      } catch (error) {
        console.error(`Failed to start workflow for ${repo.fullName}:`, error);
        workflowsFailed.push({
          error: error instanceof Error ? error.message : "Unknown error",
          repo: repo.fullName,
        });
      }
    }
  }

  // Return appropriate status based on results
  if (workflowsFailed.length > 0 && workflowsStarted.length === 0) {
    return NextResponse.json(
      {
        failed: workflowsFailed,
        message: "All workflows failed to start",
      },
      { status: 500 }
    );
  }

  if (workflowsFailed.length > 0) {
    return NextResponse.json(
      {
        failed: workflowsFailed,
        message: `Started ${workflowsStarted.length} workflows, ${workflowsFailed.length} failed`,
        repos: workflowsStarted,
      },
      { status: 207 } // Multi-Status for partial success
    );
  }

  return NextResponse.json({
    message: `Started ${workflowsStarted.length} lint workflows`,
    repos: workflowsStarted,
  });
};
