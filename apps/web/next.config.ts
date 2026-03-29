import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const withMDX = createMDX({
  // Add markdown plugins here, as desired
});

const productionHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "www.ultracite.ai";
const canonicalHost =
  productionHost === "ultracite.ai" ? "www.ultracite.ai" : productionHost;
const docsBaseUrl =
  process.env.NODE_ENV === "production"
    ? "https://docs.ultracite.ai"
    : "http://localhost:3001";

const legacyDocsRedirects = [
  ["/configuration", "/configuration"],
  ["/examples", "/usage"],
  ["/faq", "/faq"],
  ["/integration/husky", "/git-hooks"],
  ["/integration/lefthook", "/git-hooks"],
  ["/introduction", "/"],
  ["/mcp", "/mcp-server"],
  ["/migrate/biome", "/migrate/biome"],
  ["/preset/core", "/configuration"],
  ["/rules", "/rules"],
  ["/setup", "/setup"],
  ["/support", "/troubleshooting"],
  ["/troubleshooting", "/troubleshooting"],
  ["/upgrade/v6", "/upgrade/v6"],
].map(([source, destination]) => ({
  destination: `${docsBaseUrl}${destination}`,
  permanent: true,
  source,
}));

const config: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        hostname: "github.com",
        protocol: "https",
      },
    ],
  },

  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

  redirects() {
    return [
      {
        destination: `https://${canonicalHost}/:path*`,
        has: [
          {
            type: "host",
            value: "ultracite.ai",
          },
        ],
        permanent: true,
        source: "/:path*",
      },
      {
        destination: "/",
        permanent: true,
        source: "/cloud",
      },
      {
        destination: "/",
        permanent: true,
        source: "/social",
      },
      ...legacyDocsRedirects,
    ];
  },

  serverExternalPackages: ["shiki", "@shikijs/engine-oniguruma"],

  transpilePackages: ["@repo/data"],
};

export default withMDX(config);
