import { Sandbox } from "@vercel/sandbox";

import { parseError } from "@/lib/error";

export interface FixLintResult {
  output: string;
  hasChanges: boolean;
  hasRemainingIssues: boolean;
}

export async function fixLint(sandboxId: string): Promise<FixLintResult> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(`[fixLint] Failed to get sandbox: ${parseError(error)}`, {
      cause: error,
    });
  }

  let result;

  try {
    result = await sandbox.runCommand("nlx", ["ultracite", "fix"]);
  } catch (error) {
    throw new Error(`Failed to run ultracite fix: ${parseError(error)}`, {
      cause: error,
    });
  }

  const output = await result.output("both");

  // Check if there are uncommitted changes
  let diffResult;

  try {
    diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
  } catch (error) {
    throw new Error(
      `[fixLint] Failed to check git diff: ${parseError(error)}`,
      { cause: error }
    );
  }

  const diffOutput = await diffResult.stdout();
  const hasChanges = Boolean(diffOutput.trim());

  // Run check to see if there are remaining issues (non-zero exit = issues remain)
  let checkResult;

  try {
    checkResult = await sandbox.runCommand("nlx", ["ultracite", "check"]);
  } catch (error) {
    throw new Error(`Failed to run ultracite check: ${parseError(error)}`, {
      cause: error,
    });
  }

  const hasRemainingIssues = checkResult.exitCode !== 0;

  return { hasChanges, hasRemainingIssues, output };
}
