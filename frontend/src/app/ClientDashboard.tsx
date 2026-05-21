'use client'

import { useState, useMemo } from 'react'
import { API_URL } from '../config'

interface ProyeccionItem {
  producto: string
  probabilidad: number
  motor: string
  justificacion: string
}

interface ProyeccionResponse {
  clienteId: number
  zona: string
  historial: string[]
  proyecciones: Record<string, ProyeccionItem[]>
}

interface GrafoNodo {
  id: string
  label: string
  layer: number
  type: string
  x?: number
  y?: number
}

interface GrafoEnlace {
  source: string
  target: string
  type: string
  label: string
  x1?: number
  y1?: number
  x2?: number
  y2?: number
}

export default function ClientDashboard({ initialData }: { initialData: any[] }) {
  const [selectedZona, setSelectedZona] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [proyeccionData, setProyeccionData] = useState<ProyeccionResponse | null>(null)
  const [activeMes, setActiveMes] = useState('Mes +1 (Próximo Mes)')
  const [hoveredEnlace, setHoveredEnlace] = useState<any>(null)

  // Obtener zonas únicas disponibles
  const zonas = useMemo(() => {
    const set = new Set<string>()
    initialData.forEach((row) => {
      const z = row.zona_comercial || row.zona || row.vendedor;
      if (z) set.add(z)
    })
    const list = Array.from(set)
    if (list.length > 0 && !selectedZona) {
      setSelectedZona(list[0])
    }
    return list
  }, [initialData, selectedZona])

  // Obtener clientes de la zona seleccionada
  const clientesDeZona = useMemo(() => {
    const listMap = new Map<number, string>()
    initialData.forEach((row) => {
      const z = row.zona_comercial || row.zona || row.vendedor;
      if (z === selectedZona && row.cliente_id) {
        listMap.set(Number(row.cliente_id), row.cliente || row.nombre_cliente || `Cliente ID ${row.cliente_id}`)
      }
    })
    const list = Array.from(listMap.entries()).map(([id, name]) => ({ id, name }))
    if (list.length > 0 && (!selectedCliente || !list.some(c => c.id === selectedCliente))) {
      setSelectedCliente(list[0].id)
    }
    return list
  }, [initialData, selectedZona, selectedCliente])

  // Ejecutar el motor de inferencia en el backend
  async function generarProyecciones() {
    if (!selectedCliente) return
    setLoading(true)
    setProyeccionData(null)
    try {
      const res = await fetch(`${API_URL}/api/proyeccion/${selectedCliente}`)
      if (!res.ok) throw new Error("Error en la proyección")
      const result = await res.json()
      setProyeccionData(result)
      const meses = Object.keys(result.proyecciones)
      if (meses.length > 0) {
        setActiveMes(meses[0])
      }
    } catch (err) {
      console.error(err)
      alert("Hubo un error calculando las inferencias del cliente.")
    } finally {
      setLoading(false)
    }
  }

  // Generación dinámica del Grafo interactivo SVG basado en el mes seleccionado
  const { nodos, enlaces } = useMemo(() => {
    if (!proyeccionData) return { nodos: [], enlaces: [] }

    const sugeridosActivos = proyeccionData.proyecciones[activeMes] || []
    
    const baseNodos: GrafoNodo[] = [
      { id: `Cliente_${proyeccionData.clienteId}`, label: `Cliente ${proyeccionData.clienteId}`, layer: 0, type: 'cliente' }
    ]
    const baseEnlaces: GrafoEnlace[] = []

    const ultimosHistorial = proyeccionData.historial.slice(-5)
    const itemsAMostrar = new Set(ultimosHistorial)

    // Al igual que app.py, agregar a items a mostrar si aparecen en la justificación
    sugeridosActivos.forEach(rec => {
      proyeccionData.historial.forEach(item => {
        if (rec.justificacion.includes(item)) {
          itemsAMostrar.add(item)
        }
      })
    })

    const itemsAMostrarArray = Array.from(itemsAMostrar)

    itemsAMostrarArray.forEach(item => {
      baseNodos.push({ id: item, label: item, layer: 1, type: 'historial' })
      baseEnlaces.push({ source: `Cliente_${proyeccionData.clienteId}`, target: item, type: 'compra', label: 'Compra' })
    })

    sugeridosActivos.forEach(rec => {
      baseNodos.push({ id: rec.producto, label: rec.producto, layer: 2, type: 'proyeccion' })
      baseEnlaces.push({ source: `Cliente_${proyeccionData.clienteId}`, target: rec.producto, type: 'sugerido', label: rec.motor })

      itemsAMostrarArray.forEach(hist => {
        if (rec.justificacion.includes(hist)) {
          baseEnlaces.push({ source: hist, target: rec.producto, type: 'apriori', label: 'Afinidad' })
        }
      })
    })

    const capa0 = baseNodos.filter(n => n.layer === 0)
    const capa1 = baseNodos.filter(n => n.layer === 1)
    const capa2 = baseNodos.filter(n => n.layer === 2)

    const height = 480
    const xCoords = [100, 380, 680]
    const coordsMap: Record<string, { x: number; y: number }> = {}

    capa0.forEach((nodo) => { coordsMap[nodo.id] = { x: xCoords[0], y: height / 2 } })
    capa1.forEach((nodo, idx) => { coordsMap[nodo.id] = { x: xCoords[1], y: (height / (capa1.length + 1)) * (idx + 1) } })
    capa2.forEach((nodo, idx) => { coordsMap[nodo.id] = { x: xCoords[2], y: (height / (capa2.length + 1)) * (idx + 1) } })

    return {
      nodos: baseNodos.map(nodo => ({ ...nodo, x: coordsMap[nodo.id]?.x || 0, y: coordsMap[nodo.id]?.y || 0 })),
      enlaces: baseEnlaces.map(enlace => ({
        ...enlace,
        x1: coordsMap[enlace.source]?.x || 0,
        y1: coordsMap[enlace.source]?.y || 0,
        x2: coordsMap[enlace.target]?.x || 0,
        y2: coordsMap[enlace.target]?.y || 0
      }))
    }
  }, [proyeccionData, activeMes])

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      {/* SIDEBAR DE CONTROL (Tono Profesional) */}
      <aside className="w-full lg:w-[320px] flex-shrink-0">
        <div className="sticky top-8 bg-neutral-900/60 border border-neutral-800/80 backdrop-blur-2xl rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center space-x-3 mb-8 pb-4 border-b border-neutral-800">
            <div className="w-3 h-8 bg-emerald-500 rounded-sm"></div>
            <h2 className="text-xl font-black text-white uppercase tracking-widest">
              Panel de Control
            </h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-neutral-400 text-xs font-black uppercase tracking-widest mb-3">
                Zona Comercial
              </label>
              <div className="relative">
                <select
                  value={selectedZona}
                  onChange={(e) => setSelectedZona(e.target.value)}
                  className="appearance-none w-full px-4 py-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer"
                >
                  {zonas.map((zona) => (
                    <option key={zona} value={zona}>
                      {zona}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-neutral-400 text-xs font-black uppercase tracking-widest mb-3">
                Institución / Clínica
              </label>
              <div className="relative">
                <select
                  value={selectedCliente || ''}
                  onChange={(e) => setSelectedCliente(Number(e.target.value))}
                  className="appearance-none w-full px-4 py-4 rounded-xl bg-neutral-950 border border-neutral-800 text-white font-semibold focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/50 transition-all cursor-pointer"
                >
                  {clientesDeZona.map((c) => (
                    <option key={c.id} value={c.id}>
                      ID: {c.id} - {c.name.slice(0, 30)}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-500">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              onClick={generarProyecciones}
              disabled={loading || !selectedCliente}
              className="w-full mt-6 py-4 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 text-sm font-black tracking-widest uppercase rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-neutral-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>Procesando...</span>
                </>
              ) : (
                <span>Ejecutar Simulación</span>
              )}
            </button>

            <div className="mt-8 pt-6 border-t border-neutral-800">
              <label className="block text-neutral-400 text-xs font-black uppercase tracking-widest mb-3">
                Herramientas Avanzadas
              </label>
              <a
                href="http://localhost:8888/notebooks/pipeline_recomendaciones_mvp.ipynb"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 text-sm font-black tracking-widest uppercase rounded-xl transition-all flex items-center justify-center space-x-2 text-center"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Notebook MVP</span>
              </a>
              <p className="text-[10px] text-neutral-500 mt-2 text-center leading-relaxed">
                Requiere que <strong className="text-neutral-400">jupyter notebook</strong> esté en ejecución en el puerto 8888 de tu máquina.
              </p>
              <div className="mt-3 text-center">
                <a href="/pipeline_recomendaciones_mvp.ipynb" download className="text-[11px] text-emerald-500 hover:text-emerald-400 hover:underline transition-colors font-medium">
                  ↓ Descargar archivo .ipynb
                </a>
              </div>
            </div>

          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL DEL DASHBOARD */}
      <main className="flex-1 w-full min-w-0">
        {!loading && !proyeccionData && (
          <div className="flex flex-col items-center justify-center p-20 bg-neutral-900/40 rounded-3xl border border-neutral-800/50 h-[calc(100vh-16rem)] min-h-[500px] text-center shadow-xl">
            <div className="w-20 h-20 rounded-3xl bg-neutral-800/50 flex items-center justify-center mb-6 border border-neutral-700/50 shadow-inner">
              <svg className="w-10 h-10 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-white mb-3 tracking-tight">Listo para Inferencia</h3>
            <p className="text-neutral-400 font-medium max-w-md leading-relaxed">
              Seleccione una zona y una institución comercial en el panel izquierdo para iniciar el análisis predictivo y el modelado de afinidad XAI.
            </p>
          </div>
        )}

        {proyeccionData && !loading && (
          <div className="space-y-8 animate-fadeIn">
            {/* TABS NAVEGACIÓN */}
            <div className="flex bg-neutral-900/80 p-2 rounded-2xl border border-neutral-800/80 w-full shadow-lg">
              {Object.keys(proyeccionData.proyecciones).map((mes) => (
                <button
                  key={mes}
                  onClick={() => setActiveMes(mes)}
                  className={`flex-1 py-3.5 px-4 rounded-xl text-xs font-black tracking-wider transition-all uppercase ${
                    activeMes === mes
                      ? 'bg-emerald-500 text-neutral-950 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
                  }`}
                >
                  {mes}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* SUGERENCIAS ESTRATÉGICAS */}
              <div className="xl:col-span-5 space-y-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-2 h-6 bg-emerald-500 rounded-sm shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                  <h4 className="text-lg font-black tracking-widest uppercase text-neutral-200">
                    📋 Productos a incorporar en el Mix Comercial
                  </h4>
                </div>
                
                <div className="overflow-x-auto rounded-2xl border border-neutral-800 shadow-2xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-neutral-900/80 border-b border-neutral-800">
                        <th className="p-4 text-xs font-black tracking-widest text-neutral-400 uppercase">Producto</th>
                        <th className="p-4 text-xs font-black tracking-widest text-neutral-400 uppercase">Probabilidad de Éxito</th>
                        <th className="p-4 text-xs font-black tracking-widest text-neutral-400 uppercase">Modelo de Origen</th>
                        <th className="p-4 text-xs font-black tracking-widest text-neutral-400 uppercase">Justificación Comercial (XAI)</th>
                      </tr>
                    </thead>
                    <tbody className="bg-neutral-950/40 divide-y divide-neutral-800/60">
                      {(proyeccionData.proyecciones[activeMes] || []).map((rec, i) => (
                        <tr key={i} className="hover:bg-neutral-900/40 transition-colors group">
                          <td className="p-4 font-bold text-white group-hover:text-emerald-400 transition-colors">
                            {rec.producto}
                          </td>
                          <td className="p-4">
                            <span className="text-xs font-black px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg whitespace-nowrap">
                              {rec.probabilidad}%
                            </span>
                          </td>
                          <td className="p-4">
                            <span className="text-[10px] font-black uppercase bg-neutral-800 text-neutral-300 px-2.5 py-1 rounded-md border border-neutral-700 shadow-sm">
                              {rec.motor}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-neutral-300 leading-relaxed font-medium">
                            {rec.justificacion}
                          </td>
                        </tr>
                      ))}
                      {(proyeccionData.proyecciones[activeMes] || []).length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-8 text-center bg-neutral-900/40 text-neutral-400 font-medium">
                            No hay sugerencias que superen los umbrales de seguridad para este período.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* MAPA XAI */}
              <div className="xl:col-span-7 space-y-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-6 bg-blue-500 rounded-sm shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
                    <h4 className="text-lg font-black tracking-widest uppercase text-neutral-200">
                      🗺️ Grafo Multipartito Explicable (XAI)
                    </h4>
                  </div>
                  {hoveredEnlace && (
                    <span className="text-xs font-black tracking-widest uppercase bg-neutral-800 text-emerald-400 border border-emerald-500/30 px-4 py-1.5 rounded-full animate-fadeIn shadow-lg">
                      {hoveredEnlace.label}
                    </span>
                  )}
                </div>

                <div className="relative rounded-3xl bg-neutral-950/80 border border-neutral-800/80 overflow-hidden shadow-2xl p-4 min-h-[500px] flex items-center justify-center">
                  <svg viewBox="0 0 780 480" className="w-full h-full max-h-[500px]">
                    <defs>
                      <marker
                        id="arrow"
                        viewBox="0 0 10 10"
                        refX="22"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#4b5563" />
                      </marker>
                    </defs>

                    {/* Enlaces y Conexiones */}
                    {enlaces.map((enlace, idx) => {
                      const isHovered = hoveredEnlace === enlace
                      const isApriori = enlace.type === 'apriori'
                      return (
                        <g key={`link-${idx}`}>
                          <line
                            x1={enlace.x1}
                            y1={enlace.y1}
                            x2={enlace.x2}
                            y2={enlace.y2}
                            stroke={isApriori ? '#ef4444' : isHovered ? '#10b981' : '#374151'}
                            strokeWidth={isHovered ? 3 : isApriori ? 2 : 1}
                            strokeDasharray={isApriori ? '6,6' : '0'}
                            className="transition-all duration-300"
                            markerEnd="url(#arrow)"
                          />
                          {/* Área invisible para el evento de hover */}
                          <line
                            x1={enlace.x1}
                            y1={enlace.y1}
                            x2={enlace.x2}
                            y2={enlace.y2}
                            stroke="transparent"
                            strokeWidth={16}
                            className="cursor-crosshair"
                            onMouseEnter={() => setHoveredEnlace(enlace)}
                            onMouseLeave={() => setHoveredEnlace(null)}
                          />
                        </g>
                      )
                    })}

                    {/* Nodos Interactivos */}
                    {nodos.map((nodo, idx) => {
                      let nodeColor = '#3b82f6' // Cliente
                      let strokeColor = '#2563eb'
                      
                      if (nodo.type === 'historial') {
                        nodeColor = '#10b981' // Historial
                        strokeColor = '#059669'
                      }
                      if (nodo.type === 'proyeccion') {
                        nodeColor = '#f59e0b' // Proyección
                        strokeColor = '#d97706'
                      }

                      return (
                        <g key={`node-${idx}`} className="group cursor-pointer">
                          <circle
                            cx={nodo.x}
                            cy={nodo.y}
                            r={nodo.type === 'cliente' ? 18 : 12}
                            fill={nodeColor}
                            stroke={strokeColor}
                            strokeWidth="2"
                            className="transition-all duration-300 group-hover:scale-[1.3] group-hover:fill-emerald-400 group-hover:stroke-emerald-300 shadow-2xl drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]"
                          />
                          <text
                            x={nodo.x}
                            y={(nodo.y || 0) - (nodo.type === 'cliente' ? 28 : 22)}
                            textAnchor="middle"
                            fill="#f3f4f6"
                            fontSize={11}
                            fontWeight="bold"
                            className="pointer-events-none select-none drop-shadow-md font-sans opacity-90 group-hover:opacity-100 group-hover:fill-white transition-all"
                          >
                            {nodo.label}
                          </text>
                        </g>
                      )
                    })}
                  </svg>

                  {/* Leyenda en el Footer del Mapa */}
                  <div className="absolute bottom-6 left-6 right-6 flex justify-between bg-neutral-900/95 backdrop-blur-xl p-4 rounded-2xl border border-neutral-700/50 text-[10px] sm:text-xs font-black tracking-widest text-neutral-300 uppercase shadow-2xl">
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.6)]"></span>
                      <span>Cliente Base</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]"></span>
                      <span>Historial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"></span>
                      <span>Proyección IA</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="w-8 border-t-[3px] border-dashed border-red-500 h-0"></span>
                      <span>Afinidad Apriori</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
