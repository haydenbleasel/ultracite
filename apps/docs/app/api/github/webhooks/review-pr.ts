import { addPRComment } from "@/lib/steps/add-pr-comment";
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

export interface ReviewPRParams {
  installationId: number;
  repoFullName: string;
  prNumber: number;
  prBranch: string;
  baseBranch: string;
}

export interface ReviewPRResult {
  repo: string;
  prNumber: number;
  status: "success" | "no_issues" | "error";
  fixesApplied: number;
  error?: string;
}

export async function reviewPRWorkflow(
  params: ReviewPRParams
): Promise<ReviewPRResult> {
  "use workflow";

  const { installationId, repoFullName, prNumber, prBranch } = params;

  let fixesApplied = 0;

  // Step 1: Get GitHub access token
  const token = await getGitHubToken(installationId);

  // Step 2: Create sandbox with the repo
  const sandbox = await createSandbox(repoFullName, token);

  try {
    // Step 3: Checkout the PR branch
    await checkoutBranch(sandbox, prBranch);

    // Step 4: Install dependencies
    await installDependencies(sandbox);

    // Step 5: Run ultracite fix (auto-fix what we can)
    const fixResult = await fixLint(sandbox);

    if (fixResult.hasChanges) {
      // Commit auto-fix changes
      await commitAndPush(
        sandbox,
        "fix: auto-fix lint issues\n\nAutomatically fixed by Ultracite"
      );
      fixesApplied++;
    }

    // Step 6: Check if there are remaining issues
    const hasRemainingIssues =
      fixResult.output.includes("error") ||
      fixResult.output.includes("warning");

    if (hasRemainingIssues) {
      // Step 7: Install Claude Code CLI
      await installClaudeCode(sandbox);

      // Step 8: Use Claude Code to fix remaining issues iteratively
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
        fixesApplied++;
      }
    }

    // Add a comment to the PR summarizing what was done
    const commentBody =
      fixesApplied > 0
        ? `## Ultracite Review Complete

I've automatically fixed **${fixesApplied}** lint issue${fixesApplied === 1 ? "" : "s"} in this PR.

Changes have been pushed to this branch. Please review the commits.

---
*Powered by [Ultracite](https://ultracite.ai)*`
        : `## Ultracite Review Complete

No lint issues found in this PR.

---
*Powered by [Ultracite](https://ultracite.ai)*`;

    await addPRComment(installationId, repoFullName, prNumber, commentBody);

    return {
      repo: repoFullName,
      prNumber,
      status: fixesApplied > 0 ? "success" : "no_issues",
      fixesApplied,
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

    return {
      repo: repoFullName,
      prNumber,
      status: "error",
      fixesApplied,
      error: errorMessage,
    };
  } finally {
    // Final step: Stop sandbox
    await stopSandbox(sandbox);
  }
}
