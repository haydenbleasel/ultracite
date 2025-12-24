import type { Sandbox } from "@vercel/sandbox";

export interface ClaudeCodeResult {
  output: string;
  success: boolean;
}

const prompt = `You are fixing lint issues in a codebase. Run "npx ultracite check" to see the current lint errors, then fix them one by one.

After each fix, run "npx ultracite check" again to verify the fix worked and check for remaining issues.

Continue until all lint issues are resolved or you've made multiple attempts at the same issue.

Important:
- Only fix real lint errors shown in the output
- Don't modify files unnecessarily
- Preserve the existing code style`;

export async function runClaudeCode(
  sandbox: Sandbox
): Promise<ClaudeCodeResult> {
  "use step";

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set");
  }

  // Escape the prompt for shell usage
  const escapedPrompt = prompt.replace(/'/g, "'\\''");

  // Run claude with the API key set inline
  const result = await sandbox.runCommand("sh", [
    "-c",
    `ANTHROPIC_API_KEY='${apiKey}' claude -p '${escapedPrompt}' --model claude-haiku-4-5`,
    "--dangerously-skip-permissions",
    "--fallback-model",
    "claude-sonnet-4-5",
    "--max-turns",
    "30",
  ]);

  const output = await result.output("both");
  const success = result.exitCode === 0;

  return { output, success };
}
