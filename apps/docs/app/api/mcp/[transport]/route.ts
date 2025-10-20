import { track } from "@vercel/analytics/server";
import { createMcpHandler } from "mcp-handler";

// biome-ignore lint/performance/noNamespaceImport: We need to import the rules as an object to avoid type errors
import * as rules from "@/lib/rules";

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "getRules",
      "Provides a list of all Ultracite rules.",
      {},
      async () => {
        await track("MCP: Get rules");

        return {
          content: [
            {
              type: "text",
              text: Object.values(rules)
                .map((rule) => `- ${rule}`)
                .join("\n"),
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
