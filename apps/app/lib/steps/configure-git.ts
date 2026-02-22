import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

export async function configureGit(
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
      `[configureGit] Failed to get sandbox: ${parseError(error)}`
    );
  }

  // Git user.name, user.email, and core.hooksPath are pre-configured
  // in the sandbox snapshot. Only the authenticated remote URL is per-run.
  const authenticatedUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;

  try {
    await sandbox.runCommand("git", [
      "remote",
      "set-url",
      "origin",
      authenticatedUrl,
    ]);
  } catch (error) {
    throw new Error(`Failed to set remote URL: ${parseError(error)}`);
  }
}
