import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const config: NextConfig = {
  transpilePackages: ["@repo/data", "@repo/backend"],

  experimental: {
    turbopackFileSystemCacheForDev: true,
  },

  serverExternalPackages: [
    "shiki",
    "@shikijs/engine-oniguruma",
    "@prisma/client",
    "@prisma/adapter-pg",
  ],

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
