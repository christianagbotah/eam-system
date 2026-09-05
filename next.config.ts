import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: false, // Disable strict mode — double-mounting in dev causes duplicate effects
  productionBrowserSourceMaps: true,
  typescript: { ignoreBuildErrors: true },
  // PDFKit resolves its built-in AFM font data relative to its runtime package
  // directory. Bundling it into Turbopack server chunks rewrites those paths to
  // the virtual /ROOT build path, which fails in standalone production builds.
  serverExternalPackages: ['pdfkit'],
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
