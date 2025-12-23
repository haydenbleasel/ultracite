import type { Sandbox } from "@vercel/sandbox";
import type { LintIssue } from "./types";

const BIOME_OUTPUT_PATTERN = /^(.+?):(\d+):(\d+)\s+([\w/]+)/m;

export interface CheckLintResult {
  hasIssues: boolean;
  issue: LintIssue | null;
}

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

export async function checkLint(sandbox: Sandbox): Promise<CheckLintResult> {
  "use step";

  const checkResult = await sandbox.runCommand("npx", [
    "ultracite",
    "check",
    "--diagnostic-level=error",
  ]);

  const checkOutput = await checkResult.output("both");
  const hasIssues = checkResult.exitCode !== 0;

  if (!hasIssues) {
    return { hasIssues: false, issue: null };
  }

  const issue = parseFirstIssue(checkOutput);
  return { hasIssues: Boolean(issue), issue };
}
