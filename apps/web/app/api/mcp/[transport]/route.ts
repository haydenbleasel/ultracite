import { getRules } from "@repo/data/rules";
import { track } from "@vercel/analytics/server";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod/v3";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_rules",
      {
        title: "Get Rules",
        description: "Provides a list of all Ultracite rules.",
        inputSchema: {
          runner: z.enum(["npx", "bun", "yarn", "npm"]).default("npx"),
          provider: z.enum(["biome", "eslint", "oxlint"]).default("biome"),
        },
      },
      async ({ runner, provider }) => {
        await track("MCP: Get rules");

        return {
          content: [
            {
              type: "text",
              text: getRules(runner, provider),
            },
          ],
        };
      }
    );
  },
  {},
  {
    disableSse: true,
    basePath: "/api/mcp",
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
