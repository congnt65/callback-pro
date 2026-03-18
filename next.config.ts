import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Allow large bodies for webhook payloads
  experimental: {},
}

export default nextConfig