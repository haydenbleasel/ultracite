import { Sandbox } from "@vercel/sandbox";

export async function installDependencies(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  // Install all global packages in a single command for faster execution
  await sandbox.runCommand("npm", [
    "install",
    "-g",
    "pnpm",
    "yarn",
    "bun",
    "@antfu/ni",
    "@anthropic-ai/claude-code",
  ]);

  // Use `ni` to install project dependencies by automatically detecting the package manager
  await sandbox.runCommand("ni", []);
}
