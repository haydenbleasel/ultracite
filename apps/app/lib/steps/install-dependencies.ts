import { Sandbox } from "@vercel/sandbox";
import { parseError } from "@/lib/error";

export async function installDependencies(sandboxId: string): Promise<void> {
  "use step";

  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.get({ sandboxId });
  } catch (error) {
    throw new Error(
      `[installDependencies] Failed to get sandbox: ${parseError(error)}`
    );
  }

  // Install ni and Claude Code separately so one failure doesn't block the other
  for (const pkg of ["@antfu/ni", "@anthropic-ai/claude-code"]) {
    const result = await sandbox
      .runCommand("npm", ["install", "-g", pkg])
      .catch((error: unknown) => {
        throw new Error(
          `Failed to install ${pkg}: ${parseError(error)}`
        );
      });

    if (result.exitCode !== 0) {
      const output = await result.output("both");
      throw new Error(
        `Failed to install ${pkg} (exit code ${result.exitCode}): ${output.trim()}`
      );
    }
  }

  // Detect the package manager using `ni -v`
  const result = await sandbox
    .runCommand("ni", ["-v"])
    .catch((error: unknown) => {
      throw new Error(`Failed to detect package manager: ${parseError(error)}`);
    });

  const output = await result.stdout();

  // Parse output to find which package manager is used (pnpm, yarn, or bun)
  const packageManagers = ["pnpm", "yarn", "bun"];
  const detectedManager = packageManagers.find((pm) =>
    output.split("\n").some((line) => line.startsWith(pm))
  );

  // Install the detected package manager if needed (npm is already available)
  if (detectedManager) {
    try {
      await sandbox.runCommand("npm", ["install", "-g", detectedManager]);
    } catch (error) {
      throw new Error(
        `Failed to install ${detectedManager}: ${parseError(error)}`
      );
    }
  }

  // Use `ni` to install project dependencies
  try {
    await sandbox.runCommand("ni", []);
  } catch (error) {
    throw new Error(
      `Failed to install project dependencies: ${parseError(error)}`
    );
  }
}
