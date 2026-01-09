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
        depth: 1,
        password: token,
        type: "git",
        url: `https://github.com/${repoFullName}`,
        username: "x-access-token",
      },
      timeout: FIVE_MINUTES_MS,
    });
  } catch (error) {
    throw new Error(`Failed to create sandbox: ${parseError(error)}`, {
      cause: error,
    });
  }

  // Return only the ID (serializable) instead of the Sandbox instance
  return sandbox.sandboxId;
}
