/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export', // Static export
  basePath: '', // This needs to be empty for embedding
  assetPrefix: '/dashboard/out/',
  images: {
    unoptimized: true,
  }
}

module.exports = nextConfig
