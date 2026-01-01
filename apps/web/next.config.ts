import createMDX from "@next/mdx";
import type { NextConfig } from "next";

const withMDX = createMDX({
  // Add markdown plugins here, as desired
});

const config: NextConfig = {
  transpilePackages: ["@repo/data"],

  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],

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

export default withMDX(config);
