import { ultraciteAgent } from "@/lib/agents/ultracite";
import type { LintIssueDetails } from "./parse-lint-issue";

export interface LLMFixResult {
  title: string;
  fixedContent: string;
}

export async function generateLLMFix(
  issue: LintIssueDetails
): Promise<LLMFixResult> {
  "use step";

  const { output } = await ultraciteAgent.generate({
    prompt: `Here are the first 50 lines of the linter output:

\`\`\`
${issue.linterOutput}
\`\`\`

**File**: ${issue.file}

**Current file content**:
\`\`\`
${issue.fileContent}
\`\`\`

Fix only the FIRST issue mentioned in the linter output.

Return the complete file content with the fix applied, preserving all other code exactly as is.

Also provide a short, descriptive title for this fix.`,
  });

  return {
    title: output.title,
    fixedContent: output.fixedContent,
  };
}
