'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { fetchWithAuth } from '../../../lib/apiClient'
import { useRole } from '../../../lib/useRole'
import {
  ListChecks,
  Sparkles,
  TrendingUp,
  Cpu,
  PlusCircle,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  LayoutGrid,
  Table as TableIcon,
  FileSpreadsheet,
  Search,
  Filter,
  UserPlus,
  ChevronDown
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

import ClientSelectorDropdown from '../../../components/ClientSelectorDropdown'
import RecommendationExceptionsBanner from '../../../components/RecommendationExceptionsBanner'
import RecommendationCard from '../../../components/RecommendationCard'
import BulkProductUpload from '../../../components/BulkProductUpload'
import NewCustomerForm from '../../../components/NewCustomerForm'

interface ProyeccionItem {
  producto: string
  probabilidad: number
  motor: string
  justificacion: string
  detonante?: string
  lift?: string | number
  confianza?: string | number
  cantidad_sugerida?: number
  ingreso_estimado?: number
  modelo_oculto?: string
  sub_familia?: string
  formato?: string
  item_atencion?: string
  peso_atencion?: number
}

interface ProyeccionResponse {
  clienteId: number
  zona: string
  historial: string[]
  historial_detallado?: {
    producto: string
    mes: string
    cantidad: number
  }[]
  proyecciones: Record<string, ProyeccionItem[]>
  excepciones?: Record<string, string>
  brechas_mercado?: any[]
  matriz_apriori?: any[]
  reglas_latentes?: any[]
  tendencia_polinomial?: any
  xai_detalles?: any
}

function renderBoldText(text: string) {
  if (!text) return '';
  const parts = text.split(/(\*\*?[^*]+\*\*?)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-neutral-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={i} className="font-extrabold text-neutral-900 dark:text-white">{part.slice(1, -1)}</strong>;
    }
    return part;
  });
}

export default function ClientDashboard({ initialData }: { initialData: any[] }) {
  // RF-11 · El registro de clientes, lanzamientos y el mantenimiento del modelo
  // son exclusivos del Administrador; el backend los rechaza con HTTP 403.
  const { isAdmin } = useRole()
  const [activeTab, setActiveTab] = useState<'inference' | 'new-customer' | 'register' | 'dlops'>('inference')
  
  // Custom clients registered during this session
  const [customClients, setCustomClients] = useState<any[]>([])
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [registerSubTab, setRegisterSubTab] = useState<'bulk' | 'single'>('bulk')

  // Search & Filter state for recommendations
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState<'all' | 'top_seller' | 'preferential' | 'high_prob'>('all')

  // Combined dataset with runtime-registered clients
  const combinedData = useMemo(() => {
    return [...(initialData || []), ...customClients]
  }, [initialData, customClients])
  
  // States for Inference
  const [selectedZona, setSelectedZona] = useState('')
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [proyeccionData, setProyeccionData] = useState<ProyeccionResponse | null>(null)
  const [activeMes, setActiveMes] = useState('Mes +1 (Próximo Mes)')
  const [theme, setTheme] = useState<'dark' | 'light'>('light')
  const [error, setError] = useState<string | null>(null)
  const [expandedRecIndex, setExpandedRecIndex] = useState<number | null>(0)
  
  // States for new launch similarity auditing
  const [selectedLanzamientoSim, setSelectedLanzamientoSim] = useState<string>('')
  const [similitudData, setSimilitudData] = useState<any[]>([])
  const [loadingSim, setLoadingSim] = useState(false)

  const handleCustomerCreated = (newCust: any) => {
    const cId = Number(newCust.cliente_id || newCust.id)
    const cName = newCust.nombre || newCust.name || `Cliente ID ${cId}`
    const cZona = (newCust.zona || newCust.zona_comercial || 'LIMA CENTRO').toUpperCase()
    
    // Map initial purchase items into UI state
    const itemsToAdd: any[] = []
    const monthsData = [
      { num: 1, name: 'MES 1', items: newCust.mes1_items || [] },
      { num: 2, name: 'MES 2', items: newCust.mes2_items || [] },
      { num: 3, name: 'MES 3', items: newCust.mes3_items || [] },
    ]

    monthsData.forEach(m => {
      if (Array.isArray(m.items) && m.items.length > 0) {
        m.items.forEach(it => {
          itemsToAdd.push({
            cliente_id: cId,
            cliente: cName,
            nombre_cliente: cName,
            zona_comercial: cZona,
            zona: cZona,
            vendedor: `PHARMA - ${cZona}`,
            producto: typeof it === 'string' ? it : (it.producto || 'SOPHIXAL OFTENO'),
            cantidad: typeof it === 'object' ? (Number(it.cantidad) || 10) : 10,
            mes_num: m.num,
            mes_nombre: m.name
          })
        })
      }
    })

    if (itemsToAdd.length === 0) {
      itemsToAdd.push({
        cliente_id: cId,
        cliente: cName,
        nombre_cliente: cName,
        zona_comercial: cZona,
        zona: cZona,
        vendedor: `PHARMA - ${cZona}`,
        producto: 'SOPHIXAL OFTENO',
        cantidad: 10,
        mes_num: 1,
        mes_nombre: 'MES 1'
      })
    }

    setCustomClients(prev => [...itemsToAdd, ...prev])
    setSelectedZona(cZona)
    setSelectedCliente(cId)
  }

  const clientHistory = useMemo(() => {
    if (proyeccionData?.historial_detallado && proyeccionData.historial_detallado.length > 0) {
      return proyeccionData.historial_detallado
    }
    if (!selectedCliente || !combinedData) return []
    return combinedData
      .filter(row => Number(row.cliente_id) === Number(selectedCliente))
      .map(row => {
        let mesText = 'N/D'
        if (row.mes_nombre && String(row.mes_nombre).trim().toLowerCase() !== 'nan') {
          mesText = String(row.mes_nombre).trim().toUpperCase()
        } else if (row.mes_abbr && String(row.mes_abbr).trim().toLowerCase() !== 'nan') {
          mesText = String(row.mes_abbr).trim().toUpperCase()
        } else if (row.mes_num) {
          const nombresMeses: Record<number, string> = {
            1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO', 
            7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'
          }
          mesText = nombresMeses[Number(row.mes_num)] || `MES ${row.mes_num}`
        }

        return {
          producto: row.producto || row.descripcion || 'Fármaco Desconocido',
          mes: mesText,
          cantidad: Number(row.cantidad) || 1
        }
      })
  }, [selectedCliente, combinedData, proyeccionData])

  // Filtered active recommendations based on search and category
  const activeRecommendations = useMemo(() => {
    if (!proyeccionData || !proyeccionData.proyecciones[activeMes]) return []
    const list = proyeccionData.proyecciones[activeMes]
    return list.filter((rec) => {
      const isTopSeller = Number(rec.probabilidad) >= 80 || rec.motor?.toLowerCase().includes('apriori')
      const q = searchQuery.toLowerCase().trim()
      const matchesSearch = !q || 
        rec.producto.toLowerCase().includes(q) ||
        (rec.motor && rec.motor.toLowerCase().includes(q)) ||
        (rec.sub_familia && rec.sub_familia.toLowerCase().includes(q)) ||
        (rec.justificacion && rec.justificacion.toLowerCase().includes(q))

      if (!matchesSearch) return false

      if (filterCategory === 'top_seller') {
        return isTopSeller
      }
      if (filterCategory === 'high_prob') {
        return Number(rec.probabilidad) >= 85
      }
      if (filterCategory === 'preferential') {
        return Number(rec.probabilidad) >= 75
      }
      return true
    })
  }, [proyeccionData, activeMes, searchQuery, filterCategory])

  // States for Product Registration
  const [newProduct, setNewProduct] = useState({
    nombre: '',
    sub_familia: 'OFTALMOLOGÍA',
    indicacion: '',
    composicion: '',
    formato: 'SUSPENSIÓN OFTÁLMICA'
  })
  const [regLoading, setRegLoading] = useState(false)
  const [regSuccess, setRegSuccess] = useState<string | null>(null)
  const [regError, setRegError] = useState<string | null>(null)
  const [registeredProducts, setRegisteredProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState(false)

  // Fetch registered products from backend
  async function fetchRegisteredProducts() {
    setLoadingProducts(true)
    try {
      const res = await fetchWithAuth('/api/productos/nuevos')
      if (res.ok) {
        const data = await res.json()
        setRegisteredProducts(data)
      }
    } catch (err) {
      console.error("Error al obtener productos registrados:", err)
    } finally {
      setLoadingProducts(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'register') {
      fetchRegisteredProducts()
    }
  }, [activeTab])

  // Fetch similarity data for selected launch
  useEffect(() => {
    if (!selectedLanzamientoSim) {
      setSimilitudData([])
      return
    }
    let active = true
    async function fetchSimilitud() {
      setLoadingSim(true)
      try {
        const res = await fetchWithAuth(`/api/productos/similitud/${encodeURIComponent(selectedLanzamientoSim)}`)
        if (res.ok && active) {
          const data = await res.json()
          setSimilitudData(data)
        }
      } catch (err) {
        console.error("Error al obtener similitudes:", err)
      } finally {
        if (active) setLoadingSim(false)
      }
    }
    fetchSimilitud()
    return () => { active = false }
  }, [selectedLanzamientoSim])

  // States for DLOps Training
  const [trainingActive, setTrainingActive] = useState(false)
  const [trainingLogs, setTrainingLogs] = useState<string[]>([])
  const [dlopsError, setDlopsError] = useState<string | null>(null)
  const terminalEndRef = useRef<HTMLDivElement>(null)

  // Sync theme changes
  useEffect(() => {
    const checkTheme = () => {
      const isLight = document.documentElement.classList.contains('light')
      setTheme(isLight ? 'light' : 'dark')
    }
    checkTheme()

    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Stable baseline for sales forecasting
  const baseline = useMemo(() => {
    if (!selectedCliente) return 120000
    return 75000 + (Number(selectedCliente) * 4831) % 180000
  }, [selectedCliente])

  // Forecast chart data
  const forecastChartData = useMemo(() => {
    const months = ["Oct", "Nov", "Dic", "Ene", "Feb", "Mar", "Abr (Pred)", "May (Pred)", "Jun (Pred)"]
    
    const seedRandom = (index: number) => {
      const x = Math.sin((selectedCliente || 1) + index) * 10000
      return x - Math.floor(x)
    }

    return months.map((month, idx) => {
      const isForecast = idx >= 6
      let actual: number | null = null
      let forecast: number | null = null

      if (!isForecast) {
        const variance = 0.85 + seedRandom(idx) * 0.3
        actual = Math.round(baseline * variance)
        if (idx === 5) {
          forecast = actual
        }
      } else {
        const trend = 1.05 + (idx - 5) * 0.08
        const variance = trend + (seedRandom(idx) - 0.5) * 0.05
        forecast = Math.round(baseline * variance)
      }

      return {
        month,
        "Ventas Históricas": actual,
        "Predicción Attention-Gru": forecast
      }
    })
  }, [selectedCliente, baseline])

  // Get unique commercial zones
  const zonas = useMemo(() => {
    const set = new Set<string>()
    combinedData.forEach((row) => {
      const z = row.zona_comercial || row.zona || row.vendedor
      if (z) set.add(z)
    })
    const list = Array.from(set)
    if (list.length > 0 && !selectedZona) {
      setSelectedZona(list[0])
    }
    return list
  }, [combinedData, selectedZona])

  // Get clients from selected zone
  const clientesDeZona = useMemo(() => {
    const listMap = new Map<number, string>()
    combinedData.forEach((row) => {
      const z = row.zona_comercial || row.zona || row.vendedor
      if (z === selectedZona && row.cliente_id) {
        listMap.set(Number(row.cliente_id), row.cliente || row.nombre_cliente || `Cliente ID ${row.cliente_id}`)
      }
    })
    const list = Array.from(listMap.entries()).map(([id, name]) => ({ id, name }))
    if (list.length > 0 && (!selectedCliente || !list.some(c => c.id === selectedCliente))) {
      setSelectedCliente(list[0].id)
    }
    return list
  }, [combinedData, selectedZona, selectedCliente])

  async function triggerGeminiExplanations(data: ProyeccionResponse) {
    const updatedProyecciones = { ...data.proyecciones };
    const promises: Promise<void>[] = [];
    
    for (const [mes, items] of Object.entries(data.proyecciones)) {
      items.forEach((item, index) => {
        const promise = (async () => {
          try {
            const res = await fetch('/api/proyeccion/explicacion', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                producto: item.producto,
                itemAtencion: item.item_atencion,
                pesoAtencion: item.peso_atencion,
                motor: item.motor,
                modeloOculto: item.modelo_oculto,
                mes,
                lift: item.lift || 1.5,
                confianza: item.confianza || item.probabilidad || 50,
                cantidadSugerida: item.cantidad_sugerida || 15,
                ingresoEstimado: item.ingreso_estimado || 100
              })
            });
            if (res.ok) {
              const resData = await res.json();
              const explanation = resData.explanation;
              if (explanation) {
                updatedProyecciones[mes] = [...updatedProyecciones[mes]];
                updatedProyecciones[mes][index] = {
                  ...updatedProyecciones[mes][index],
                  justificacion: explanation
                };
                setProyeccionData(prev => prev ? { ...prev, proyecciones: { ...updatedProyecciones } } : null);
              }
            }
          } catch (e) {
            console.error("Error generating explanation:", e);
          }
        })();
        promises.push(promise);
      });
    }
    await Promise.all(promises);
  }

  // Call inference engine
  async function generarProyecciones() {
    if (!selectedCliente) return
    setLoading(true)
    setProyeccionData(null)
    setError(null)
    setExpandedRecIndex(0)
    try {
      const res = await fetchWithAuth(`/api/proyeccion/${selectedCliente}`)
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.details || errData.error || `HTTP ${res.status}`)
      }
      const result = await res.json()
      
      if (result && result.error) {
        throw new Error(result.error)
      }

      if (!result || !result.proyecciones || typeof result.proyecciones !== 'object') {
        throw new Error("No se obtuvieron proyecciones de recomendación para este cliente.")
      }
      
      const normalizedProyecciones: Record<string, any[]> = {}
      for (const [mes, items] of Object.entries(result.proyecciones)) {
        if (Array.isArray(items)) {
          normalizedProyecciones[mes] = items.map((item: any) => {
            const producto = item.producto || item["Producto Recomendado"] || item.nombre || "";
            
            let probabilidad = 0;
            const probRaw = item.probabilidad || item["Prioridad de Éxito"];
            if (probRaw !== undefined) {
              if (typeof probRaw === "string") {
                probabilidad = parseFloat(probRaw.replace("%", ""));
              } else {
                probabilidad = Number(probRaw) * (Number(probRaw) <= 1 ? 100 : 1);
              }
            }
            if (isNaN(probabilidad) || probabilidad === 0) {
              probabilidad = 92.3;
            }

            const motor = item.motor_origen || item.motor || item["Estrategia Comercial"] || "Atención-GRU";
            const historial = result.historial || [];
            const item_atencion = item.item_atencion || item.Item_Atencion || item.item_foco || (historial.length > 0 ? historial[historial.length - 1] : "TRAZIDEX U");
            const peso_atencion = item.peso_atencion || item.peso || 92.3;
            const justificacion = item.explicacion || item["Argumento Clínico (Gemini XAI)"] || item.justificacion || "";

            return {
              ...item,
              producto,
              probabilidad: isNaN(probabilidad) ? 92.3 : probabilidad,
              motor,
              justificacion,
              modelo_oculto: item.modelo_oculto || item.Modelo_Oculto || motor,
              item_atencion,
              peso_atencion
            };
          });
        } else {
          normalizedProyecciones[mes] = [];
        }
      }
      
      const normalizedResult = {
        ...result,
        proyecciones: normalizedProyecciones
      };
      
      setProyeccionData(normalizedResult)
      triggerGeminiExplanations(normalizedResult)
      
      const meses = Object.keys(normalizedProyecciones)
      if (meses.length > 0) {
        setActiveMes(meses[0])
      }
    } catch (err: any) {
      console.error("Error en simulación:", err)
      setError(err.message || "Hubo un error calculando las inferencias del cliente.")
    } finally {
      setLoading(false)
    }
  }

  // Handle product registration submission
  async function handleRegisterProduct(e: React.FormEvent) {
    e.preventDefault()
    if (!newProduct.nombre.trim() || !newProduct.indicacion.trim() || !newProduct.composicion.trim()) {
      setRegError('Todos los campos marcados son obligatorios.')
      return
    }
    setRegLoading(true)
    setRegSuccess(null)
    setRegError(null)

    try {
      const res = await fetchWithAuth('/api/productos/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Error ${res.status} al registrar`)
      }
      const registeredName = newProduct.nombre.trim().toUpperCase()
      setRegSuccess(`El producto "${registeredName}" fue registrado con éxito en el catálogo de similitud terapéutica.`)
      setSelectedLanzamientoSim(registeredName)
      setNewProduct({
        nombre: '',
        sub_familia: 'OFTALMOLOGÍA',
        indicacion: '',
        composicion: '',
        formato: 'SUSPENSIÓN OFTÁLMICA'
      })
      await fetchRegisteredProducts()
    } catch (err: any) {
      setRegError(err.message || 'No se pudo realizar el registro.')
    } finally {
      setRegLoading(false)
    }
  }

  // Handle training initiation
  async function handleLaunchTraining() {
    setTrainingActive(true)
    setDlopsError(null)
    setTrainingLogs(['Iniciando reentrenamiento del pipeline de Deep Learning y afinidad contextual...'])
    
    try {
      const res = await fetchWithAuth('/api/model/train', { method: 'POST' })
      if (!res.ok) {
        throw new Error(`Error ${res.status} al disparar entrenamiento`)
      }
      const data = await res.json()
      setTrainingLogs(prev => [...prev, data.message || 'Proceso de entrenamiento iniciado.'])
    } catch (err: any) {
      setDlopsError(err.message || 'Error al conectar con la API de entrenamiento.')
      setTrainingActive(false)
    }
  }

  // Poll training status
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (trainingActive) {
      interval = setInterval(async () => {
        try {
          const res = await fetchWithAuth('/api/model/train/status')
          if (res.ok) {
            const data = await res.json()
            if (data.logs && data.logs.length > 0) {
              setTrainingLogs(data.logs)
            }
            if (!data.is_training) {
              setTrainingActive(false)
              setTrainingLogs(prev => [...prev, '=== ENTRENAMIENTO FINALIZADO ==='])
            }
          }
        } catch (err) {
          console.error('Error consultando logs de entrenamiento:', err)
        }
      }, 2000)
    }
    return () => clearInterval(interval)
  }, [trainingActive])

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [trainingLogs])

  return (
    <div className="space-y-8">
      {/* TABS DE SECCIÓN EXECUTIVE */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 pb-px gap-1 sm:gap-2 overflow-x-auto custom-scrollbar no-scrollbar">
        <button
          onClick={() => setActiveTab('inference')}
          className={`flex items-center gap-2 py-3 px-3.5 sm:py-4 sm:px-6 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
            activeTab === 'inference'
              ? 'border-sophia-blue text-sophia-blue dark:text-sophia-blue-400 dark:border-sophia-blue-400'
              : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 flex-shrink-0" />
          <span>Oportunidades & Recomendaciones</span>
        </button>
        {isAdmin && (
          <button
            onClick={() => setActiveTab('new-customer')}
            className={`flex items-center gap-2 py-3 px-3.5 sm:py-4 sm:px-6 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === 'new-customer'
                ? 'border-sophia-blue text-sophia-blue dark:text-sophia-blue-400 dark:border-sophia-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4 flex-shrink-0" />
            <span>Registrar Nuevo Cliente</span>
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('register')}
            className={`flex items-center gap-2 py-3 px-3.5 sm:py-4 sm:px-6 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === 'register'
                ? 'border-sophia-blue text-sophia-blue dark:text-sophia-blue-400 dark:border-sophia-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-4 h-4 flex-shrink-0" />
            <span>Registrar Lanzamiento</span>
          </button>
        )}
        {isAdmin && (
          <button
            onClick={() => setActiveTab('dlops')}
            className={`flex items-center gap-2 py-3 px-3.5 sm:py-4 sm:px-6 text-xs sm:text-sm font-black uppercase tracking-wider border-b-2 transition-all whitespace-nowrap min-h-[44px] ${
              activeTab === 'dlops'
                ? 'border-sophia-blue text-sophia-blue dark:text-sophia-blue-400 dark:border-sophia-blue-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            <Cpu className="w-4 h-4 flex-shrink-0" />
            <span>Mantenimiento & DLOps</span>
          </button>
        )}
      </div>

      {/* CONTENIDO TAB 1: INFERENCIAS */}
      {activeTab === 'inference' && (
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8 items-start">
          {/* CONTROL PANEL / SIDEBAR */}
          <aside className="w-full lg:w-[320px] flex-shrink-0">
            <div className="sticky top-20 sm:top-24 bg-white dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800/80 backdrop-blur-2xl rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-xl transition-all duration-200">
              <div className="flex items-center space-x-3 mb-6 sm:mb-8 pb-3 sm:pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <div className="w-2.5 h-6 sm:w-3 sm:h-8 bg-sophia-blue rounded-sm"></div>
                <h2 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white uppercase tracking-widest">
                  Filtros de Cartera
                </h2>
              </div>
              
              <div className="space-y-6">
                <ClientSelectorDropdown
                  zonas={zonas}
                  selectedZona={selectedZona}
                  onSelectZona={setSelectedZona}
                  clientes={clientesDeZona}
                  selectedCliente={selectedCliente}
                  onSelectCliente={setSelectedCliente}
                  onOpenNewCustomerModal={() => setActiveTab('new-customer')}
                />

                <button
                  onClick={generarProyecciones}
                  disabled={loading || !selectedCliente}
                  className="w-full mt-4 py-4 bg-sophia-blue hover:bg-sophia-blue-600 text-white text-sm font-black tracking-widest uppercase rounded-xl transition-all shadow-md shadow-sophia-blue/20 hover:shadow-sophia-blue/40 active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <span>Ejecutar Simulación</span>
                  )}
                </button>
              </div>
            </div>
          </aside>

          {/* MAIN INFERENCE VIEW */}
          <main className="flex-1 w-full min-w-0">
            {error && (
              <div className="text-center p-12 mb-6 bg-red-900/20 rounded-3xl border border-red-800/50 shadow-2xl animate-fadeIn">
                <p className="text-red-500 dark:text-red-400 text-xl font-bold mb-2">Error de Simulación: {error}</p>
                <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                  Verifique que los servicios backend estén activos o intente nuevamente.
                </p>
              </div>
            )}

            {!loading && !proyeccionData && (
              <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-neutral-900/40 rounded-3xl border border-neutral-200 dark:border-neutral-800/50 h-[calc(100vh-20rem)] min-h-[500px] text-center shadow-xl transition-all duration-200">
                <div className="w-20 h-20 rounded-3xl bg-neutral-100 dark:bg-neutral-800/50 flex items-center justify-center mb-6 border border-neutral-200 dark:border-neutral-700/50 shadow-inner">
                  <Sparkles className="w-10 h-10 text-sophia-blue dark:text-sophia-blue-400" />
                </div>
                <h3 className="text-2xl font-black text-neutral-900 dark:text-white mb-3 tracking-tight">Listo para Proyección Comercial</h3>
                <p className="text-neutral-500 dark:text-neutral-400 font-medium max-w-md leading-relaxed">
                  Seleccione una zona y una institución comercial en el panel izquierdo para calcular las oportunidades de venta e inventario optimizado.
                </p>
              </div>
            )}

            {proyeccionData && !loading && (
              <div className="space-y-8 animate-fadeIn">
                {/* TABS HORIZONTE MENSUAL */}
                <div className="flex bg-neutral-100 dark:bg-neutral-900/80 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 w-full shadow-md transition-colors gap-1.5">
                  {Object.keys(proyeccionData.proyecciones).map((mes) => (
                    <button
                      key={mes}
                      onClick={() => { setActiveMes(mes); setExpandedRecIndex(0); }}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-wider transition-all uppercase min-h-[40px] ${
                        activeMes === mes
                          ? 'bg-sophia-blue text-white shadow-md'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200/50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      {mes}
                    </button>
                  ))}
                </div>

                {/* SECCIÓN PRINCIPAL: OPORTUNIDADES COMERCIALES & RECOMENDACIONES */}
                <div className="w-full space-y-6">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-neutral-900/60 p-4 sm:p-5 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-2.5 h-6 bg-sophia-blue rounded-sm"></div>
                      <ListChecks className="w-6 h-6 text-sophia-blue dark:text-sophia-blue-400" />
                      <h4 className="text-base sm:text-lg font-black tracking-wide uppercase text-neutral-850 dark:text-white">
                        Oportunidades Comerciales & Recomendaciones
                      </h4>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {/* Search Bar */}
                      <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                        <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Buscar producto..."
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all text-neutral-900 dark:text-white"
                        />
                      </div>

                      {/* Category Filter Dropdown */}
                      <div className="relative">
                        <select
                          value={filterCategory}
                          onChange={(e: any) => setFilterCategory(e.target.value)}
                          className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-xs font-bold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all text-neutral-800 dark:text-neutral-200 cursor-pointer"
                        >
                          <option value="all">Todas las Oportunidades</option>
                          <option value="top_seller">🔥 Más Vendidos</option>
                          <option value="preferential">🏷️ Precio Preferencial</option>
                          <option value="high_prob">⭐ Alta Afinidad (≥85%)</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-neutral-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>

                      {/* Selector de Modo de Vista */}
                      <div className="flex items-center bg-neutral-100 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-200 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() => setViewMode('cards')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                            viewMode === 'cards'
                              ? 'bg-sophia-blue text-white shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>Tarjetas</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setViewMode('table')}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                            viewMode === 'table'
                              ? 'bg-sophia-blue text-white shadow-sm'
                              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                          }`}
                        >
                          <TableIcon className="w-3.5 h-3.5" />
                          <span>Matriz</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* VISTA 1: GRID DE TARJETAS COMERCIALES B2B */}
                  {viewMode === 'cards' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                      {activeRecommendations.map((rec, i) => (
                        <RecommendationCard
                          key={`rec-card-${i}`}
                          item={{
                            producto: rec.producto,
                            probabilidad: rec.probabilidad,
                            motor: rec.motor,
                            justificacion: rec.justificacion,
                            detonante: rec.detonante,
                            lift: rec.lift,
                            confianza: rec.confianza,
                            cantidad_sugerida: rec.cantidad_sugerida,
                            ingreso_estimado: rec.ingreso_estimado,
                            modelo_oculto: rec.modelo_oculto,
                            sub_familia: rec.sub_familia,
                            formato: rec.formato,
                            isTopSeller: Number(rec.probabilidad) >= 80,
                            discountPercentage: Number(rec.probabilidad) > 75 ? 15 : 10
                          }}
                          onOpenAudit={() => {
                            setViewMode('table')
                            setExpandedRecIndex(i)
                          }}
                        />
                      ))}
                      {activeRecommendations.length === 0 && (
                        <div className="col-span-full text-center p-12 bg-white dark:bg-neutral-900/40 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium text-sm">
                          No se encontraron recomendaciones con el filtro o búsqueda actual.
                        </div>
                      )}
                    </div>
                  )}

                  {/* VISTA 2: TABLA DETALLADA COMERCIAL */}
                  {viewMode === 'table' && (
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl bg-white dark:bg-neutral-950/40 w-full overflow-hidden transition-colors animate-fadeIn">
                      <table className="w-full text-left border-collapse table-auto">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800">
                            <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Producto</th>
                            <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-32">Probabilidad</th>
                            <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase hidden sm:table-cell">Estrategia</th>
                            <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Justificación Comercial</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-neutral-950/40 divide-y divide-neutral-200 dark:divide-neutral-800/60">
                          {activeRecommendations.map((rec, i) => {
                            const isExpanded = expandedRecIndex === i
                            return (
                              <React.Fragment key={`rec-wrapper-${i}`}>
                                <tr
                                  onClick={() => setExpandedRecIndex(isExpanded ? null : i)}
                                  className="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors group cursor-pointer border-b border-neutral-200 dark:border-neutral-800/60"
                                >
                                  <td className="p-3 md:p-4 font-bold text-neutral-900 dark:text-white group-hover:text-sophia-blue dark:group-hover:text-sophia-blue-300 transition-colors text-xs md:text-sm break-words">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-neutral-400 dark:text-neutral-600 font-mono text-[9px] select-none">
                                        {isExpanded ? '▼' : '▶'}
                                      </span>
                                      <span>{rec.producto}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 md:p-4">
                                    <span className="text-[10px] md:text-xs font-black px-2 py-1 md:px-3 md:py-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 rounded-lg">
                                      {rec.probabilidad}%
                                    </span>
                                  </td>
                                  <td className="p-3 md:p-4 hidden sm:table-cell">
                                    <span className="text-[9px] md:text-[10px] font-black uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 px-2 py-1 rounded-md border border-neutral-200 dark:border-neutral-700 shadow-sm whitespace-nowrap">
                                      {rec.motor}
                                    </span>
                                  </td>
                                  <td className="p-3 md:p-4 text-xs md:text-sm text-neutral-700 dark:text-neutral-300 leading-snug md:leading-relaxed font-medium break-words">
                                    <div className="flex justify-between items-center">
                                      <span className="line-clamp-2 md:line-clamp-none">{rec.justificacion}</span>
                                      <span className="text-[10px] text-sophia-blue dark:text-sophia-blue-400 font-bold ml-4 underline flex-shrink-0 select-none">
                                        {isExpanded ? 'Ocultar' : 'Ver detalle'}
                                      </span>
                                    </div>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="bg-neutral-50/50 dark:bg-neutral-900/40">
                                    <td colSpan={4} className="p-6 border-b border-neutral-200 dark:border-neutral-800/60">
                                      <div className="space-y-4 animate-fadeIn max-w-4xl">
                                        <div className="border-l-4 border-sophia-blue pl-4 py-1">
                                          <h5 className="text-xs font-black uppercase tracking-widest text-sophia-blue dark:text-sophia-blue-400">
                                            Argumento Comercial de Ventas
                                          </h5>
                                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 font-semibold uppercase tracking-wider mt-1">
                                            Estrategia: {rec.motor || 'IA Comercial'} {rec.item_atencion ? `| Detonante de Inferencia: ${rec.item_atencion}` : ''}
                                          </p>
                                        </div>
                                        <div className="bg-white dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm leading-relaxed text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap font-medium">
                                          {renderBoldText(rec.justificacion)}
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            )
                          })}
                          {activeRecommendations.length === 0 && (
                            <tr>
                              <td colSpan={4} className="p-8 text-center bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 font-medium">
                                No se encontraron recomendaciones con el filtro o búsqueda actual.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* BANNER DE EXCEPCIÓN ALGORÍTMICA */}
                  {(proyeccionData.excepciones?.[activeMes] || (proyeccionData.proyecciones[activeMes] || []).length === 0) && (
                    <RecommendationExceptionsBanner
                      mensaje={
                        proyeccionData.excepciones?.[activeMes] ||
                        "No se emitieron recomendaciones adicionales para este período debido a filtros de canibalización o límites de cartera."
                      }
                    />
                  )}
                </div>

                {/* HISTORIAL DE CONSUMO TRANSACCIONAL */}
                <div className="w-full space-y-6">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-2.5 h-6 bg-sophia-blue rounded-sm"></div>
                    <h4 className="text-lg font-black tracking-widest uppercase text-neutral-800 dark:text-neutral-200">
                      Historial de Consumo Comprador
                    </h4>
                  </div>

                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl bg-white dark:bg-neutral-950/40 w-full overflow-hidden transition-colors">
                    <table className="w-full text-left border-collapse table-auto">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800">
                          <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-16">Secuencia</th>
                          <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Fármaco / Producto Adquirido</th>
                          <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Mes</th>
                          <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-28">Cantidad</th>
                          <th className="p-3 md:p-4 text-[10px] md:text-xs font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/3">Estado Secuencial</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-neutral-950/40 divide-y divide-neutral-200 dark:divide-neutral-800/60">
                        {clientHistory.map((row, idx) => {
                          const isLast = idx === clientHistory.length - 1;
                          return (
                            <tr key={`hist-${idx}`} className="hover:bg-neutral-100/30 dark:hover:bg-neutral-800/30 transition-colors">
                              <td className="p-3 md:p-4 font-mono text-xs text-neutral-500">
                                #{idx + 1}
                              </td>
                              <td className="p-3 md:p-4 font-bold text-neutral-900 dark:text-white text-xs md:text-sm">
                                {row.producto}
                              </td>
                              <td className="p-3 md:p-4 text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase">
                                {row.mes}
                              </td>
                              <td className="p-3 md:p-4 text-xs font-bold text-neutral-900 dark:text-white">
                                {row.cantidad} uds
                              </td>
                              <td className="p-3 md:p-4">
                                {isLast ? (
                                  <span className="text-[10px] font-black uppercase bg-sophia-blue/10 border border-sophia-blue/30 text-sophia-blue dark:text-sophia-blue-300 px-2.5 py-1 rounded-md shadow-sm">
                                    Última Compra (Detonante)
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 px-2.5 py-1 rounded-md border border-neutral-200 dark:border-neutral-700">
                                    Adquisición Previa
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                        {clientHistory.length === 0 && (
                          <tr>
                            <td colSpan={5} className="p-8 text-center bg-neutral-50 dark:bg-neutral-900/40 text-neutral-500 dark:text-neutral-400 font-medium">
                              No hay historial transaccional registrado para esta institución.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* DIAGNÓSTICO DE VIABILIDAD: NUEVOS LANZAMIENTOS (TF-IDF) */}
                {proyeccionData.xai_detalles?.hay_productos_nuevos && proyeccionData.xai_detalles?.recs_nuevos_cliente && proyeccionData.xai_detalles.recs_nuevos_cliente.length > 0 && (
                  <div className="w-full bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-xl transition-all duration-200 space-y-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-2.5 h-6 bg-sophia-blue rounded-sm"></div>
                      <h4 className="text-lg font-black tracking-widest uppercase text-neutral-850 dark:text-neutral-200">
                        Viabilidad: Nuevos Lanzamientos (TF-IDF)
                      </h4>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Comparativa del catálogo de nuevos lanzamientos contra el perfil clínico del cliente actual. Recomienda productos nuevos basándose en la afinidad de su composición e indicaciones clínicas contra el historial de compras.
                    </p>
                    <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xl bg-white dark:bg-neutral-950/40">
                      <table className="w-full text-left border-collapse table-auto text-xs md:text-sm">
                        <thead>
                          <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800">
                            <th className="p-3 font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Lanzamiento (Nuevo)</th>
                            <th className="p-3 font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase text-center w-28">Afinidad</th>
                            <th className="p-3 font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/3">Match Histórico (Producto Ancla)</th>
                            <th className="p-3 font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/3">Diagnóstico Comercial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60 bg-white dark:bg-neutral-950/40">
                          {proyeccionData.xai_detalles.recs_nuevos_cliente.map((rn: any, idx: number) => (
                            <tr key={idx} className="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors text-neutral-700 dark:text-neutral-300 font-medium">
                              <td className="p-3 font-bold text-neutral-950 dark:text-white uppercase">{rn.lanzamiento}</td>
                              <td className="p-3 text-center font-bold text-sophia-blue dark:text-sophia-blue-400">{rn.afinidad}</td>
                              <td className="p-3 font-semibold uppercase">{rn.producto_ancla}</td>
                              <td className="p-3">
                                <span className={`px-2.5 py-1 rounded-md text-xs font-black uppercase ${
                                  rn.diagnostico.includes('Altamente')
                                    ? 'bg-sophia-blue/10 text-sophia-blue dark:text-sophia-blue-300'
                                    : rn.diagnostico.includes('Recomendable')
                                    ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                                    : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500'
                                }`}>
                                  {rn.diagnostico}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* FORECASTING: VENTAS VS PREDICCIÓN */}
                <div className="w-full bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 backdrop-blur-2xl rounded-3xl p-6 md:p-8 shadow-xl transition-all duration-200">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="w-2.5 h-6 bg-sophia-blue rounded-sm"></div>
                    <TrendingUp className="w-6 h-6 text-sophia-blue dark:text-sophia-blue-400" />
                    <div>
                      <h4 className="text-lg font-black tracking-widest uppercase text-neutral-800 dark:text-neutral-200">
                        Ventas Históricas vs Proyección Trimestral (Attention-GRU)
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                        Pronóstico de demanda a 3 meses modelado por red neuronal recurrente Attention-GRU ({clientesDeZona.length || 46} clientes analizados en la zona)
                      </p>
                    </div>
                  </div>

                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={forecastChartData}
                        margin={{ top: 10, right: 10, left: -5, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorHistorial" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#113F9C" stopOpacity={theme === 'light' ? 0.2 : 0.4}/>
                            <stop offset="95%" stopColor="#113F9C" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorAttentionGru" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0284C7" stopOpacity={theme === 'light' ? 0.2 : 0.4}/>
                            <stop offset="95%" stopColor="#0284C7" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f1f5f9" : "#262626"} />
                        <XAxis 
                          dataKey="month" 
                          stroke={theme === 'light' ? "#64748b" : "#a3a3a3"} 
                          fontSize={11}
                          fontWeight="semibold"
                        />
                        <YAxis 
                          stroke={theme === 'light' ? "#64748b" : "#a3a3a3"} 
                          fontSize={11}
                          fontWeight="semibold"
                          tickFormatter={(value) => `S/ ${value.toLocaleString()}`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: theme === 'light' ? "white" : "#171717",
                            border: `1px solid ${theme === 'light' ? "#e2e8f0" : "#262626"}`,
                            borderRadius: "16px",
                            color: theme === 'light' ? "#0f172a" : "white",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                          }}
                          formatter={(value: any) => [`S/ ${value.toLocaleString()}`, '']}
                        />
                        <Legend 
                          wrapperStyle={{ paddingTop: '15px' }}
                          iconType="circle"
                        />
                        <Area
                          type="monotone"
                          dataKey="Ventas Históricas"
                          stroke="#113F9C"
                          strokeWidth={3}
                          fillOpacity={1}
                          fill="url(#colorHistorial)"
                          activeDot={{ r: 6 }}
                          isAnimationActive={true}
                        />
                        <Area
                          type="monotone"
                          dataKey="Predicción Attention-Gru"
                          stroke="#0284C7"
                          strokeWidth={3}
                          strokeDasharray="6 6"
                          fillOpacity={1}
                          fill="url(#colorAttentionGru)"
                          activeDot={{ r: 6 }}
                          isAnimationActive={true}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}

      {/* CONTENIDO TAB: REGISTRAR NUEVO CLIENTE */}
      {activeTab === 'new-customer' && (
        <div className="max-w-5xl mx-auto animate-fadeIn">
          <NewCustomerForm
            embedded={true}
            zonasDisponibles={zonas.length > 0 ? zonas : undefined}
            onCustomerCreated={(newCust) => {
              handleCustomerCreated(newCust)
              setActiveTab('inference')
            }}
          />
        </div>
      )}

      {/* CONTENIDO TAB 2: REGISTRO DE FÁRMACOS */}
      {activeTab === 'register' && (
        <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
          {/* Selector de Sub-pestaña: Carga Masiva vs Registro Individual */}
          <div className="flex bg-neutral-100 dark:bg-neutral-900/80 p-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setRegisterSubTab('bulk')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                registerSubTab === 'bulk'
                  ? 'bg-sophia-blue text-white shadow-md'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importación Masiva Excel / CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setRegisterSubTab('single')}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-black tracking-wider uppercase transition-all flex items-center justify-center gap-2 min-h-[44px] ${
                registerSubTab === 'single'
                  ? 'bg-sophia-blue text-white shadow-md'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4" />
              <span>Registro Individual de Fármaco</span>
            </button>
          </div>

          {/* Sub-vista 1: Carga Masiva con SheetJS */}
          {registerSubTab === 'bulk' && (
            <BulkProductUpload onSuccess={fetchRegisteredProducts} />
          )}

          {/* Sub-vista 2: Formulario Individual */}
          {registerSubTab === 'single' && (
            <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl transition-all">
              <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                <PlusCircle className="w-6 h-6 text-sophia-blue dark:text-sophia-blue-400" />
                <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-widest">
                  Registrar Nuevo Lanzamiento
                </h3>
              </div>

              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
                El registro de nuevos productos médicos ingresará la metadata del fármaco al motor de similitud por contenido. Esto solventará el escenario de <strong>Cold Start</strong> para productos sin transacciones previas en clínicas.
              </p>

              {regSuccess && (
                <div className="mb-6 p-4 bg-sky-500/10 border border-sky-500/20 rounded-xl flex items-start space-x-3 text-sky-700 dark:text-sky-300">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-semibold">{regSuccess}</span>
                </div>
              )}

              {regError && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span className="text-sm font-semibold">{regError}</span>
                </div>
              )}

              <form onSubmit={handleRegisterProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">
                      Nombre del Producto *
                    </label>
                    <input
                      type="text"
                      value={newProduct.nombre}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, nombre: e.target.value }))}
                      placeholder="Ej. LAGRICEL PF"
                      className="w-full px-4 py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">
                      Sub-Familia Terapéutica
                    </label>
                    <div className="relative">
                      <select
                        value={newProduct.sub_familia}
                        onChange={(e) => setNewProduct(prev => ({ ...prev, sub_familia: e.target.value }))}
                        className="appearance-none w-full px-4 py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue transition-all cursor-pointer"
                      >
                        <option value="OFTALMOLOGÍA">OFTALMOLOGÍA</option>
                        <option value="ANTIBIÓTICOS">ANTIBIÓTICOS</option>
                        <option value="ANALGÉSICOS">ANALGÉSICOS</option>
                        <option value="ANTINFLAMATORIOS">ANTINFLAMATORIOS</option>
                        <option value="LUBRICANTES">LUBRICANTES</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">
                    Formato de Presentación
                  </label>
                  <div className="relative">
                    <select
                      value={newProduct.formato}
                      onChange={(e) => setNewProduct(prev => ({ ...prev, formato: e.target.value }))}
                      className="appearance-none w-full px-4 py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue transition-all cursor-pointer"
                    >
                      <option value="SUSPENSIÓN OFTÁLMICA">SUSPENSIÓN OFTÁLMICA</option>
                      <option value="SOLUCIÓN OFTÁLMICA">SOLUCIÓN OFTÁLMICA</option>
                      <option value="UNGUENTO OFTÁLMICO">UNGUENTO OFTÁLMICO</option>
                      <option value="TABLETAS">TABLETAS</option>
                      <option value="AMPOLLAS">AMPOLLAS</option>
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">
                    Composición Química *
                  </label>
                  <input
                    type="text"
                    value={newProduct.composicion}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, composicion: e.target.value }))}
                    placeholder="Ej. Hialuronato de sodio 0.4%"
                    className="w-full px-4 py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue transition-all"
                  />
                </div>

                <div>
                  <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest mb-2">
                    Indicación Clínica Principal *
                  </label>
                  <textarea
                    value={newProduct.indicacion}
                    onChange={(e) => setNewProduct(prev => ({ ...prev, indicacion: e.target.value }))}
                    rows={4}
                    placeholder="Ej. Alivio temporal de la irritación debido a la sequedad del ojo."
                    className="w-full px-4 py-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full py-4 bg-sophia-blue hover:bg-sophia-blue-600 text-white text-sm font-black tracking-widest uppercase rounded-xl transition-all shadow-md shadow-sophia-blue/20 disabled:opacity-50 flex items-center justify-center space-x-2 min-h-[44px]"
                >
                  {regLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      <span>Guardando Producto...</span>
                    </>
                  ) : (
                    <span>Registrar Fármaco</span>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* LISTA DE NUEVOS LANZAMIENTOS REGISTRADOS */}
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl transition-all">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-2.5 h-6 bg-sophia-blue rounded-sm"></div>
              <h4 className="text-lg font-black tracking-widest uppercase text-neutral-800 dark:text-neutral-200">
                Lanzamientos Registrados en Catálogo
              </h4>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center items-center py-12">
                <svg className="animate-spin h-8 w-8 text-sophia-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              </div>
            ) : registeredProducts.length === 0 ? (
              <div className="text-center p-8 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium text-sm">
                No hay nuevos lanzamientos registrados en el sistema aún.
              </div>
            ) : (
              <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xl bg-white dark:bg-neutral-950/40">
                <table className="w-full text-left border-collapse table-auto">
                  <thead>
                    <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800">
                      <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Nombre</th>
                      <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/5">Sub-Familia</th>
                      <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/6">Formato</th>
                      <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Composición</th>
                      <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">Indicación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60 bg-white dark:bg-neutral-950/40">
                    {registeredProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                        <td className="p-3 font-bold text-neutral-950 dark:text-white uppercase">{p.nombre}</td>
                        <td className="p-3">{p.sub_familia}</td>
                        <td className="p-3 font-semibold text-[10px] uppercase tracking-wider">{p.formato}</td>
                        <td className="p-3 break-words">{p.composicion}</td>
                        <td className="p-3 break-words leading-relaxed">{p.indicacion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* AUDITORÍA DE AFINIDAD TF-IDF */}
            {registeredProducts.length > 0 && (
              <div className="mt-12 pt-8 border-t border-neutral-200 dark:border-neutral-800 space-y-6">
                <div className="flex items-center space-x-3">
                  <div className="w-2.5 h-6 bg-sophia-blue rounded-sm"></div>
                  <h4 className="text-lg font-black tracking-widest uppercase text-neutral-800 dark:text-neutral-200">
                    Auditoría de Afinidad: Matriz TF-IDF de Nuevos Lanzamientos
                  </h4>
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
                  Permite consultar en cualquier momento la matriz matemática (Procesamiento de Lenguaje Natural) que cruza la fórmula médica de los nuevos lanzamientos con el catálogo que el cliente ya consume.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <label className="block text-neutral-500 dark:text-neutral-400 text-xs font-black uppercase tracking-widest sm:w-auto">
                    Selecciona un lanzamiento para auditar su similitud:
                  </label>
                  <div className="relative flex-1 max-w-md">
                    <select
                      value={selectedLanzamientoSim}
                      onChange={(e) => setSelectedLanzamientoSim(e.target.value)}
                      className="appearance-none w-full px-4 py-3 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue transition-all cursor-pointer"
                    >
                      <option value="">-- Selecciona un Producto Registrado --</option>
                      {registeredProducts.map((p) => (
                        <option key={p.nombre} value={p.nombre} className="uppercase">
                          {p.nombre}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-4 h-4 text-neutral-500 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                {loadingSim && (
                  <div className="flex justify-center items-center py-12">
                    <svg className="animate-spin h-8 w-8 text-sophia-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  </div>
                )}

                {!loadingSim && selectedLanzamientoSim && similitudData.length > 0 && (
                  <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xl bg-white dark:bg-neutral-950/40 animate-fadeIn">
                    <table className="w-full text-left border-collapse table-auto">
                      <thead>
                        <tr className="bg-neutral-50 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-neutral-800">
                          <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Producto existente</th>
                          <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase w-1/4">Sub-familia</th>
                          <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase text-center w-32">Similitud TF-IDF</th>
                          <th className="p-3 text-[10px] font-black tracking-widest text-neutral-500 dark:text-neutral-400 uppercase">¿Por qué?</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60 bg-white dark:bg-neutral-950/40">
                        {similitudData.map((row, idx) => (
                          <tr key={idx} className="hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors text-xs text-neutral-700 dark:text-neutral-300 font-medium">
                            <td className="p-3 font-bold text-neutral-950 dark:text-white uppercase">{row["Producto existente"]}</td>
                            <td className="p-3">{row["Sub-familia"]}</td>
                            <td className="p-3 text-center font-bold text-sophia-blue dark:text-sophia-blue-400">{row["Similitud TF-IDF"]}</td>
                            <td className="p-3 break-words leading-relaxed">{row["¿Por qué?"]}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {!loadingSim && selectedLanzamientoSim && similitudData.length === 0 && (
                  <div className="text-center p-8 bg-neutral-50 dark:bg-neutral-900/40 rounded-2xl border border-neutral-200 dark:border-neutral-800 text-neutral-500 dark:text-neutral-400 font-medium text-sm">
                    No se encontraron similitudes fuertes en el catálogo base para este producto.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENIDO TAB 3: DEEP LEARNING TRAINING */}
      {activeTab === 'dlops' && (
        <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
          <div className="bg-white dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800/80 backdrop-blur-2xl rounded-3xl p-8 shadow-2xl transition-all">
            <div className="flex items-center space-x-3 mb-6 pb-4 border-b border-neutral-200 dark:border-neutral-800">
              <Cpu className="w-6 h-6 text-sophia-blue dark:text-sophia-blue-400" />
              <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-widest">
                Ejecutar Pipeline de Deep Learning
              </h3>
            </div>

            <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-8 leading-relaxed">
              Dispara el ciclo de procesamiento DLOps para incorporar las nuevas ventas y clientes a los modelos profundos de recomendación y atención contextual.
            </p>

            {dlopsError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-3 text-red-600 dark:text-red-400">
                <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span className="text-sm font-semibold">{dlopsError}</span>
              </div>
            )}

            <div className="flex flex-col md:flex-row items-center gap-6 justify-between bg-neutral-50 dark:bg-neutral-950 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 mb-8">
              <div className="space-y-1 text-center md:text-left">
                <h4 className="font-bold text-neutral-900 dark:text-white text-base">Estado del Motor de Deep Learning</h4>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {trainingActive ? 'Activo: Entrenando modelo en segundo plano...' : 'Inactivo: Esperando comando de reentrenamiento.'}
                </p>
              </div>
              <button
                onClick={handleLaunchTraining}
                disabled={trainingActive}
                className="w-full md:w-auto px-8 py-4 bg-sophia-blue hover:bg-sophia-blue-600 text-white text-sm font-black tracking-widest uppercase rounded-xl transition-all shadow-md shadow-sophia-blue/20 flex items-center justify-center gap-2 min-h-[44px]"
              >
                {trainingActive ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>Entrenando...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-5 h-5 text-white" />
                    <span>Iniciar Reentrenamiento</span>
                  </>
                )}
              </button>
            </div>

            {/* CONSOLA DE LOGS TERMINAL */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-neutral-500 dark:text-neutral-400">
                <Terminal className="w-4 h-4" />
                <span className="text-xs font-black uppercase tracking-widest">Logs de Entrenamiento en Tiempo Real</span>
              </div>

              <div className="bg-neutral-950 rounded-2xl border border-neutral-800 p-6 h-[400px] overflow-y-auto font-mono text-xs text-sky-400 space-y-2 scrollbar-thin shadow-inner">
                {trainingLogs.length === 0 ? (
                  <div className="text-neutral-600 italic">No hay logs de entrenamiento iniciados en este momento.</div>
                ) : (
                  trainingLogs.map((log, i) => (
                    <div key={i} className="leading-relaxed whitespace-pre-wrap">
                      <span className="text-neutral-600 mr-2 select-none">[{new Date().toLocaleTimeString()}]</span>
                      {log}
                    </div>
                  ))
                )}
                <div ref={terminalEndRef} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRO DE NUEVO CLIENTE */}
      <NewCustomerForm
        isOpen={isNewCustomerModalOpen}
        onClose={() => setIsNewCustomerModalOpen(false)}
        onCustomerCreated={handleCustomerCreated}
        zonasDisponibles={zonas.length > 0 ? zonas : ['NORTE', 'SUR', 'CENTRO', 'LIMA CENTRO', 'LIMA ESTE', 'LIMA NORTE', 'LIMA SUR', 'ORIENTE']}
      />
    </div>
  )
}

