import type { Sandbox } from "@vercel/sandbox";

export interface FixLintResult {
  output: string;
  hasChanges: boolean;
  hasRemainingIssues: boolean;
}

export async function fixLint(sandbox: Sandbox): Promise<FixLintResult> {
  "use step";

  const result = await sandbox.runCommand("npx", ["ultracite", "fix"]);
  const output = await result.output("both");

  // Check if there are uncommitted changes
  const diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
  const diffOutput = await diffResult.stdout();
  const hasChanges = Boolean(diffOutput.trim());

  // Run check to see if there are remaining issues (non-zero exit = issues remain)
  const checkResult = await sandbox.runCommand("npx", ["ultracite", "check"]);
  const hasRemainingIssues = checkResult.exitCode !== 0;

  return { output, hasChanges, hasRemainingIssues };
}
