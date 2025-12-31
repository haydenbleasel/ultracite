import { Sandbox } from "@vercel/sandbox";

export async function installDependencies(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  // We need to install all the relevant package managers
  await sandbox.runCommand("npm", ["install", "-g", "pnpm"]);
  await sandbox.runCommand("npm", ["install", "-g", "yarn"]);
  await sandbox.runCommand("npm", ["install", "-g", "bun"]);

  // We use `ni` to install dependencies by automatically detecting the package manager.
  await sandbox.runCommand("npm", ["install", "-g", "@antfu/ni"]);
  await sandbox.runCommand("ni", []);
}
