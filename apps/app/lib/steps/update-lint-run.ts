import { parseError } from "@/lib/error";
import { database, type LintRun } from "@repo/backend/database";

export async function updateLintRun(
  lintRunId: string,
  data: Partial<LintRun>
): Promise<void> {
  "use step";

  try {
    await database.lintRun.update({
      where: { id: lintRunId },
      data,
    });
  } catch (error) {
    throw new Error(`Failed to update lint run: ${parseError(error)}`);
  }
}
