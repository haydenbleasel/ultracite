import { Sandbox } from "@vercel/sandbox";
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

  const sandbox = await Sandbox.get({ sandboxId });

  const escapedPrompt = prompt.replace(/'/g, "'\\''");

  // Run claude with Vercel AI Gateway env vars set inline
  const result = await sandbox.runCommand("sh", [
    "-c",
    `ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh" ANTHROPIC_AUTH_TOKEN="${env.VERCEL_AI_GATEWAY_API_KEY}" ANTHROPIC_API_KEY="" claude -p '${escapedPrompt}' --dangerously-skip-permissions --model claude-haiku-4-5 --max-turns 5`,
  ]);

  const output = await result.output("both");
  const success = result.exitCode === 0;

  // Extract the changelog from Claude's output (skip any preamble)
  const changelog = output.trim();

  return { changelog, success };
}
