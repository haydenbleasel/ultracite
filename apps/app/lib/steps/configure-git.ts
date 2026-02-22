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

  // Git user.name, user.email, and core.hooksPath are pre-configured in the sandbox snapshot.
  // The authenticated remote URL and local hooks override are per-run.
  const authenticatedUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;

  try {
    await sandbox.runCommand("git", [
      "remote",
      "set-url",
      "origin",
      authenticatedUrl,
    ]);

    // Disable hooks locally to override any hooks installed by package managers
    // (e.g. husky's prepare script sets core.hooksPath to .husky/)
    await sandbox.runCommand("git", [
      "config",
      "--local",
      "core.hooksPath",
      "/dev/null",
    ]);
  } catch (error) {
    throw new Error(`Failed to configure git: ${parseError(error)}`);
  }
}
