import { addPRComment } from "@/lib/steps/add-pr-comment";
import { checkPushAccess } from "@/lib/steps/check-push-access";
import { checkoutBranch } from "@/lib/steps/checkout-branch";
import { commitAndPush } from "@/lib/steps/commit-and-push";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { fixLint } from "@/lib/steps/fix-lint";
import { generateChangelog } from "@/lib/steps/generate-changelog";
import { getGitHubToken } from "@/lib/steps/get-github-token";
import { hasUncommittedChanges } from "@/lib/steps/has-uncommitted-changes";
import { installClaudeCode } from "@/lib/steps/install-claude-code";
import { installDependencies } from "@/lib/steps/install-dependencies";
import { runClaudeCode } from "@/lib/steps/run-claude-code";
import { stopSandbox } from "@/lib/steps/stop-sandbox";
import { updateLintRun } from "@/lib/steps/update-lint-run";

export interface ReviewPRParams {
  installationId: number;
  repoFullName: string;
  prNumber: number;
  prBranch: string;
  baseBranch: string;
  lintRunId: string;
}

export interface ReviewPRResult {
  repo: string;
  prNumber: number;
  status: "success" | "no_issues" | "error";
  error?: string;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Workflow orchestration requires multiple conditional paths
export async function reviewPRWorkflow(
  params: ReviewPRParams
): Promise<ReviewPRResult> {
  "use workflow";

  const { installationId, repoFullName, prNumber, prBranch, lintRunId } =
    params;

  // Step 1: Check if we have push access before doing any work
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
      prCreated: false,
      issuesFound: 0,
      prNumber,
      error: pushAccess.reason,
    });

    return {
      repo: repoFullName,
      prNumber,
      status: "error",
      error: pushAccess.reason,
    };
  }

  let madeChanges = false;
  const changelogs: string[] = [];

  // Step 2: Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Step 3: Create sandbox with the repo (returns sandbox ID for serialization)
  const sandboxId = await createSandbox(repoFullName, token);

  try {
    // Step 4: Checkout the PR branch
    await checkoutBranch(sandboxId, prBranch);

    // Step 5: Install dependencies
    await installDependencies(sandboxId);

    // Step 6: Run ultracite fix (auto-fix what we can)
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
        "fix: auto-fix lint issues\n\nAutomatically fixed by Ultracite",
        repoFullName,
        token
      );
      madeChanges = true;
    }

    // Step 7: Check if there are remaining issues (based on exit code from check)
    if (fixResult.hasRemainingIssues) {
      // Step 8: Install Claude Code CLI
      await installClaudeCode(sandboxId);

      // Step 9: Use Claude Code to fix remaining issues iteratively
      const claudeCodeResult = await runClaudeCode(sandboxId);

      // TODO: Record Claude Code costs to billing system
      // await recordBillingUsage({
      //   installationId,
      //   costUsd: claudeCodeResult.costUsd,
      //   type: 'claude-code',
      //   context: { repoFullName, prNumber },
      // });

      // Commit any changes from Claude Code fixes
      if (await hasUncommittedChanges(sandboxId)) {
        // Generate changelog before committing
        const changelogResult = await generateChangelog(sandboxId);
        if (changelogResult.success) {
          changelogs.push(changelogResult.changelog);
        }

        await commitAndPush(
          sandboxId,
          "fix: resolve lint issues\n\nAutomatically fixed by Ultracite AI",
          repoFullName,
          token
        );
        madeChanges = true;
      }
    }

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
      prCreated: madeChanges,
      issuesFound: 0,
      prNumber,
    });

    return {
      repo: repoFullName,
      prNumber,
      status: madeChanges ? "success" : "no_issues",
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

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
      prCreated: false,
      issuesFound: 0,
      prNumber,
      error: errorMessage,
    });

    return {
      repo: repoFullName,
      prNumber,
      status: "error",
      error: errorMessage,
    };
  } finally {
    // Final step: Stop sandbox
    await stopSandbox(sandboxId);
  }
}
