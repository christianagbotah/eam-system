import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  productionBrowserSourceMaps: true,
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: [
    '*.space.z.ai',
    '*.space.chatglm.site',
    'z.ai',
    'chatglm.site',
    '127.0.0.1',
    'localhost',
  ],
  outputFileTracingIncludes: undefined,
};

export default nextConfig;
