import type { Sandbox } from "@vercel/sandbox";

export async function checkoutBranch(
  sandbox: Sandbox,
  branch: string
): Promise<void> {
  "use step";

  await sandbox.runCommand("git", ["fetch", "origin", branch]);
  await sandbox.runCommand("git", ["checkout", branch]);
}
