import { createMDX } from "fumadocs-mdx/next";

const withMdx = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "github.com",
      },
    ],
  },

  // biome-ignore lint/suspicious/useAwait: "redirects is async"
  async rewrites() {
    return [
      {
        source: "/:path*.mdx",
        destination: "/llms.mdx/:path*",
      },
    ];
  },

  // biome-ignore lint/suspicious/useAwait: "redirects is async"
  async redirects() {
    return [
      {
        source: "/husky",
        destination: "/integration/husky",
      },
      {
        source: "/lint-staged",
        destination: "/integration/lint-staged",
      },
      {
        source: "/lefthook",
        destination: "/integration/lefthook",
      },
    ];
  },
};

export default withMdx(config);
