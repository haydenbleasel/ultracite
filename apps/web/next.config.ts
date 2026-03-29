import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const withMDX = createMDX({
  // Add markdown plugins here, as desired
});

const productionHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? "www.ultracite.ai";
const canonicalHost =
  productionHost === "ultracite.ai" ? "www.ultracite.ai" : productionHost;

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
    ];
  },

  serverExternalPackages: ["shiki", "@shikijs/engine-oniguruma"],

  transpilePackages: ["@repo/data"],
};

export default withMDX(config);
