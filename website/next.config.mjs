/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    scrollRestoration: true,
  },
  rewrites: async () => [
    {
      source: '/inspector/:path*',
      destination: '/inspector/index.html',
    },
  ],
};

export default nextConfig;
