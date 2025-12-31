import { database } from "@repo/backend/database";
import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { env } from "@/lib/env";
import { lintRepoWorkflow } from "./lint-repo";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Requires multiple conditional paths
export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await database.organization.findMany({
    where: {
      githubInstallationId: { not: null },
      stripeCustomerId: { not: null },
    },
    include: {
      repos: {
        where: { enabled: true, dailyRunsEnabled: true },
      },
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
            organizationId: org.id,
            repoId: repo.id,
            repoFullName: repo.fullName,
            defaultBranch: repo.defaultBranch,
            installationId: org.githubInstallationId,
            stripeCustomerId: org.stripeCustomerId,
          },
        ]);

        workflowsStarted.push(repo.fullName);
      } catch (error) {
        console.error(`Failed to start workflow for ${repo.fullName}:`, error);
        workflowsFailed.push({
          repo: repo.fullName,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  // Return appropriate status based on results
  if (workflowsFailed.length > 0 && workflowsStarted.length === 0) {
    return NextResponse.json(
      {
        message: "All workflows failed to start",
        failed: workflowsFailed,
      },
      { status: 500 }
    );
  }

  if (workflowsFailed.length > 0) {
    return NextResponse.json(
      {
        message: `Started ${workflowsStarted.length} workflows, ${workflowsFailed.length} failed`,
        repos: workflowsStarted,
        failed: workflowsFailed,
      },
      { status: 207 } // Multi-Status for partial success
    );
  }

  return NextResponse.json({
    message: `Started ${workflowsStarted.length} lint workflows`,
    repos: workflowsStarted,
  });
};
