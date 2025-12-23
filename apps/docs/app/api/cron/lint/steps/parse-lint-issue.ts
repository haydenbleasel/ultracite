import type { Sandbox } from "@vercel/sandbox";

export interface LintIssueDetails {
  linterOutput: string;
  file: string;
  fileContent: string;
}

// Generic pattern to find file paths in linter output (works for most linters)
const FILE_PATH_PATTERN = /([\w./-]+\.[tj]sx?):(\d+)/;

export async function parseLintIssue(
  sandbox: Sandbox,
  fixOutput: string
): Promise<LintIssueDetails | null> {
  "use step";

  // Get first 50 lines of output
  const linterOutput = fixOutput.split("\n").slice(0, 50).join("\n");

  // Find the first file path mentioned in the output
  const fileMatch = fixOutput.match(FILE_PATH_PATTERN);

  if (!fileMatch) {
    return null;
  }

  const file = fileMatch[1];

  // Read the file content from the sandbox
  const catResult = await sandbox.runCommand("cat", [file]);
  const fileContent = await catResult.stdout();

  return {
    linterOutput,
    file,
    fileContent,
  };
}
