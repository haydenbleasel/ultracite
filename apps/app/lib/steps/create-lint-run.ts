import { database } from "@repo/backend";

export async function createLintRun(
  organizationId: string,
  repoId: string
): Promise<string> {
  "use step";

  const lintRun = await database.lintRun.create({
    data: {
      organizationId,
      repoId,
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  return lintRun.id;
}
