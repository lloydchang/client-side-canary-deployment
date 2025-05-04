/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow serving static files from public directory
  // This will make canary.js, analytics.js and other scripts available
  staticPageGenerationTimeout: 180,
  
  // Don't let Next.js handle static HTML
  async rewrites() {
    return [];
  }
}

module.exports = nextConfig
