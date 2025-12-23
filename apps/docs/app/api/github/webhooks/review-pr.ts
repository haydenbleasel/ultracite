import { createReviewPRAgent } from "@/lib/agents/review-pr";
import { createSandbox } from "@/lib/steps/create-sandbox";
import { fixLint } from "@/lib/steps/fix-lint";
import { getGitHubToken } from "@/lib/steps/get-github-token";
import { installDependencies } from "@/lib/steps/install-dependencies";
import { stopSandbox } from "@/lib/steps/stop-sandbox";
import { getInstallationOctokit } from "@/lib/github/app";
import type { Sandbox } from "@vercel/sandbox";

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

async function checkoutPRBranch(sandbox: Sandbox, branch: string) {
  "use step";

  await sandbox.runCommand("git", ["fetch", "origin", branch]);
  await sandbox.runCommand("git", ["checkout", branch]);
}

async function commitAndPush(sandbox: Sandbox, message: string) {
  "use step";

  await sandbox.runCommand("git", [
    "config",
    "user.email",
    "ultracite@users.noreply.github.com",
  ]);
  await sandbox.runCommand("git", ["config", "user.name", "Ultracite"]);
  await sandbox.runCommand("git", ["add", "-A"]);
  await sandbox.runCommand("git", ["commit", "-m", message]);
  await sandbox.runCommand("git", ["push"]);
}

async function hasUncommittedChanges(sandbox: Sandbox): Promise<boolean> {
  "use step";

  const diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
  const diffOutput = await diffResult.stdout();
  return Boolean(diffOutput.trim());
}

async function addReviewComment(
  installationId: number,
  repoFullName: string,
  prNumber: number,
  body: string
) {
  "use step";

  const octokit = await getInstallationOctokit(installationId);
  const [owner, repo] = repoFullName.split("/");

  await octokit.request(
    "POST /repos/{owner}/{repo}/issues/{issue_number}/comments",
    {
      owner,
      repo,
      issue_number: prNumber,
      body,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );
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
    await checkoutPRBranch(sandbox, prBranch);

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

    // Step 6: Use the agent to iteratively fix remaining issues
    const { agent, getFixCount } = createReviewPRAgent(sandbox);

    await agent.generate({
      prompt: `Check for remaining lint issues in the codebase and fix them iteratively.

Start by running checkLint to see if there are any issues.
If there are issues, read the file mentioned in the error, fix the issue, and write the corrected file.
Then check again to verify the fix worked and look for more issues.
Continue until all issues are fixed or you've made multiple attempts at the same issue.

Important: Only fix real lint errors shown in the output. Don't modify files unnecessarily.`,
    });

    fixesApplied += getFixCount();

    // Commit any remaining changes from agent fixes
    if (await hasUncommittedChanges(sandbox)) {
      await commitAndPush(
        sandbox,
        "fix: resolve lint issues\n\nAutomatically fixed by Ultracite AI"
      );
    }

    // Add a comment to the PR summarizing what was done
    if (fixesApplied > 0) {
      await addReviewComment(
        installationId,
        repoFullName,
        prNumber,
        `## Ultracite Review Complete

I've automatically fixed **${fixesApplied}** lint issue${fixesApplied === 1 ? "" : "s"} in this PR.

Changes have been pushed to this branch. Please review the commits.

---
*Powered by [Ultracite](https://ultracite.ai)*`
      );
    } else {
      await addReviewComment(
        installationId,
        repoFullName,
        prNumber,
        `## Ultracite Review Complete

No lint issues found in this PR.

---
*Powered by [Ultracite](https://ultracite.ai)*`
      );
    }

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
      await addReviewComment(
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
