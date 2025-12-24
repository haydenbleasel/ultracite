import type { Sandbox } from "@vercel/sandbox";

export async function hasUncommittedChanges(
  sandbox: Sandbox
): Promise<boolean> {
  "use step";

  const diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
  const diffOutput = await diffResult.stdout();

  return Boolean(diffOutput.trim());
}
