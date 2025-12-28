import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

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
};

export default withWorkflow(config);
