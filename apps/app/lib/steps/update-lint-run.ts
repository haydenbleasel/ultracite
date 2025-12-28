import { database, type LintRun } from "@repo/backend";

export async function updateLintRun(
  lintRunId: string,
  data: Partial<LintRun>
): Promise<void> {
  "use step";

  await database.lintRun.update({
    where: { id: lintRunId },
    data,
  });
}
