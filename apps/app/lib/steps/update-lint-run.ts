import { database, type LintRun } from "@repo/backend/database";

import { parseError } from "@/lib/error";

export async function updateLintRun(
  lintRunId: string,
  data: Partial<LintRun>
): Promise<void> {
  "use step";

  try {
    await database.lintRun.update({
      data,
      where: { id: lintRunId },
    });
  } catch (error) {
    throw new Error(`Failed to update lint run: ${parseError(error)}`, {
      cause: error,
    });
  }
}
