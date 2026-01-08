import { addPRComment } from "@/lib/steps/add-pr-comment";
import { checkPushAccess } from "@/lib/steps/check-push-access";
import { checkoutBranch } from "@/lib/steps/checkout-branch";
import { commitAndPush } from "@/lib/steps/commit-and-push";
import { configureGit } from "@/lib/steps/configure-git";
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
import { updateLintRun } from "@/lib/steps/update-lint-run";

export interface ReviewPRParams {
  installationId: number;
  repoFullName: string;
  prNumber: number;
  prBranch: string;
  baseBranch: string;
  lintRunId: string;
  stripeCustomerId: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Workflow orchestration requires multiple conditional paths
export async function reviewPRWorkflow(
  params: ReviewPRParams
): Promise<void> {
  "use workflow";

  const {
    installationId,
    repoFullName,
    prNumber,
    prBranch,
    lintRunId,
    stripeCustomerId,
  } = params;

  // Check if we have push access before doing any work
  const pushAccess = await checkPushAccess(
    installationId,
    repoFullName,
    prBranch
  );

  if (!pushAccess.canPush) {
    await addPRComment(
      installationId,
      repoFullName,
      prNumber,
      `## Ultracite Review Skipped

Unable to push fixes to this branch: ${pushAccess.reason}

Please ensure the Ultracite app has write access to this repository and branch.

---
*Powered by [Ultracite](https://ultracite.ai)*`
    );

    // Update lint run status as failed
    await updateLintRun(lintRunId, {
      status: "FAILED",
      errorMessage: pushAccess.reason,
      completedAt: new Date(),
      prNumber,
    });

    throw new Error(pushAccess.reason);
  }

  let madeChanges = false;
  const changelogs: string[] = [];

  // Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Create sandbox with the repo (returns sandbox ID for serialization)
  const sandboxId = await createSandbox(repoFullName, token);

  try {
    // Checkout the PR branch
    await checkoutBranch(sandboxId, prBranch);

    // Install dependencies
    await installDependencies(sandboxId);

    // Configure git for pushing
    await configureGit(sandboxId, repoFullName, token);

    // Run ultracite fix (auto-fix what we can)
    const fixResult = await fixLint(sandboxId);

    if (fixResult.hasChanges) {
      // Generate changelog before committing
      const changelogResult = await generateChangelog(sandboxId);

      if (changelogResult.success) {
        changelogs.push(changelogResult.changelog);
      }

      // Commit auto-fix changes
      await commitAndPush(
        sandboxId,
        "fix: auto-fix lint issues\n\nAutomatically fixed by Ultracite"
      );
      madeChanges = true;
    }

    // Check if there are remaining issues (based on exit code from check)
    if (fixResult.hasRemainingIssues) {
      // Extend sandbox timeout by another 3 minutes
      await extendSandbox(sandboxId);

      // Run Claude Code to fix the remaining issues
      const claudeCodeResult = await runClaudeCode(sandboxId);

      // Update lint run with AI cost
      await trackCost(lintRunId, claudeCodeResult.costUsd);

      if (!claudeCodeResult.success) {
        // Claude Code failed - throw to trigger error handling
        throw new Error(
          claudeCodeResult.errorMessage ?? "Claude Code failed to run"
        );
      }

      if (await hasUncommittedChanges(sandboxId)) {
        // Commit any changes from Claude Code fixes
        // Generate changelog before committing
        const changelogResult = await generateChangelog(sandboxId);
        if (changelogResult.success) {
          changelogs.push(changelogResult.changelog);
        }

        await commitAndPush(
          sandboxId,
          "fix: resolve lint issues\n\nAutomatically fixed by Ultracite AI"
        );
        madeChanges = true;
      }
    }

    // Record workflow costs to billing system (only on success)
    await recordBillingUsage(lintRunId, stripeCustomerId);

    // Add a comment to the PR summarizing what was done
    const changelogSection =
      changelogs.length > 0
        ? `\n\n## Changes\n\n${changelogs.join("\n\n")}`
        : "";

    const commentBody = madeChanges
      ? `## Ultracite Review Complete

I've automatically fixed lint issues in this PR.${changelogSection}

---
*Powered by [Ultracite](https://ultracite.ai)*`
      : `## Ultracite Review Complete

No lint issues found in this PR.

---
*Powered by [Ultracite](https://ultracite.ai)*`;

    await addPRComment(installationId, repoFullName, prNumber, commentBody);

    // Update lint run status
    await updateLintRun(lintRunId, {
      status: madeChanges ? "SUCCESS_PR_CREATED" : "SUCCESS_NO_ISSUES",
      completedAt: new Date(),
      prNumber,
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

    // Try to leave a comment about the failure
    try {
      await addPRComment(
        installationId,
        repoFullName,
        prNumber,
        `## Ultracite Review Failed

An error occurred while reviewing this PR:

\`\`\`
${errorMessage}
\`\`\`

---
*Powered by [Ultracite](https://ultracite.ai)*`
      );
    } catch {
      // Ignore comment failure
    }

    // Update lint run status as failed
    await updateLintRun(lintRunId, {
      status: "FAILED",
      completedAt: new Date(),
      prNumber,
      errorMessage,
    });

    throw error;
  } finally {
    // Final step: Stop sandbox
    await stopSandbox(sandboxId);
  }
}
