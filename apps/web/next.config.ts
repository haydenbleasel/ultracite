import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const withMDX = createMDX({
  // Add markdown plugins here, as desired
});

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

  serverExternalPackages: ["shiki", "@shikijs/engine-oniguruma"],

  transpilePackages: ["@repo/data"],
};

export default withMDX(config);
