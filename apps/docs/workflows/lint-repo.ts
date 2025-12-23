import { createLintRun } from "./steps/create-lint-run";
import { runLint } from "./steps/run-lint";
import type { LintRepoParams, LintRepoResult } from "./steps/types";
import { updateLintRun } from "./steps/update-lint-run";

export type { LintRepoParams, LintRepoResult } from "./steps/types";

export async function lintRepoWorkflow(
  params: LintRepoParams
): Promise<LintRepoResult> {
  "use workflow";

  const {
    organizationId,
    repoId,
    repoFullName,
    defaultBranch,
    installationId,
  } = params;

  // Step 1: Create lint run record
  const lintRunId = await createLintRun(organizationId, repoId);

  // Step 2: Run lint and create PR
  const result = await runLint(installationId, repoFullName, defaultBranch);

  // Step 3: Update lint run with results
  await updateLintRun(lintRunId, result);

  return {
    repo: repoFullName,
    status: result.error ? "error" : "success",
    prUrl: result.prUrl,
    error: result.error,
  };
}
