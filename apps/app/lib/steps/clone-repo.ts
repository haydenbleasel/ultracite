import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

export async function cloneRepo(
  sandboxId: string,
  repoFullName: string,
  token: string
): Promise<void> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[cloneRepo] Failed to get sandbox: ${parseError(error)}`
    );
  }

  try {
    await sandbox.runCommand("git", [
      "clone",
      "--depth",
      "1",
      `https://x-access-token:${token}@github.com/${repoFullName}`,
      ".",
    ]);
  } catch (error) {
    throw new Error(`Failed to clone repo: ${parseError(error)}`);
  }
}
