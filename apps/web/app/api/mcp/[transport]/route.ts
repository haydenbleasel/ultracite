import { getRules } from "@repo/data/rules";
import { track } from "@vercel/analytics/server";
import { createMcpHandler } from "mcp-handler";

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
              text: getRules("npx"),
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
