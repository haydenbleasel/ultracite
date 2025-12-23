import type { Sandbox } from "@vercel/sandbox";

export interface FixLintResult {
  output: string;
  hasChanges: boolean;
}

export async function fixLint(sandbox: Sandbox): Promise<FixLintResult> {
  "use step";

  const result = await sandbox.runCommand("npx", ["ultracite", "fix"]);
  const output = await result.output("both");

  // Check if there are uncommitted changes
  const diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
  const diffOutput = await diffResult.stdout();
  const hasChanges = Boolean(diffOutput.trim());

  return { output, hasChanges };
}
