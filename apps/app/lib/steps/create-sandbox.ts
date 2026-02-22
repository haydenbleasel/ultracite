import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function createSandbox(): Promise<string> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.create({
      source: {
        type: "snapshot",
        snapshotId: "snap_C7bRk0eKocK3L8QqZsNIz54Cwwk7",
      },
      timeout: FIVE_MINUTES_MS,
    });
  } catch (error) {
    throw new Error(`Failed to create sandbox: ${parseError(error)}`);
  }

  // Return only the ID (serializable) instead of the Sandbox instance
  return sandbox.sandboxId;
}
