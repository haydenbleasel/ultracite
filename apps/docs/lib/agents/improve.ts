import { Output, ToolLoopAgent } from "ai";
import { z } from "zod";

export const improveAgent = new ToolLoopAgent({
  model: "openai/gpt-oss-120b",
  instructions: [
    "You are a code assistant that fixes linting issues.",
    "The user will provide output from a linter (could be ESLint, Biome, or OxLint)",
    "You will need to fix the issues in the code.",
  ].join("\n"),
  output: Output.object({
    schema: z.object({
      title: z
        .string()
        .describe(
          "A short, descriptive title for the fix (e.g., 'Fix unused variable in utils.ts')"
        ),
      fixedContent: z
        .string()
        .describe("The complete fixed file content with the issue resolved"),
    }),
  }),
});
