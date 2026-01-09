import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

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

  serverExternalPackages: [
    "shiki",
    "@shikijs/engine-oniguruma",
    "@prisma/client",
    "@prisma/adapter-pg",
  ],

  transpilePackages: ["@repo/data", "@repo/backend"],
};

export default withWorkflow(config);
