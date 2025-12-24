import { Sandbox } from "@vercel/sandbox";

export async function createBranchAndPush(
  sandboxId: string,
  branchSuffix: string,
  commitMessage: string
): Promise<string> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  const branchName = `ultracite/fix-${branchSuffix.replace(/\//g, "-")}-${Date.now()}`;

  await sandbox.runCommand("git", ["checkout", "-b", branchName]);
  await sandbox.runCommand("git", [
    "config",
    "user.email",
    "ultracite@users.noreply.github.com",
  ]);
  await sandbox.runCommand("git", ["config", "user.name", "Ultracite"]);
  await sandbox.runCommand("git", ["add", "-A"]);
  await sandbox.runCommand("git", [
    "commit",
    "-m",
    `fix: ${commitMessage}\n\nAutomatically fixed by Ultracite`,
  ]);
  await sandbox.runCommand("git", ["push", "origin", branchName]);

  return branchName;
}
