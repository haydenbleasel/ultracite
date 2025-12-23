import type { Sandbox } from "@vercel/sandbox";

export async function installDependencies(sandbox: Sandbox): Promise<void> {
  "use step";

  await sandbox.runCommand("npm", ["install", "--legacy-peer-deps"]);
}
