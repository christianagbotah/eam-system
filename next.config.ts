import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  reactStrictMode: true,
  allowedDevOrigins: [
    '*.space.z.ai',
    'z.ai',
  ],
};

export default nextConfig;
