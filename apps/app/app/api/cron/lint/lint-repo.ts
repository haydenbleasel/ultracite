import { Prisma } from "@repo/backend/database";
import { checkPushAccess } from "@/lib/steps/check-push-access";
import { createBranchAndPush } from "@/lib/steps/create-branch-and-push";
import { createLintRun } from "@/lib/steps/create-lint-run";
import { createPullRequest } from "@/lib/steps/create-pr";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { fixLint } from "@/lib/steps/fix-lint";
import { generateChangelog } from "@/lib/steps/generate-changelog";
import { getGitHubToken } from "@/lib/steps/get-github-token";
import { hasUncommittedChanges } from "@/lib/steps/has-uncommitted-changes";
import { installClaudeCode } from "@/lib/steps/install-claude-code";
import { installDependencies } from "@/lib/steps/install-dependencies";
import { recordBillingUsage } from "@/lib/steps/record-billing-usage";
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

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Workflow orchestration requires multiple conditional paths
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
    stripeCustomerId,
  } = params;

  // Create lint run record
  const lintRun = await createLintRun(organizationId, repoId);

  // Check if we have push access before doing any work
  const pushAccess = await checkPushAccess(
    installationId,
    repoFullName,
    defaultBranch
  );

  if (!pushAccess.canPush) {
    await updateLintRun(lintRun.id, {
      status: "FAILED",
      errorMessage: pushAccess.reason,
      completedAt: new Date(),
    });

    return {
      repo: repoFullName,
      status: "error",
      error: pushAccess.reason,
    };
  }

  // Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Create sandbox with the repo (returns sandbox ID for serialization)
  const sandboxId = await createSandbox(repoFullName, token);

  let result: LintStepResult;
  let cost = new Prisma.Decimal(lintRun.sandboxCostUsd);

  try {
    // Install dependencies
    await installDependencies(sandboxId);

    // Run CLI fixes (auto-fix what we can)
    const fixResult = await fixLint(sandboxId);

    // Only do ONE thing per run: either auto-fix OR AI fix (not both)
    if (fixResult.hasChanges) {
      // Auto-fix made changes - generate changelog and create a PR
      const changelogResult = await generateChangelog(sandboxId);

      const branchName = await createBranchAndPush(
        sandboxId,
        "Auto-fix lint issues",
        repoFullName,
        token
      );

      const prResult = await createPullRequest({
        installationId,
        repoFullName,
        defaultBranch,
        branchName,
        file: "multiple files",
        isLLMFix: false,
        changelog: changelogResult.success
          ? changelogResult.changelog
          : undefined,
      });

      result = {
        prCreated: true,
        prNumber: prResult.prNumber,
        prUrl: prResult.prUrl,
      };
    } else if (fixResult.hasRemainingIssues) {
      // No auto-fixes possible, use Claude Code to fix ONE issue
      await installClaudeCode(sandboxId);

      // Single fix mode: only fix one issue per cron run
      const claudeCodeResult = await runClaudeCode(sandboxId);

      const aiCost = new Prisma.Decimal(claudeCodeResult.costUsd);
      cost = cost.plus(aiCost);

      // Update lint run with AI cost
      await updateLintRun(lintRun.id, { aiCostUsd: aiCost });

      if (await hasUncommittedChanges(sandboxId)) {
        // Generate changelog before committing
        const changelogResult = await generateChangelog(sandboxId);

        const branchName = await createBranchAndPush(
          sandboxId,
          "Fix lint issue with Claude Code",
          repoFullName,
          token
        );

        const prResult = await createPullRequest({
          installationId,
          repoFullName,
          defaultBranch,
          branchName,
          file: "multiple files",
          isLLMFix: true,
          changelog: changelogResult.success
            ? changelogResult.changelog
            : undefined,
        });

        result = {
          prCreated: true,
          prNumber: prResult.prNumber,
          prUrl: prResult.prUrl,
        };
      } else {
        // Claude Code couldn't fix the issue
        result = {
          prCreated: false,
          error: "Claude Code could not resolve the lint issue",
        };
      }
    } else {
      // No issues found
      result = { prCreated: false };
    }

    // Record workflow costs to billing system (only on success)
    await recordBillingUsage({
      cost: cost.toNumber(),
      stripeCustomerId,
    });

    // Determine the correct status based on the result
    // - SUCCESS_PR_CREATED: PR was created with fixes
    // - SUCCESS_NO_ISSUES: No lint issues were found
    // - FAILED: Claude Code found issues but couldn't fix them
    let status: "SUCCESS_PR_CREATED" | "SUCCESS_NO_ISSUES" | "FAILED" =
      "SUCCESS_NO_ISSUES";
    if (result.prCreated) {
      status = "SUCCESS_PR_CREATED";
    } else if (result.error) {
      status = "FAILED";
    }

    await updateLintRun(lintRun.id, {
      status,
      completedAt: new Date(),
      prNumber: result.prNumber,
      prUrl: result.prUrl,
      errorMessage: result.error,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    result = {
      prCreated: false,
      error: errorMessage,
    };

    await updateLintRun(lintRun.id, {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage,
    });
  } finally {
    // Final step: Stop sandbox
    await stopSandbox(sandboxId);
  }

  return {
    repo: repoFullName,
    status: result.error ? "error" : "success",
    prUrl: result.prUrl,
    error: result.error,
  };
}
