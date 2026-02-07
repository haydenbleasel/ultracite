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
      `[hasUncommittedChanges] Failed to get sandbox: ${parseError(error)}`
    );
  }

  const diffResult = await sandbox
    .runCommand("git", ["diff", "--name-only"])
    .catch((error: unknown) => {
      throw new Error(
        `[hasUncommittedChanges] Failed to check git diff: ${parseError(error)}`
      );
    });

  const diffOutput = await diffResult.stdout();

  return Boolean(diffOutput.trim());
}
