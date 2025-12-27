import { Sandbox } from "@vercel/sandbox";

export async function installDependencies(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.runCommand("npm", ["install", "-g", "@antfu/ni"]);
  await sandbox.runCommand("ni", []);
}
