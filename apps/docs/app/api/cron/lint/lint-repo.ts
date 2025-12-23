import { applyLLMFix } from "./steps/apply-llm-fix";
import { createBranchAndPush } from "./steps/create-branch-and-push";
import { createLintRun } from "./steps/create-lint-run";
import { createPullRequest } from "./steps/create-pr";
import { createSandbox } from "./steps/create-sandbox";
import { fixLint } from "./steps/fix-lint";
import { generateLLMFix } from "./steps/generate-llm-fix";
import { getGitHubToken } from "./steps/get-github-token";
import { installDependencies } from "./steps/install-dependencies";
import { parseLintIssue } from "./steps/parse-lint-issue";
import { stopSandbox } from "./steps/stop-sandbox";
import type {
  LintRepoParams,
  LintRepoResult,
  LintStepResult,
} from "./steps/types";
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

    // Step 5: Run ultracite fix
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
    } else {
      // No auto-fix changes, try LLM fix for remaining issues
      // Step 6b: Parse the first lint issue
      const issue = await parseLintIssue(sandbox);

      if (issue) {
        // Step 7b: Generate LLM fix
        const llmFix = await generateLLMFix(issue);

        // Step 8b: Apply the LLM fix to the codebase
        await applyLLMFix(sandbox, issue.file, llmFix.fixedContent);

        // Step 9b: Create branch and push (LLM fix)
        const branchName = await createBranchAndPush(
          sandbox,
          issue.file.replace(/[/.]/g, "-"),
          llmFix.title
        );

        // Step 10b: Create pull request (LLM fix)
        const prResult = await createPullRequest({
          installationId,
          repoFullName,
          defaultBranch,
          branchName,
          title: llmFix.title,
          file: issue.file,
          isLLMFix: true,
        });

        result = {
          issuesFound: 1,
          issueFixed: llmFix.title,
          prCreated: true,
          prNumber: prResult.prNumber,
          prUrl: prResult.prUrl,
        };
      } else {
        // No issues found, we're done
        result = { issuesFound: 0, prCreated: false };
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
