import { track } from '@vercel/analytics/server';
import { createMcpHandler } from '@vercel/mcp-adapter';
import { rules } from '@/lib/rules';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL is not set');
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      'getRules',
      'Provides a list of all Ultracite rules.',
      {},
      async () => {
        await track('MCP: Get rules');

        return {
          content: [
            { type: 'text', text: rules.map((rule) => `- ${rule}`).join('\n') },
          ],
        };
      }
    );
  },
  {
    // Optional server options
  },
  {
    redisUrl: REDIS_URL,
    streamableHttpEndpoint: '/api/mcp/http',
    sseEndpoint: '/api/mcp/sse',
    sseMessageEndpoint: '/api/mcp/message',
    maxDuration: 60,
    verboseLogs: true,
  }
);

export { handler as GET, handler as POST };
