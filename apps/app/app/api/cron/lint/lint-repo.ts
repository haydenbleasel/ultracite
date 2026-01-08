import { checkExistingPR } from "@/lib/steps/check-existing-pr";
import { checkPushAccess } from "@/lib/steps/check-push-access";
import { commitAndPush } from "@/lib/steps/commit-and-push";
import { configureGit } from "@/lib/steps/configure-git";
import { createBranch } from "@/lib/steps/create-branch";
import { createLintRun } from "@/lib/steps/create-lint-run";
import { createPullRequest } from "@/lib/steps/create-pr";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { extendSandbox } from "@/lib/steps/extend-sandbox";
import { fixLint } from "@/lib/steps/fix-lint";
import { generateChangelog } from "@/lib/steps/generate-changelog";
import { getGitHubToken } from "@/lib/steps/get-github-token";
import { hasUncommittedChanges } from "@/lib/steps/has-uncommitted-changes";
import { installDependencies } from "@/lib/steps/install-dependencies";
import { recordBillingUsage } from "@/lib/steps/record-billing-usage";
import { runClaudeCode } from "@/lib/steps/run-claude-code";
import { stopSandbox } from "@/lib/steps/stop-sandbox";
import { trackCost } from "@/lib/steps/track-cost";
import type { LintRepoParams, LintStepResult } from "@/lib/steps/types";
import { updateLintRun } from "@/lib/steps/update-lint-run";
import { sendSlackMessage } from "@/lib/slack";
import { FatalError } from "workflow";

export type { LintRepoParams } from "@/lib/steps/types";

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex workflow
export async function lintRepoWorkflow(
  params: LintRepoParams
): Promise<void> {
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
  const lintRunId = await createLintRun(organizationId, repoId);

  // Check if we have push access before doing any work
  const pushAccess = await checkPushAccess(
    installationId,
    repoFullName,
    defaultBranch
  );

  if (!pushAccess.canPush) {
    await updateLintRun(lintRunId, {
      status: "FAILED",
      errorMessage: pushAccess.reason,
      completedAt: new Date(),
    });

    // No point retrying - push access won't change
    throw new FatalError(pushAccess.reason ?? "Push access denied");
  }

  // Check if there's already an open PR from Ultracite
  const existingPR = await checkExistingPR(installationId, repoFullName);

  if (existingPR.hasExistingPR) {
    await updateLintRun(lintRunId, {
      status: "SKIPPED",
      completedAt: new Date(),
      prNumber: existingPR.prNumber,
      prUrl: existingPR.prUrl,
    });

    return;
  }

  // Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Create sandbox with the repo (returns sandbox ID for serialization)
  const sandboxId = await createSandbox(repoFullName, token);

  let result: LintStepResult;

  try {
    // Install dependencies
    await installDependencies(sandboxId);

    // Configure git for pushing
    await configureGit(sandboxId, repoFullName, token);

    // Run CLI fixes (auto-fix what we can)
    const fixResult = await fixLint(sandboxId);

    // Only do ONE thing per run: either auto-fix OR AI fix (not both)
    if (fixResult.hasChanges) {
      // Auto-fix made changes - generate changelog and create a PR
      const changelogResult = await generateChangelog(sandboxId);

      const branchName = await createBranch(sandboxId);
      await commitAndPush(
        sandboxId,
        "fix: Auto-fix lint issues\n\nAutomatically fixed by Ultracite",
        branchName
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
      // Extend sandbox timeout by another 3 minutes
      await extendSandbox(sandboxId);

      // Run Claude Code to fix the remaining issues
      const claudeCodeResult = await runClaudeCode(sandboxId);

      // Update lint run with AI cost
      await trackCost(lintRunId, claudeCodeResult.costUsd);

      // Check if Claude Code failed
      if (!claudeCodeResult.success) {
        // AI failures are non-retryable - the model couldn't fix the issue
        throw new FatalError(claudeCodeResult.errorMessage ?? "Claude Code failed");
      }

      if (await hasUncommittedChanges(sandboxId)) {
        // Generate changelog before committing
        const changelogResult = await generateChangelog(sandboxId);

        const branchName = await createBranch(sandboxId);
        await commitAndPush(
          sandboxId,
          "fix: Fix lint issue with Claude Code\n\nAutomatically fixed by Ultracite",
          branchName
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
        // Claude Code ran successfully but made no changes - non-retryable
        throw new FatalError(
          "Claude Code completed but could not fix the lint issues (no changes made)"
        );
      }
    } else {
      // No issues found
      result = { prCreated: false };
    }

    // Record workflow costs to billing system (only on success)
    await recordBillingUsage(lintRunId, stripeCustomerId);

    // Determine the correct status based on the result
    const status = result.prCreated ? "SUCCESS_PR_CREATED" : "SUCCESS_NO_ISSUES";

    await updateLintRun(lintRunId, {
      status,
      completedAt: new Date(),
      prNumber: result.prNumber,
      prUrl: result.prUrl,
    });
  } catch (error) {
    let errorMessage: string;
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    } else if (error && typeof error === "object" && "message" in error) {
      errorMessage = String(error.message);
    } else {
      errorMessage = `Unexpected error: ${JSON.stringify(error)}`;
    }

    await updateLintRun(lintRunId, {
      status: "FAILED",
      completedAt: new Date(),
      errorMessage,
    });

    // Notify Slack about the failure
    await sendSlackMessage(
      `🚨 Lint workflow failed for *${repoFullName}*\n\`\`\`${errorMessage}\`\`\``
    );

    throw error;
  } finally {
    // Final step: Stop sandbox
    await stopSandbox(sandboxId);
  }
}
