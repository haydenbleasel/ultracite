import { Sandbox } from "@vercel/sandbox";

export async function installClaudeCode(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.runCommand("npm", [
    "install",
    "-g",
    "@anthropic-ai/claude-code",
  ]);
}
