import { type CommandFinished, Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

export async function commitAndPush(
  sandboxId: string,
  message: string,
  branchName?: string
): Promise<void> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[commitAndPush] Failed to get sandbox: ${parseError(error)}`
    );
  }

  try {
    await sandbox.runCommand("git", ["add", "-A"]);
  } catch (error) {
    throw new Error(`Failed to add changes: ${parseError(error)}`);
  }

  let commitResult: CommandFinished | null = null;

  try {
    commitResult = await sandbox.runCommand("git", [
      "commit",
      "--no-verify",
      "-m",
      message,
    ]);
  } catch (error) {
    throw new Error(`Failed to commit: ${parseError(error)}`);
  }

  if (commitResult.exitCode !== 0) {
    const output = await commitResult.output("both");
    throw new Error(
      `Commit failed with exit code ${commitResult.exitCode}: ${output.trim()}`
    );
  }

  const pushArgs = branchName ? ["push", "origin", branchName] : ["push"];

  let pushResult: CommandFinished | null = null;

  try {
    pushResult = await sandbox.runCommand("git", pushArgs);
  } catch (error) {
    throw new Error(`Failed to run git push: ${parseError(error)}`);
  }

  if (pushResult.exitCode !== 0) {
    const output = await pushResult.output("both");
    throw new Error(
      `Git push failed with exit code ${pushResult.exitCode}: ${output.trim()}`
    );
  }
}
