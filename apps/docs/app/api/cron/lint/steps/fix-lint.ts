import type { Sandbox } from "@vercel/sandbox";

export async function fixLint(sandbox: Sandbox): Promise<void> {
  "use step";

  await sandbox.runCommand("npx", ["ultracite", "fix"]);
}
