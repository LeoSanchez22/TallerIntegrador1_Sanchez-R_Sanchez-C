import { Suspense } from 'react'
import ClientDashboard from './ClientDashboard'

async function getRecomendaciones() {
  try {
    // Consulta a la nueva API de Hono conectada a Supabase
    const res = await fetch('http://127.0.0.1:3005/api/recomendaciones', { cache: 'no-store' })
    if (!res.ok) return { error: `API Hono error: ${res.status}` }
    return res.json()
  } catch (error: any) {
    console.error("Fetch failed:", error.message)
    return { error: 'El Backend Hono no está encendido o hay un problema de conexión.' }
  }
}

export default async function Page() {
  const data = await getRecomendaciones()
  const recomendaciones = data.data || []

  return (
    <div className="space-y-12">
      <header className="text-center pb-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-500 leading-tight">
Sistema predictivo y recomendación con Deep Learning en el área de ventas de Laboratorios Sophia        </h1>
      </header>
      {data.error ? (
        <div className="text-center p-12 bg-red-900/20 rounded-3xl border border-red-800/50 shadow-2xl">
          <p className="text-red-400 text-xl font-bold mb-2">Error de Conexión: {data.error}</p>
          <p className="text-neutral-400 text-sm">Asegúrate de que la terminal del backend en Hono está corriendo en el puerto 3005.</p>
        </div>
      ) : (
        <ClientDashboard initialData={recomendaciones} />
      )}
    </div>
  )
}
