import { type NextRequest, NextResponse } from "next/server";
import { start } from "workflow/api";
import { api } from "../../../../convex/_generated/api";
import { convexClient } from "@/lib/convex";
import { env } from "@/lib/env";
import { lintRepoWorkflow } from "./lint-repo";

export const GET = async (request: NextRequest) => {
  const authHeader = request.headers.get("authorization");

  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const organizations = await convexClient.query(
    api.organizations.getSubscribedWithInstallation,
    {}
  );

  const workflowsStarted: string[] = [];
  const workflowsFailed: { repo: string; error: string }[] = [];

  for (const org of organizations) {
    if (!(org.githubInstallationId && org.stripeCustomerId)) {
      continue;
    }

    const repos = await convexClient.query(api.repos.getByOrganizationId, {
      organizationId: org._id,
    });

    const enabledRepos = repos.filter((r) => r.dailyRunsEnabled);

    for (const repo of enabledRepos) {
      try {
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
      { status: 207 }
    );
  }

  return NextResponse.json({
    message: `Started ${workflowsStarted.length} lint workflows`,
    repos: workflowsStarted,
  });
};
