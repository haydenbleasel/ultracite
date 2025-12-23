import { generateObject } from "ai";
import { z } from "zod";
import type { LintIssueDetails } from "./parse-lint-issue";

export interface LLMFixResult {
  title: string;
  fixedContent: string;
}

const fixSchema = z.object({
  title: z
    .string()
    .describe("A short, descriptive title for the PR (e.g., 'Fix unused variable in utils.ts')"),
  fixedContent: z
    .string()
    .describe("The complete fixed file content with the issue resolved"),
});

export async function generateLLMFix(
  issue: LintIssueDetails
): Promise<LLMFixResult> {
  "use step";

  const { object } = await generateObject({
    model: "openai/codex-mini",
    schema: fixSchema,
    prompt: `You are a code assistant that fixes linting issues. Fix the following issue and return the complete fixed file content.

**File**: ${issue.file}
**Line**: ${issue.line}
**Column**: ${issue.column}
**Rule**: ${issue.rule}
**Message**: ${issue.message}

**Current file content**:
\`\`\`
${issue.fileContent}
\`\`\`

Please fix this specific issue. Return the complete file content with the fix applied, preserving all other code exactly as is. Also provide a short, descriptive title for this fix.`,
  });

  return {
    title: object.title,
    fixedContent: object.fixedContent,
  };
}
