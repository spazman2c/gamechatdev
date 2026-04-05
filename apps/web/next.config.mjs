/** @type {import('next').NextConfig} */
const nextConfig = {
  // Strict Mode's intentional unmount→remount cycle breaks WebRTC connections
  // and causes visible flash in development. Production is unaffected.
  // Re-enable temporarily if debugging non-WebRTC side effects.
  reactStrictMode: false,
  transpilePackages: ['@nexora/ui', '@nexora/types', '@nexora/schemas'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.nexora.app',
      },
      {
        protocol: 'https',
        hostname: 'cdn.nexora.app',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
}

export default nextConfig
