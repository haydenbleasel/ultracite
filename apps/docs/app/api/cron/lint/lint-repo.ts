import { createBranchAndPush } from "@/lib/steps/create-branch-and-push";
import { createLintRun } from "@/lib/steps/create-lint-run";
import { createPullRequest } from "@/lib/steps/create-pr";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { fixLint } from "@/lib/steps/fix-lint";
import { getGitHubToken } from "@/lib/steps/get-github-token";
import { hasUncommittedChanges } from "@/lib/steps/has-uncommitted-changes";
import { installDependencies } from "@/lib/steps/install-dependencies";
import { installClaudeCode, runClaudeCode } from "@/lib/steps/run-claude-code";
import { stopSandbox } from "@/lib/steps/stop-sandbox";
import type {
  LintRepoParams,
  LintRepoResult,
  LintStepResult,
} from "@/lib/steps/types";
import { updateLintRun } from "@/lib/steps/update-lint-run";

export type {
  LintRepoParams,
  LintRepoResult,
} from "@/lib/steps/types";

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

    // Step 5: Run ultracite fix (auto-fix what we can)
    const fixResult = await fixLint(sandbox);

    // If auto-fix made changes, create a PR with those changes
    if (fixResult.hasChanges) {
      // Step 6a: Create branch and push (auto-fix)
      const branchName = await createBranchAndPush(
        sandbox,
        "auto-fix",
        "Auto-fix lint issues"
      );

      // Step 7a: Create pull request (auto-fix)
      const prResult = await createPullRequest({
        installationId,
        repoFullName,
        defaultBranch,
        branchName,
        title: "Auto-fix lint issues",
        file: "multiple files",
        isLLMFix: false,
      });

      result = {
        issuesFound: 1,
        issueFixed: "auto-fix",
        prCreated: true,
        prNumber: prResult.prNumber,
        prUrl: prResult.prUrl,
      };
    } else if (
      fixResult.output.includes("error") ||
      fixResult.output.includes("warning")
    ) {
      // There are remaining issues that couldn't be auto-fixed
      // Step 6b: Install Claude Code CLI
      await installClaudeCode(sandbox);

      // Step 7b: Use Claude Code to fix remaining issues
      await runClaudeCode(
        sandbox,
        `You are fixing lint issues in a codebase. Run "npx ultracite check" to see the current lint errors, then fix them one by one.

After each fix, run "npx ultracite check" again to verify the fix worked and check for remaining issues.

Continue until all lint issues are resolved or you've made multiple attempts at the same issue.

Important:
- Only fix real lint errors shown in the output
- Don't modify files unnecessarily
- Preserve the existing code style`
      );

      // Check if Claude Code made any changes
      if (await hasUncommittedChanges(sandbox)) {
        // Step 8b: Create branch and push (Claude Code fix)
        const branchName = await createBranchAndPush(
          sandbox,
          "claude-fix",
          "Fix lint issues with Claude Code"
        );

        // Step 9b: Create pull request (Claude Code fix)
        const prResult = await createPullRequest({
          installationId,
          repoFullName,
          defaultBranch,
          branchName,
          title: "Fix lint issues",
          file: "multiple files",
          isLLMFix: true,
        });

        result = {
          issuesFound: 1,
          issueFixed: "claude-code-fix",
          prCreated: true,
          prNumber: prResult.prNumber,
          prUrl: prResult.prUrl,
        };
      } else {
        // Claude Code couldn't fix the issues
        result = {
          issuesFound: 1,
          prCreated: false,
          error: "Claude Code could not resolve the lint issues",
        };
      }
    } else {
      // No issues found, we're done
      result = { issuesFound: 0, prCreated: false };
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
    // Final step: Stop sandbox
    await stopSandbox(sandbox);
  }

  // Final step: Update lint run with results
  await updateLintRun(lintRunId, result);

  return {
    repo: repoFullName,
    status: result.error ? "error" : "success",
    prUrl: result.prUrl,
    error: result.error,
  };
}
