/** @type {import('next').NextConfig} */
const nextConfig = {
  // apify-client and fs are Node.js-only — keep them server-side
  experimental: {
    serverComponentsExternalPackages: ["apify-client"],
  },
};

export default nextConfig;
