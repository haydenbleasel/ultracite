import { database } from "@repo/backend";
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
    where: {
      githubInstallationId: { not: null },
    },
    include: {
      repos: {
        where: { enabled: true },
      },
    },
  });

  const workflowsStarted: string[] = [];

  for (const org of organizations) {
    if (!org.githubInstallationId) {
      continue;
    }

    for (const repo of org.repos) {
      // Start a durable workflow for each repo
      await start(lintRepoWorkflow, [
        {
          organizationId: org.id,
          repoId: repo.id,
          repoFullName: repo.fullName,
          defaultBranch: repo.defaultBranch,
          installationId: org.githubInstallationId,
        },
      ]);

      workflowsStarted.push(repo.fullName);
    }
  }

  return NextResponse.json({
    message: `Started ${workflowsStarted.length} lint workflows`,
    repos: workflowsStarted,
  });
};
