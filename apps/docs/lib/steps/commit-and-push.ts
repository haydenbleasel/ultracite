import { Sandbox } from "@vercel/sandbox";

export async function commitAndPush(
  sandboxId: string,
  message: string
): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.runCommand("git", [
    "config",
    "user.email",
    "ultracite@users.noreply.github.com",
  ]);
  await sandbox.runCommand("git", ["config", "user.name", "Ultracite"]);
  await sandbox.runCommand("git", ["add", "-A"]);
  await sandbox.runCommand("git", ["commit", "-m", message]);
  await sandbox.runCommand("git", ["push"]);
}
