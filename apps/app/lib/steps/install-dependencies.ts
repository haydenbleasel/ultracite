import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

export async function installDependencies(sandboxId: string): Promise<void> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[installDependencies] Failed to get sandbox: ${parseError(error)}`
    );
  }

  // Global tools (ni, claude-code, package managers) are pre-installed
  // in the sandbox snapshot. Only project dependencies need installing.
  try {
    await sandbox.runCommand("ni", []);
  } catch (error) {
    throw new Error(
      `Failed to install project dependencies: ${parseError(error)}`
    );
  }
}
