/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/jupyter/:path*',
        destination: 'http://[::1]:8888/jupyter/:path*' // Proxy transparente hacia el servidor Jupyter en PM2 (usando IPv6)
      }
    ]
  }
}

export default nextConfig
