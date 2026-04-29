import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone disabled — use custom server.js with require('next') to avoid WASM crash on cPanel
  // output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
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
