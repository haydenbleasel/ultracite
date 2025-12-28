import { database } from "@repo/backend";
import type { LintStepResult } from "./types";

function getStatusFromResult(result: LintStepResult) {
  if (result.error) {
    return "FAILED" as const;
  }
  if (result.prCreated) {
    return "SUCCESS_PR_CREATED" as const;
  }
  return "SUCCESS_NO_ISSUES" as const;
}

export async function updateLintRun(
  lintRunId: string,
  result: LintStepResult
): Promise<void> {
  "use step";

  await database.lintRun.update({
    where: { id: lintRunId },
    data: {
      status: getStatusFromResult(result),
      completedAt: new Date(),
      issuesFound: result.issuesFound,
      issueFixed: result.issueFixed,
      prNumber: result.prNumber,
      prUrl: result.prUrl,
      errorMessage: result.error,
    },
  });
}
