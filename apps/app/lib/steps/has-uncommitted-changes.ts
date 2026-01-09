import { Sandbox } from "@vercel/sandbox";

import { parseError } from "@/lib/error";

export async function hasUncommittedChanges(
  sandboxId: string
): Promise<boolean> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[hasUncommittedChanges] Failed to get sandbox: ${parseError(error)}`,
      { cause: error }
    );
  }

  let diffResult;

  try {
    diffResult = await sandbox.runCommand("git", ["diff", "--name-only"]);
  } catch (error) {
    throw new Error(
      `[hasUncommittedChanges] Failed to check git diff: ${parseError(error)}`,
      { cause: error }
    );
  }

  const diffOutput = await diffResult.stdout();

  return Boolean(diffOutput.trim());
}
