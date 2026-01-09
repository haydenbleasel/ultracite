import { database } from "@repo/backend/database";
import { parseError } from "@/lib/error";

export async function createLintRun(organizationId: string, repoId: string) {
  "use step";

  let lintRun;

  try {
    lintRun = await database.lintRun.create({
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
  } catch (error) {
    throw new Error(`Failed to create lint run: ${parseError(error)}`);
  }

  return lintRun.id;
}
