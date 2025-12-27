import { Sandbox } from "@vercel/sandbox";

export async function hasUncommittedChanges(
  sandboxId: string
): Promise<boolean> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  const diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
  const diffOutput = await diffResult.stdout();

  return Boolean(diffOutput.trim());
}
