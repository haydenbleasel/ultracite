import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";
import { env } from "../env";

export interface ChangelogResult {
  changelog: string;
  success: boolean;
}

const prompt = `Generate a concise changelog for a pull request based on the uncommitted changes.

First, run "git diff" to see the changes, then write a clear, professional changelog.

Format your response as markdown with:
- A brief summary (1-2 sentences) of what changed
- A bullet list of specific changes

Keep it concise and focus on what was fixed/changed, not implementation details.
Only output the changelog content, nothing else.`;

export async function generateChangelog(
  sandboxId: string
): Promise<ChangelogResult> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[generateChangelog] Failed to get sandbox: ${parseError(error)}`
    );
  }

  // Escape values for shell usage (single quotes prevent shell interpretation)
  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const escapedApiKey = env.VERCEL_AI_GATEWAY_API_KEY.replace(/'/g, "'\\''");

  // Run claude with Vercel AI Gateway env vars set inline
  let result;

  try {
    result = await sandbox.runCommand("sh", [
      "-c",
      `ANTHROPIC_BASE_URL='https://ai-gateway.vercel.sh' ANTHROPIC_AUTH_TOKEN='${escapedApiKey}' ANTHROPIC_API_KEY='' claude -p '${escapedPrompt}' --dangerously-skip-permissions --model claude-haiku-4-5 --max-turns 5`,
    ]);
  } catch (error) {
    throw new Error(`Failed to run Claude for changelog: ${parseError(error)}`);
  }

  const output = await result.output("both");
  const success = result.exitCode === 0;

  // Extract the changelog from Claude's output (skip any preamble)
  const changelog = output.trim();

  return { changelog, success };
}
