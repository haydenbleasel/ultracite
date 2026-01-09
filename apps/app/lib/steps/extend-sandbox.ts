import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

const THREE_MINUTES_MS = 3 * 60 * 1000;

export async function extendSandbox(sandboxId: string): Promise<void> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[extendSandbox] Failed to get sandbox: ${parseError(error)}`
    );
  }

  try {
    await sandbox.extendTimeout(THREE_MINUTES_MS);
  } catch (error) {
    throw new Error(`Failed to extend sandbox timeout: ${parseError(error)}`);
  }
}
