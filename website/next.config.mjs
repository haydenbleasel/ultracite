/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    scrollRestoration: true,
  },
  rewrites: async () => [
    {
      source: '/inspector',
      destination: '/inspector/index.html',
    },
  ],
};

export default nextConfig;
