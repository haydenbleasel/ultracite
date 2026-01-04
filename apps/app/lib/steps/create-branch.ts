import { Sandbox } from "@vercel/sandbox";
import { nanoid } from "nanoid";

export async function createBranch(sandboxId: string): Promise<string> {
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

  return branchName;
}
