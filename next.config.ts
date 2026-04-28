import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  allowedDevOrigins: [
    '*.space.z.ai',
    '*.space.chatglm.site',
    'z.ai',
    'chatglm.site',
    '127.0.0.1',
    'localhost',
  ],
  outputFileTracingIncludes: process.env.NODE_ENV === 'production' ? {
    '/*': [
      '.prisma/client/**/*',
      '@prisma/adapter-mariadb/**/*',
      'mariadb/**/*',
    ],
  } : undefined,
};

export default nextConfig;
