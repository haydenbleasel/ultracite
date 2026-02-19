import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";
import { env } from "../env";

export interface ClaudeCodeResult {
  costUsd: number;
  errorMessage?: string;
  output: string;
  success: boolean;
}

const prompt = `You are fixing lint issues in a codebase.

Run "npx ultracite check" to see the current lint errors, then fix them one by one.

After each fix, run "npx ultracite check" again to verify the fix worked and check for remaining issues.

Stop when you have fixed 15 issues OR all issues are resolved, whichever comes first.

Important:
- Only fix SIMPLE issues (unused variables, missing semicolons, import ordering, formatting, simple type fixes, etc.)
- SKIP complex issues that require architectural changes, major refactoring, or deep domain knowledge
- If an issue would require changing more than ~10 lines or multiple files, skip it
- Don't modify files unnecessarily
- Don't attempt the same issue more than twice - move on if you can't fix it easily`;

export async function runClaudeCode(
  sandboxId: string
): Promise<ClaudeCodeResult> {
  "use step";

  // Get the sandbox
  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[runClaudeCode] Failed to get sandbox: ${parseError(error)}`
    );
  }

  // Escape values for shell usage (single quotes prevent shell interpretation)
  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const escapedApiKey = env.VERCEL_AI_GATEWAY_API_KEY.replace(/'/g, "'\\''");

  // Run claude with Vercel AI Gateway env vars set inline
  const result = await sandbox
    .runCommand("sh", [
      "-c",
      `ANTHROPIC_BASE_URL='https://ai-gateway.vercel.sh' ANTHROPIC_AUTH_TOKEN='${escapedApiKey}' ANTHROPIC_API_KEY='' claude -p '${escapedPrompt}' --dangerously-skip-permissions --model claude-haiku-4-5 --max-turns 30 --output-format json`,
    ])
    .catch((error: unknown) => {
      throw new Error(`Failed to run Claude Code: ${parseError(error)}`);
    });

  // Get the output
  const output = await result.output("both");

  // If the command failed, return an error
  if (result.exitCode !== 0) {
    return {
      costUsd: 0,
      success: false,
      output,
      errorMessage: `Claude Code exited with code ${result.exitCode}`,
    };
  }

  // Parse the output as JSON
  try {
    const parsed = JSON.parse(output) as {
      total_cost_usd: number;
    };

    // Return the cost and success
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
