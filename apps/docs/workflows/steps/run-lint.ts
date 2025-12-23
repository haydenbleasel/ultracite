import { FatalError } from "workflow";
import { runLintAndCreatePR } from "@/lib/lint/runner";
import type { LintStepResult } from "./types";

export async function runLint(
  installationId: number,
  repoFullName: string,
  defaultBranch: string
): Promise<LintStepResult> {
  "use step";

  try {
    const result = await runLintAndCreatePR({
      installationId,
      repoFullName,
      defaultBranch,
    });

    return {
      prCreated: result.prCreated,
      issuesFound: result.issuesFound,
      issueFixed: result.issueFixed,
      prNumber: result.prNumber,
      prUrl: result.prUrl,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Don't retry on fatal errors (e.g., repo not found, auth issues)
    if (
      errorMessage.includes("404") ||
      errorMessage.includes("401") ||
      errorMessage.includes("403")
    ) {
      throw new FatalError(errorMessage);
    }

    // Other errors will be retried automatically
    throw error;
  }
}
