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
        startedAt: new Date(),
        status: "RUNNING",
      },
      select: {
        id: true,
      },
    });
  } catch (error) {
    throw new Error(`Failed to create lint run: ${parseError(error)}`, {
      cause: error,
    });
  }

  return lintRun.id;
}
