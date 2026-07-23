'use client'

import { useState, useEffect } from 'react'
import { RiLoader4Line } from "react-icons/ri"
import ClientDashboard from './ClientDashboard'
import { fetchWithAuth } from '../../../lib/apiClient'

export default function Page() {
  const [recomendaciones, setRecomendaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    fetchWithAuth('/api/recomendaciones')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
        }
        return res.json()
      })
      .then((data) => {
        if (active) {
          setRecomendaciones(data.data || [])
          setError(null)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error("Fetch failed:", err.message)
        if (active) {
          setError(err.message || 'El Backend Hono no está encendido o hay un problema de conexión.')
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <div className="space-y-12">
      <header className="text-center pb-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-br from-white via-neutral-200 to-neutral-500 leading-tight">
          Sistema predictivo y recomendación con Machine Learning en el área de ventas de Laboratorios Sophia
        </h1>
      </header>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <RiLoader4Line className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center p-12 bg-red-900/20 rounded-3xl border border-red-800/50 shadow-2xl">
          <p className="text-red-400 text-xl font-bold mb-2">Error de Conexión: {error}</p>
          <p className="text-neutral-400 text-sm">Asegúrate de que el servidor backend esté en ejecución y accesible.</p>
        </div>
      ) : (
        <ClientDashboard initialData={recomendaciones} />
      )}
    </div>
  )
}
