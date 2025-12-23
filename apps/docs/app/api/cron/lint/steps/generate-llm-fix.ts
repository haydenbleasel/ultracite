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
    .describe("A short, descriptive title for the fix (e.g., 'Fix unused variable in utils.ts')"),
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
    prompt: `You are a code assistant that fixes linting issues. Below is the output from a linter (could be ESLint, Biome, or OxLint) and the content of the first file mentioned.

**Linter output (first 50 lines)**:
\`\`\`
${issue.linterOutput}
\`\`\`

**File**: ${issue.file}

**Current file content**:
\`\`\`
${issue.fileContent}
\`\`\`

Fix the FIRST issue mentioned in the linter output. Return the complete file content with the fix applied, preserving all other code exactly as is. Also provide a short, descriptive title for this fix.`,
  });

  return {
    title: object.title,
    fixedContent: object.fixedContent,
  };
}
