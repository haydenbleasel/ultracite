import { Sandbox } from "@vercel/sandbox";

export async function checkoutBranch(
  sandboxId: string,
  branch: string
): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.runCommand("git", ["fetch", "origin", branch]);
  await sandbox.runCommand("git", ["checkout", branch]);
}
