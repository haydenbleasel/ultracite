import { type NextRequest, NextResponse } from "next/server";
import { database } from "@/lib/database";
import type { Organization, Repo } from "@/lib/database/generated/client";
import { env } from "@/lib/env";
import { runLintAndCreatePR } from "@/lib/lint/runner";

export const maxDuration = 300;

interface LintResult {
  repo: string;
  status: "success" | "error";
  prUrl?: string;
  error?: string;
}

const processRepo = async (
  org: Organization & { githubInstallationId: number },
  repo: Repo
): Promise<LintResult> => {
  const lintRun = await database.lintRun.create({
    data: {
      organizationId: org.id,
      repoId: repo.id,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  try {
    const result = await runLintAndCreatePR({
      installationId: org.githubInstallationId,
      repoFullName: repo.fullName,
      defaultBranch: repo.defaultBranch,
    });

    await database.lintRun.update({
      where: { id: lintRun.id },
      data: {
        status: result.prCreated ? "SUCCESS_PR_CREATED" : "SUCCESS_NO_ISSUES",
        completedAt: new Date(),
        issuesFound: result.issuesFound,
        issueFixed: result.issueFixed,
        prNumber: result.prNumber,
        prUrl: result.prUrl,
      },
    });

    return {
      repo: repo.fullName,
      status: "success",
      prUrl: result.prUrl,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    await database.lintRun.update({
      where: { id: lintRun.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage,
      },
    });

    return {
      repo: repo.fullName,
      status: "error",
      error: errorMessage,
    };
  }
};

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

  const results: LintResult[] = [];

  for (const org of organizations) {
    if (!org.githubInstallationId) {
      continue;
    }

    for (const repo of org.repos) {
      const result = await processRepo(
        { ...org, githubInstallationId: org.githubInstallationId },
        repo
      );
      results.push(result);
    }
  }

  return NextResponse.json({ results });
};
