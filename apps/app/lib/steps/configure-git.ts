import { Sandbox } from "@vercel/sandbox";

export async function configureGit(
  sandboxId: string,
  repoFullName: string,
  token: string
): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  const name = "Ultracite";
  const email = "ultracite@users.noreply.github.com";

  // Configure remote URL with authentication token
  const authenticatedUrl = `https://x-access-token:${token}@github.com/${repoFullName}.git`;
  await sandbox.runCommand("git", [
    "remote",
    "set-url",
    "origin",
    authenticatedUrl,
  ]);

  // Configure git author
  await sandbox.runCommand("git", ["config", "user.email", email]);
  await sandbox.runCommand("git", ["config", "user.name", name]);
}
