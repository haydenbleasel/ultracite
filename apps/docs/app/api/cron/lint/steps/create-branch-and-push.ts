import type { Sandbox } from "@vercel/sandbox";

export async function createBranchAndPush(
  sandbox: Sandbox,
  rule: string
): Promise<string> {
  "use step";

  const branchName = `ultracite/fix-${rule.replace(/\//g, "-")}-${Date.now()}`;

  await sandbox.runCommand("git", ["checkout", "-b", branchName]);
  await sandbox.runCommand("git", [
    "config",
    "user.email",
    "ultracite@users.noreply.github.com",
  ]);
  await sandbox.runCommand("git", ["config", "user.name", "Ultracite Bot"]);
  await sandbox.runCommand("git", ["add", "-A"]);
  await sandbox.runCommand("git", [
    "commit",
    "-m",
    `fix: ${rule} lint issue\n\nAutomatically fixed by Ultracite`,
  ]);
  await sandbox.runCommand("git", ["push", "origin", branchName]);

  return branchName;
}
