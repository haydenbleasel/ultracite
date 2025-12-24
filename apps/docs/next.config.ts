import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const withMdx = createMDX();

const config: NextConfig = {
  transpilePackages: ["@ultracite/data"],

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

  redirects() {
    return [
      {
        source: "/husky",
        destination: "/integration/husky",
        permanent: true,
      },
      {
        source: "/lint-staged",
        destination: "/integration/lint-staged",
        permanent: true,
      },
      {
        source: "/lefthook",
        destination: "/integration/lefthook",
        permanent: true,
      },
    ];
  },
};

export default withWorkflow(withMdx(config));
