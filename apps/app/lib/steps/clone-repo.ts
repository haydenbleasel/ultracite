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
    const result = await sandbox.runCommand("git", [
      "clone",
      "--depth",
      "1",
      `https://x-access-token:${token}@github.com/${repoFullName}`,
      ".",
    ]);

    if (result.exitCode !== 0) {
      const output = await result.output("both");
      const sanitized = output.replaceAll(token, "***");
      throw new Error(
        `git clone failed with exit code ${result.exitCode}: ${sanitized.trim()}`
      );
    }
  } catch (error) {
    throw new Error(`Failed to clone repo: ${parseError(error)}`);
  }
}
