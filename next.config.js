/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow serving static files from public directory
  // This will make canary.js, analytics.js and other scripts available
  staticPageGenerationTimeout: 180,
  
  // Handle the embed dashboard path
  async rewrites() {
    return [
      {
        source: '/src/embed-dashboard/:path*',
        destination: '/api/embed-dashboard/:path*'
      },
      {
        source: '/stable',
        destination: '/stable-page'
      },
      {
        source: '/canary',
        destination: '/canary-page'
      }
    ]
  }
}

module.exports = nextConfig
