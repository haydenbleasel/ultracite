import type { Sandbox } from "@vercel/sandbox";

export interface LintIssueDetails {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
  fileContent: string;
}

const BIOME_OUTPUT_PATTERN = /^(.+?):(\d+):(\d+)\s+([\w/]+)\s+(.+)$/m;

export async function parseLintIssue(
  sandbox: Sandbox,
  fixOutput: string
): Promise<LintIssueDetails | null> {
  "use step";

  const match = fixOutput.match(BIOME_OUTPUT_PATTERN);

  if (!match) {
    return null;
  }

  const file = match[1];
  const line = Number.parseInt(match[2], 10);
  const column = Number.parseInt(match[3], 10);
  const rule = match[4];
  const message = match[5];

  // Read the file content from the sandbox
  const catResult = await sandbox.runCommand("cat", [file]);
  const fileContent = await catResult.stdout();

  return {
    file,
    line,
    column,
    rule,
    message,
    fileContent,
  };
}
