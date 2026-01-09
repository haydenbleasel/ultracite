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

  const name = "Ultracite";
  const email = "ultracite@users.noreply.github.com";

  // Configure remote URL with authentication token
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

  try {
    await sandbox.runCommand("git", ["config", "user.email", email]);
  } catch (error) {
    throw new Error(`Failed to configure git email: ${parseError(error)}`);
  }

  try {
    await sandbox.runCommand("git", ["config", "user.name", name]);
  } catch (error) {
    throw new Error(`Failed to configure git name: ${parseError(error)}`);
  }
}
