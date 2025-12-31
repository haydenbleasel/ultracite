import { database } from "@repo/backend/database";

export async function createLintRun(organizationId: string, repoId: string) {
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
    },
  });

  return lintRun.id;
}
