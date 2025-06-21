import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,

  // biome-ignore lint/suspicious/useAwait: "rewrites is async"
  rewrites: async () => {
    return [
      {
        source: '/s/:path*',
        destination: 'https://biomejs.dev/schemas/:path*/schema.json',
      },
    ];
  },
};

export default withMDX(config);
