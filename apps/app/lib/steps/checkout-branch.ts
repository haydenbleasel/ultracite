import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

export async function checkoutBranch(
  sandboxId: string,
  branch: string
): Promise<void> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[checkoutBranch] Failed to get sandbox: ${parseError(error)}`
    );
  }

  try {
    await sandbox.runCommand("git", ["fetch", "origin", branch]);
  } catch (error) {
    throw new Error(`Failed to fetch branch "${branch}": ${parseError(error)}`);
  }

  try {
    await sandbox.runCommand("git", ["checkout", branch]);
  } catch (error) {
    throw new Error(
      `Failed to checkout branch "${branch}": ${parseError(error)}`
    );
  }
}
