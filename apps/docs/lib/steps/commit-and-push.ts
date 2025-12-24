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

  const commitResult = await sandbox.runCommand("git", ["commit", "-m", message]);
  
  if (commitResult.exitCode !== 0) {
    const output = await commitResult.output("both");
    throw new Error(`Failed to commit: ${output}`);
  }

  const pushResult = await sandbox.runCommand("git", ["push"]);
  
  if (pushResult.exitCode !== 0) {
    const output = await pushResult.output("both");
    throw new Error(`Failed to push: ${output}`);
  }
}
