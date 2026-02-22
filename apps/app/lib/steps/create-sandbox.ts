import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function createSandbox(
  repoFullName: string,
  token: string
): Promise<string> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.create({
      source: {
        type: "snapshot",
        snapshotId: "snap_lDLlUFqp4PIxsAZHuueOTgvETX9N",
      },
      timeout: FIVE_MINUTES_MS,
    });

    await sandbox.runCommand("git", [
      "clone",
      "--depth",
      "1",
      `https://x-access-token:${token}@github.com/${repoFullName}`,
    ]);
  } catch (error) {
    throw new Error(`Failed to create sandbox: ${parseError(error)}`);
  }

  // Return only the ID (serializable) instead of the Sandbox instance
  return sandbox.sandboxId;
}
