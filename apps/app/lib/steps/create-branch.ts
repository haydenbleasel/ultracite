import { Sandbox } from "@vercel/sandbox";
import { nanoid } from "nanoid";
import { parseError } from "@/lib/error";

export async function createBranch(sandboxId: string): Promise<string> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[createBranch] Failed to get sandbox: ${parseError(error)}`
    );
  }

  const branchName = `ultracite/fix-${nanoid()}`;

  const checkoutResult = await sandbox
    .runCommand("git", ["checkout", "-b", branchName])
    .catch((error: unknown) => {
      throw new Error(`Failed to create branch: ${parseError(error)}`);
    });

  if (checkoutResult.exitCode !== 0) {
    const output = await checkoutResult.output("both");
    throw new Error(
      `Failed to create branch with exit code ${checkoutResult.exitCode}: ${output.trim()}`
    );
  }

  return branchName;
}
