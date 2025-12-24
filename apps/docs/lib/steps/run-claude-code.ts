import type { Sandbox } from "@vercel/sandbox";

export interface ClaudeCodeResult {
  output: string;
  success: boolean;
}

export async function runClaudeCode(
  sandbox: Sandbox,
  prompt: string
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
    `ANTHROPIC_API_KEY='${apiKey}' claude -p '${escapedPrompt}' --dangerously-skip-permissions --model claude-haiku-4-5 --max-turns 30`,
  ]);

  const output = await result.output("both");
  const success = result.exitCode === 0;

  return { output, success };
}
