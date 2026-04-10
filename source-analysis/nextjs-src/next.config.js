/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/supervisor/dashboard',
        destination: '/supervisor',
      },
      {
        source: '/planner/dashboard',
        destination: '/planner',
      },
    ]
  },
}

module.exports = nextConfig
