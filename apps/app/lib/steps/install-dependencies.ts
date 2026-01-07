import { Sandbox } from "@vercel/sandbox";

export async function installDependencies(sandboxId: string): Promise<void> {
  "use step";

  const sandbox = await Sandbox.get({ sandboxId });

  // Install ni and Claude Code first
  await sandbox.runCommand("npm", [
    "install",
    "-g",
    "@antfu/ni",
    "@anthropic-ai/claude-code",
  ]);

  // Detect the package manager using `ni -v`
  const result = await sandbox.runCommand("ni", ["-v"]);
  const output = await result.stdout();

  // Parse output to find which package manager is used (pnpm, yarn, or bun)
  const packageManagers = ["pnpm", "yarn", "bun"];
  const detectedManager = packageManagers.find((pm) =>
    output.split("\n").some((line) => line.startsWith(pm))
  );

  // Install the detected package manager if needed (npm is already available)
  if (detectedManager) {
    await sandbox.runCommand("npm", ["install", "-g", detectedManager]);
  }

  // Use `ni` to install project dependencies
  await sandbox.runCommand("ni", []);

  // Set environment variables for Claude Code to use Vercel AI Gateway
  await sandbox.runCommand("sh", [
    "-c",
    [
      'export ANTHROPIC_BASE_URL="https://ai-gateway.vercel.sh"',
      `export ANTHROPIC_AUTH_TOKEN="${process.env.VERCEL_AI_GATEWAY_API_KEY}"`,
      'export ANTHROPIC_API_KEY=""',
    ].join(" && "),
  ]);
}
