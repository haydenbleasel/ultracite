import { addPRComment } from "@/lib/steps/add-pr-comment";
import { checkPushAccess } from "@/lib/steps/check-push-access";
import { checkoutBranch } from "@/lib/steps/checkout-branch";
import { commitAndPush } from "@/lib/steps/commit-and-push";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { fixLint } from "@/lib/steps/fix-lint";
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

  // Step 2: Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Step 3: Create sandbox with the repo
  const sandbox = await createSandbox(repoFullName, token);

  try {
    // Step 4: Checkout the PR branch
    await checkoutBranch(sandbox, prBranch);

    // Step 5: Install dependencies
    await installDependencies(sandbox);

    // Step 6: Run ultracite fix (auto-fix what we can)
    const fixResult = await fixLint(sandbox);

    if (fixResult.hasChanges) {
      // Commit auto-fix changes
      await commitAndPush(
        sandbox,
        "fix: auto-fix lint issues\n\nAutomatically fixed by Ultracite"
      );
      madeChanges = true;
    }

    // Step 7: Check if there are remaining issues (based on exit code from check)
    if (fixResult.hasRemainingIssues) {
      // Step 8: Install Claude Code CLI
      await installClaudeCode(sandbox);

      // Step 9: Use Claude Code to fix remaining issues iteratively
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

      // Commit any changes from Claude Code fixes
      if (await hasUncommittedChanges(sandbox)) {
        await commitAndPush(
          sandbox,
          "fix: resolve lint issues\n\nAutomatically fixed by Ultracite AI"
        );
        madeChanges = true;
      }
    }

    // Add a comment to the PR summarizing what was done
    const commentBody = madeChanges
      ? `## Ultracite Review Complete

I've automatically fixed lint issues in this PR.

Changes have been pushed to this branch. Please review the commits.

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
    await stopSandbox(sandbox);
  }
}
