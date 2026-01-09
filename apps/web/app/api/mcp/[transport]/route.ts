import { getRules } from "@repo/data/rules";
import { track } from "@vercel/analytics/server";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod/v3";

const handler = createMcpHandler(
  (server) => {
    server.registerTool(
      "get_rules",
      {
        description: "Provides a list of all Ultracite rules.",
        inputSchema: {
          provider: z.enum(["biome", "eslint", "oxlint"]).default("biome"),
          runner: z.enum(["npx", "bun", "yarn", "npm"]).default("npx"),
        },
        title: "Get Rules",
      },
      async ({ runner, provider }) => {
        await track("MCP: Get rules");

        return {
          content: [
            {
              text: getRules(runner, provider),
              type: "text",
            },
          ],
        };
      }
    );
  },
  {},
  {
    basePath: "/api/mcp",
    disableSse: true,
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
