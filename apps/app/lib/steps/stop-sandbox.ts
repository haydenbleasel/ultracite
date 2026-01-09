import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

export async function stopSandbox(sandboxId: string): Promise<void> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[stopSandbox] Failed to get sandbox: ${parseError(error)}`
    );
  }

  try {
    await sandbox.stop();
  } catch (error) {
    throw new Error(`Failed to stop sandbox: ${parseError(error)}`);
  }
}
