import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const withMdx = createMDX();

const config: NextConfig = {
  transpilePackages: ["@repo/data"],

  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  serverExternalPackages: ["shiki", "@shikijs/engine-oniguruma"],

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },

  rewrites() {
    return [
      {
        source: "/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
    ];
  },
};

export default withWorkflow(withMdx(config));
