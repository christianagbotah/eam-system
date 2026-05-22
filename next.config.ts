import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false, // Disable strict mode — double-mounting in dev causes duplicate effects
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
  // Force cache-busting: disable all caching for HTML and JS assets
  // so stale bundles never survive a deployment.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
          {
            key: 'Pragma',
            value: 'no-cache',
          },
          {
            key: 'Expires',
            value: '0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
