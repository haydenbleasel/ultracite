import type { Sandbox } from "@vercel/sandbox";

export async function installClaudeCode(sandbox: Sandbox): Promise<void> {
  "use step";

  await sandbox.runCommand("npm", [
    "install",
    "-g",
    "@anthropic-ai/claude-code",
  ]);
}
