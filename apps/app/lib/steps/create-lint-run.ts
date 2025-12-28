import { database, type LintRun } from "@repo/backend/database";

export async function createLintRun(
  organizationId: string,
  repoId: string
): Promise<Pick<LintRun, "id" | "sandboxCostUsd">> {
  "use step";

  const lintRun = await database.lintRun.create({
    data: {
      organizationId,
      repoId,
      status: "RUNNING",
      startedAt: new Date(),
    },
    select: {
      id: true,
      sandboxCostUsd: true,
    },
  });

  return lintRun;
}
