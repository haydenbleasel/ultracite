import { checkPushAccess } from "@/lib/steps/check-push-access";
import { createBranchAndPush } from "@/lib/steps/create-branch-and-push";
import { createLintRun } from "@/lib/steps/create-lint-run";
import { createPullRequest } from "@/lib/steps/create-pr";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { fixLint } from "@/lib/steps/fix-lint";
import { getGitHubToken } from "@/lib/steps/get-github-token";
import { hasUncommittedChanges } from "@/lib/steps/has-uncommitted-changes";
import { installClaudeCode } from "@/lib/steps/install-claude-code";
import { installDependencies } from "@/lib/steps/install-dependencies";
import { runClaudeCode } from "@/lib/steps/run-claude-code";
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

  // Step 2: Check if we have push access before doing any work
  const pushAccess = await checkPushAccess(
    installationId,
    repoFullName,
    defaultBranch
  );

  if (!pushAccess.canPush) {
    await updateLintRun(lintRunId, {
      prCreated: false,
      issuesFound: 0,
      error: pushAccess.reason,
    });

    return {
      repo: repoFullName,
      status: "error",
      error: pushAccess.reason,
    };
  }

  // Step 3: Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Step 4: Create sandbox with the repo (returns sandbox ID for serialization)
  const sandboxId = await createSandbox(repoFullName, token);

  let result: LintStepResult;

  try {
    // Step 5: Install dependencies
    await installDependencies(sandboxId);

    // Step 6: Run ultracite fix (auto-fix what we can)
    const fixResult = await fixLint(sandboxId);

    // Only do ONE thing per run: either auto-fix OR AI fix (not both)
    if (fixResult.hasChanges) {
      // Auto-fix made changes - create a PR with those
      const branchName = await createBranchAndPush(
        sandboxId,
        "auto-fix",
        "Auto-fix lint issues",
        repoFullName,
        token
      );

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
    } else if (fixResult.hasRemainingIssues) {
      // No auto-fixes possible, use Claude Code to fix ONE issue
      await installClaudeCode(sandboxId);

      // Single fix mode: only fix one issue per cron run
      await runClaudeCode(sandboxId);

      if (await hasUncommittedChanges(sandboxId)) {
        const branchName = await createBranchAndPush(
          sandboxId,
          "claude-fix",
          "Fix lint issue with Claude Code",
          repoFullName,
          token
        );

        const prResult = await createPullRequest({
          installationId,
          repoFullName,
          defaultBranch,
          branchName,
          title: "Fix lint issue",
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
        // Claude Code couldn't fix the issue
        result = {
          issuesFound: 1,
          prCreated: false,
          error: "Claude Code could not resolve the lint issue",
        };
      }
    } else {
      // No issues found
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
    await stopSandbox(sandboxId);
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
