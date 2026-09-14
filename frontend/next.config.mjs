/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    let backendPort = '5005';

    // Detección automática del puerto del Backend Hono
    if (process.env.PORT === '5018' || process.argv.includes('5018') || (process.env.NODE_ENV === 'production' && !process.env.PORT?.includes('5008'))) {
      backendPort = '5017';
    } else if (process.env.PORT === '5008' || process.argv.includes('5008')) {
      backendPort = '5007';
    }

    const backendUrl = process.env.BACKEND_URL || `http://127.0.0.1:${backendPort}`;

    return [
      {
        source: '/api/proyeccion/explicacion',
        destination: '/api/proyeccion/explicacion',
      },
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/model/:path*',
        destination: `${backendUrl}/model/:path*`,
      },
    ];
  },
};

export default nextConfig;


