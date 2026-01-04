import { Sandbox } from "@vercel/sandbox";

export async function commitAndPush(
  sandboxId: string,
  message: string,
  branchName?: string
): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  await sandbox.runCommand("git", ["add", "-A"]);

  const commitResult = await sandbox.runCommand("git", [
    "commit",
    "--no-verify",
    "-m",
    message,
  ]);

  if (commitResult.exitCode !== 0) {
    const output = await commitResult.output("both");
    throw new Error(`Failed to commit: ${output}`);
  }

  const pushArgs = branchName ? ["push", "origin", branchName] : ["push"];
  const pushResult = await sandbox.runCommand("git", pushArgs);

  if (pushResult.exitCode !== 0) {
    const output = await pushResult.output("both");
    throw new Error(`Failed to push: ${output}`);
  }
}
