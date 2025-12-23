import type { Sandbox } from "@vercel/sandbox";
import { stepCountIs, ToolLoopAgent, tool } from "ai";
import { z } from "zod";

const MAX_FIX_ITERATIONS = 20;

export const reviewAgent = (sandbox: Sandbox) => {
  let fixCount = 0;

  const agent = new ToolLoopAgent({
    model: "openai/gpt-oss-120b",
    instructions: `You are a code assistant that iteratively fixes linting issues in a codebase.

Your job is to:
1. Check for lint issues using the checkLint tool
2. If issues exist, read the problematic file using readFile
3. Fix the issue by writing the corrected content using writeFile
4. Repeat until all issues are fixed

Important:
- Fix ONE issue at a time
- Always preserve the rest of the file content when making fixes
- After writing a fix, check again to verify the issue is resolved
- Stop when there are no more issues`,
    tools: {
      checkLint: tool({
        description:
          "Run ultracite check to find lint issues. Returns the linter output and whether issues exist.",
        inputSchema: z.object({}),
        execute: async () => {
          const result = await sandbox.runCommand("npx", [
            "ultracite",
            "check",
          ]);
          const output = await result.output("both");
          const hasIssues =
            result.exitCode !== 0 ||
            output.includes("error") ||
            output.includes("warning");
          return { output, hasIssues };
        },
      }),
      readFile: tool({
        description: "Read the contents of a file",
        inputSchema: z.object({
          filePath: z.string().describe("The path to the file to read"),
        }),
        execute: async ({ filePath }) => {
          const result = await sandbox.runCommand("cat", [filePath]);
          const content = await result.stdout();
          return { content };
        },
      }),
      writeFile: tool({
        description: "Write content to a file to fix a lint issue",
        inputSchema: z.object({
          filePath: z.string().describe("The path to the file to write"),
          content: z.string().describe("The complete fixed file content"),
        }),
        execute: async ({ filePath, content }) => {
          fixCount++;
          const escapedContent = content
            .replace(/\\/g, "\\\\")
            .replace(/'/g, "'\\''");
          await sandbox.runCommand("sh", [
            "-c",
            `printf '%s' '${escapedContent}' > '${filePath}'`,
          ]);
          return { success: true };
        },
      }),
    },
    stopWhen: stepCountIs(MAX_FIX_ITERATIONS),
  });

  return { agent, getFixCount: () => fixCount };
};
