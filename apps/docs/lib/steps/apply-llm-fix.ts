import type { Sandbox } from "@vercel/sandbox";

export async function applyLLMFix(
  sandbox: Sandbox,
  filePath: string,
  fixedContent: string
): Promise<void> {
  "use step";

  // Write the fixed content to the file
  // Using printf to handle special characters properly
  const escapedContent = fixedContent
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "'\\''");

  await sandbox.runCommand("sh", [
    "-c",
    `printf '%s' '${escapedContent}' > '${filePath}'`,
  ]);
}
