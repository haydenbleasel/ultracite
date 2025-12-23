import type { Sandbox } from "@vercel/sandbox";
import type { LintIssue } from "./types";

const BIOME_OUTPUT_PATTERN = /^(.+?):(\d+):(\d+)\s+([\w/]+)/m;

function parseFirstIssue(output: string): LintIssue | null {
  const match = output.match(BIOME_OUTPUT_PATTERN);
  if (match) {
    return {
      file: match[1],
      rule: match[4],
    };
  }
  return null;
}

export async function checkLint(sandbox: Sandbox): Promise<LintIssue | null> {
  "use step";

  const checkResult = await sandbox.runCommand("npx", ["ultracite", "check"]);
  const checkOutput = await checkResult.output("both");
  const hasIssues = checkResult.exitCode !== 0;

  if (!hasIssues) {
    return null;
  }

  const issue = parseFirstIssue(checkOutput);

  return issue;
}
