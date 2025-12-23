import { checkChanges } from "./steps/check-changes";
import { checkLint } from "./steps/check-lint";
import { createBranchAndPush } from "./steps/create-branch-and-push";
import { createLintRun } from "./steps/create-lint-run";
import { createPullRequest } from "./steps/create-pr";
import { createSandbox } from "./steps/create-sandbox";
import { fixLint } from "./steps/fix-lint";
import { getGitHubToken } from "./steps/get-github-token";
import { installDependencies } from "./steps/install-dependencies";
import { stopSandbox } from "./steps/stop-sandbox";
import type { LintRepoParams, LintRepoResult, LintStepResult } from "./steps/types";
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

  // Step 2: Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Step 3: Create sandbox with the repo
  const sandbox = await createSandbox(repoFullName, token);

  let result: LintStepResult;

  try {
    // Step 4: Install dependencies
    await installDependencies(sandbox);

    // Step 5: Run lint check
    const checkResult = await checkLint(sandbox);

    if (!checkResult.hasIssues || !checkResult.issue) {
      result = { issuesFound: 0, prCreated: false };
    } else {
      // Step 6: Fix lint issues
      await fixLint(sandbox);

      // Step 7: Check if there are changes
      const hasChanges = await checkChanges(sandbox);

      if (!hasChanges) {
        result = {
          issuesFound: 1,
          prCreated: false,
          issueFixed: checkResult.issue.rule,
        };
      } else {
        // Step 8: Create branch and push
        const branchName = await createBranchAndPush(
          sandbox,
          checkResult.issue.rule
        );

        // Step 9: Create pull request
        const prResult = await createPullRequest(
          installationId,
          repoFullName,
          defaultBranch,
          branchName,
          checkResult.issue
        );

        result = {
          issuesFound: 1,
          issueFixed: checkResult.issue.rule,
          prCreated: true,
          prNumber: prResult.prNumber,
          prUrl: prResult.prUrl,
        };
      }
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result = {
      issuesFound: 0,
      prCreated: false,
      error: errorMessage,
    };
  } finally {
    // Step 10: Stop sandbox
    await stopSandbox(sandbox);
  }

  // Step 11: Update lint run with results
  await updateLintRun(lintRunId, result);

  return {
    repo: repoFullName,
    status: result.error ? "error" : "success",
    prUrl: result.prUrl,
    error: result.error,
  };
}
