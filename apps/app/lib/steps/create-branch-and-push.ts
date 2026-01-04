import { Sandbox } from "@vercel/sandbox";
import { nanoid } from "nanoid";

export async function createBranchAndPush(
  sandboxId: string,
  commitMessage: string
): Promise<string> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  const branchName = `ultracite/fix-${nanoid()}`;

  const checkoutResult = await sandbox.runCommand("git", [
    "checkout",
    "-b",
    branchName,
  ]);

  if (checkoutResult.exitCode !== 0) {
    const output = await checkoutResult.output("both");
    throw new Error(`Failed to create branch: ${output}`);
  }

  await sandbox.runCommand("git", ["add", "-A"]);

  const commitResult = await sandbox.runCommand("git", [
    "commit",
    "-m",
    `fix: ${commitMessage}\n\nAutomatically fixed by Ultracite`,
  ]);

  if (commitResult.exitCode !== 0) {
    const output = await commitResult.output("both");
    throw new Error(`Failed to commit: ${output}`);
  }

  const pushResult = await sandbox.runCommand("git", [
    "push",
    "origin",
    branchName,
  ]);

  if (pushResult.exitCode !== 0) {
    const output = await pushResult.output("both");
    throw new Error(`Failed to push branch: ${output}`);
  }

  return branchName;
}
