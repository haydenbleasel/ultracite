import { Sandbox } from "@vercel/sandbox";

export async function installDependencies(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });
  await sandbox.runCommand("npm", ["install", "--legacy-peer-deps"]);
}
