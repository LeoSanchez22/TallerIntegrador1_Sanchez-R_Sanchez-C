/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/jupyter/:path*',
        destination: 'http://127.0.0.1:8888/jupyter/:path*' // Proxy transparente hacia el servidor Jupyter en PM2
      }
    ]
  }
}

export default nextConfig
