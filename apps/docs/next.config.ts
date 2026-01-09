import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";

const withMdx = createMDX();

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

  rewrites() {
    return [
      {
        destination: "/llms.mdx/:path*",
        source: "/:path*.mdx",
      },
    ];
  },

  serverExternalPackages: ["shiki", "@shikijs/engine-oniguruma"],

  transpilePackages: ["@repo/data"],
};

export default withMdx(config);
