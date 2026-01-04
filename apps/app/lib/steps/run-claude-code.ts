import { Sandbox } from "@vercel/sandbox";

export interface ClaudeCodeResult {
  costUsd: number;
  success: boolean;
  output: string;
  errorMessage?: string;
}

const prompt = `You are fixing lint issues in a codebase.

Run "npx ultracite check" to see the current lint errors, then fix them one by one.

After each fix, run "npx ultracite check" again to verify the fix worked and check for remaining issues.

Continue until all lint issues are resolved or you've made multiple attempts at the same issue.

Important:
- Only fix real lint errors shown in the output
- Don't modify files unnecessarily`;

export async function runClaudeCode(
  sandboxId: string
): Promise<ClaudeCodeResult> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      costUsd: 0,
      success: false,
      output: "",
      errorMessage: "ANTHROPIC_API_KEY is not set",
    };
  }

  // Escape the prompt for shell usage
  const escapedPrompt = prompt.replace(/'/g, "'\\''");

  // Run claude with the API key set inline
  const result = await sandbox.runCommand("sh", [
    "-c",
    `ANTHROPIC_API_KEY='${apiKey}' claude -p '${escapedPrompt}' --dangerously-skip-permissions --model claude-haiku-4-5 --max-turns 30 --output-format json`,
  ]);

  const output = await result.output("both");

  if (result.exitCode !== 0) {
    return {
      costUsd: 0,
      success: false,
      output,
      errorMessage: `Claude Code exited with code ${result.exitCode}`,
    };
  }

  try {
    const parsed = JSON.parse(output) as {
      total_cost_usd: number;
    };

    return {
      costUsd: parsed.total_cost_usd,
      success: true,
      output,
    };
  } catch {
    return {
      costUsd: 0,
      success: false,
      output,
      errorMessage: "Failed to parse Claude Code output as JSON",
    };
  }
}
