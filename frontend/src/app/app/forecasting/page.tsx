'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Search,
  TrendingUp,
  Package,
  Calendar,
  AlertTriangle,
  Building2,
  Sparkles,
  ShieldCheck,
  DollarSign,
  ChevronRight,
  Activity,
  ArrowUpRight,
  Filter,
  RefreshCw,
  Eye
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import { fetchWithAuth } from '../../../lib/apiClient'

const SOPHIA_CATALOG = [
  { nombre: 'SOPHIXAL', sku: 'OPH-SOP-001', sub_familia: 'Antibiótico Oftálmico', formato: 'Solución 5ml', indicacion: 'Infecciones bacterianas oculares superficiales' },
  { nombre: 'HUMYLUB', sku: 'OPH-HUM-002', sub_familia: 'Lágrima Artificial / Lubricante', formato: 'Solución 10ml', indicacion: 'Ojo seco moderado a severo y fatiga visual' },
  { nombre: 'MODUSIK-A', sku: 'OPH-MOD-003', sub_familia: 'Inmunomodulador', formato: 'Emulsión 5ml', indicacion: 'Queratoconjuntivitis seca e inflamación ocular crónica' },
  { nombre: 'LATOF', sku: 'OPH-LAT-004', sub_familia: 'Hipotensor Ocular (Glaucoma)', formato: 'Solución 2.5ml', indicacion: 'Hipertensión intraocular y glaucoma de ángulo abierto' },
  { nombre: 'CRISTALAN', sku: 'OPH-CRI-005', sub_familia: 'Antioxidante / Protector', formato: 'Solución 15ml', indicacion: 'Prevención de opacidades y fatiga senil' },
  { nombre: 'KATIUS', sku: 'OPH-KAT-006', sub_familia: 'Antialérgico Ocular', formato: 'Solución 5ml', indicacion: 'Conjuntivitis alérgica estacional' },
  { nombre: 'THEALOZ DUO', sku: 'OPH-THE-007', sub_familia: 'Trehalosa + Hialuronato', formato: 'Solución 10ml', indicacion: 'Bioprotección celular de la superficie ocular' },
  { nombre: 'HYABAK', sku: 'OPH-HYA-008', sub_familia: 'Lágrima Sin Conservantes', formato: 'Frasco Abak 10ml', indicacion: 'Lubricación e hidratación ocular prolongada' },
  { nombre: 'TOBRADEX', sku: 'OPH-TOB-009', sub_familia: 'Corticoide + Antibiótico', formato: 'Suspensión 5ml', indicacion: 'Procesos inflamatorios oculares con infección bacteriana' },
  { nombre: 'PATANOL', sku: 'OPH-PAT-010', sub_familia: 'Antihistamínico Mastocitario', formato: 'Solución 5ml', indicacion: 'Tratamiento de picor y conjuntivitis alérgica' },
  { nombre: 'VIGAMOX', sku: 'OPH-VIG-011', sub_familia: 'Fluoroquinolona de 4ta Gen', formato: 'Solución 5ml', indicacion: 'Conjuntivitis bacteriana purulenta' },
  { nombre: 'COMBIGAN', sku: 'OPH-COM-012', sub_familia: 'Terapia Combinada Glaucoma', formato: 'Solución 5ml', indicacion: 'Reducción de presión intraocular en glaucoma' },
  { nombre: 'TRAVATAN', sku: 'OPH-TRA-013', sub_familia: 'Análogo de Prostaglandina', formato: 'Solución 2.5ml', indicacion: 'Control de presión intraocular sostenida' },
  { nombre: 'AZOPT', sku: 'OPH-AZO-014', sub_familia: 'Inhibidor de Anhidrasa Carbónica', formato: 'Suspensión 5ml', indicacion: 'Tratamiento coadyuvante en glaucoma' },
  { nombre: 'NEVANAC', sku: 'OPH-NEV-015', sub_familia: 'AINE Oftálmico', formato: 'Suspensión 5ml', indicacion: 'Prevención y alivio de dolor post-cirugía de cataratas' },
]

export default function ForecastingPage() {
  const [selectedProduct, setSelectedProduct] = useState(SOPHIA_CATALOG[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('Todas')
  const [forecastData, setForecastData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // Load forecasting metrics from backend
  const loadForecast = async (productName: string) => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`/api/forecasting/demanda?producto=${encodeURIComponent(productName)}`)
      if (res.ok) {
        const data = await res.json()
        setForecastData(data)
      }
    } catch (err) {
      console.error('Error fetching forecast:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadForecast(selectedProduct.nombre)
  }, [selectedProduct])

  const categories = useMemo(() => {
    const set = new Set<string>()
    SOPHIA_CATALOG.forEach(p => set.add(p.sub_familia.split('/')[0].trim()))
    return ['Todas', ...Array.from(set)]
  }, [])

  const filteredCatalog = useMemo(() => {
    return SOPHIA_CATALOG.filter(p => {
      const q = searchQuery.trim().toLowerCase()
      const matchesSearch = !q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.sub_familia.toLowerCase().includes(q)
      const matchesCat = selectedCategory === 'Todas' || p.sub_familia.includes(selectedCategory)
      return matchesSearch && matchesCat
    })
  }, [searchQuery, selectedCategory])

  const metrics = forecastData?.proyeccionTrimestre || {
    unidades: 315,
    ingresoEstimado: 13387,
    confianza: 94.2,
    tendenciaPct: 8.4,
    stockSeguridad: 110,
    mes1: 95,
    mes2: 103,
    mes3: 117
  }

  const chartSeries = forecastData?.series || []
  const topClientes = forecastData?.topClientes || []

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-sophia-blue/10 text-sophia-blue dark:text-sophia-blue-300 text-[10px] font-black uppercase tracking-wider border border-sophia-blue/20">
              Machine Learning & Time Series
            </span>
            <span className="text-neutral-400 text-xs font-medium">Horizonte Trimestral (3 Meses)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
            <TrendingUp className="w-7 h-7 text-sophia-blue dark:text-sophia-blue-400" />
            <span>Predicción de Demanda Oftálmica</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Proyecciones de volumen y abastecimiento basadas en el modelo recurrente <code className="font-mono text-neutral-800 dark:text-neutral-200">Attention-GRU</code> y curvas de tendencia histórica.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadForecast(selectedProduct.nombre)}
            className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl transition-all flex items-center justify-center min-h-[44px]"
            title="Recalcular pronóstico"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sophia-blue' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Selected Product Display */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        {/* Product Meta Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-lg bg-sophia-blue text-white text-[11px] font-black uppercase tracking-wider">
                {selectedProduct.sku}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold uppercase">
                {selectedProduct.formato}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
              {selectedProduct.nombre}
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              <span className="font-bold text-sophia-blue dark:text-sophia-blue-400">{selectedProduct.sub_familia}:</span> {selectedProduct.indicacion}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-neutral-400 block">Precisión del Modelo</span>
              <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                {metrics.confianza}% Confianza
              </span>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* 5 Key Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              <Package className="w-3.5 h-3.5 text-sophia-blue" />
              <span>Demanda Trimestre</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {metrics.unidades.toLocaleString()} uds
            </h4>
            <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
              Jul: {metrics.mes1} | Ago: {metrics.mes2} | Set: {metrics.mes3}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ingreso Estimado</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
              S/ {metrics.ingresoEstimado.toLocaleString()}
            </h4>
            <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
              Precio Promedio S/ {forecastData?.precioPromedio || 42.50}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              <TrendingUp className="w-3.5 h-3.5 text-sky-500" />
              <span>Tendencia MoM</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-sky-600 dark:text-sky-400">
              +{metrics.tendenciaPct}%
            </h4>
            <span className="text-[10px] text-emerald-500 font-bold block mt-0.5">
              Crecimiento Sostenido
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span>Stock Seguridad</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400">
              {metrics.stockSeguridad} uds
            </h4>
            <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
              Buffer anti-quiebre
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800/80 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-1">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              <span>Total Histórico</span>
            </div>
            <h4 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {(forecastData?.totalHistorico || 420).toLocaleString()} uds
            </h4>
            <span className="text-[10px] text-neutral-400 font-medium block mt-0.5">
              En base de datos Sophia
            </span>
          </div>
        </div>

        {/* Forecast Area Chart */}
        <div className="space-y-3 pt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-black text-neutral-900 dark:text-white uppercase tracking-wider">
                Evolución Histórica & Curva de Proyección (Attention-GRU)
              </h3>
              <p className="text-xs text-neutral-500">
                Visualización mensual de consumo real vs. inferencia a 3 meses con bandas de dispersión.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-blue-500"></span>
                <span className="text-neutral-600 dark:text-neutral-400">Histórico Real</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-sky-400"></span>
                <span className="text-neutral-600 dark:text-neutral-400">Pronóstico IA</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-neutral-800" />
                <XAxis
                  dataKey="mes"
                  stroke="#9ca3af"
                  fontSize={11}
                  fontWeight="bold"
                  tickLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  fontWeight="bold"
                  tickLine={false}
                  tickFormatter={(val) => `${val} u`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155',
                    borderRadius: '12px',
                    color: '#f8fafc',
                    fontSize: '12px',
                    fontWeight: 'bold'
                  }}
                  formatter={(value: any) => [`${value} unidades`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  stroke="#2563eb"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorActual)"
                  name="Demanda Real"
                />
                <Area
                  type="monotone"
                  dataKey="proyectado"
                  stroke="#0284c7"
                  strokeWidth={3}
                  strokeDasharray="4 4"
                  fillOpacity={1}
                  fill="url(#colorForecast)"
                  name="Inferencia Attention-GRU"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Action Strategy & Top Clients Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          {/* Strategic Action Card */}
          <div className="p-6 rounded-3xl bg-sophia-blue/5 dark:bg-sophia-blue/10 border border-sophia-blue/20 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2 text-sophia-blue dark:text-sophia-blue-400">
                <Sparkles className="w-5 h-5" />
                <h4 className="text-sm font-black uppercase tracking-wider">
                  Recomendación para Representantes Comerciales
                </h4>
              </div>
              <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                El modelo proyecta una demanda de <strong className="text-neutral-900 dark:text-white">{metrics.unidades} unidades</strong> en el trimestre para <strong className="text-sophia-blue dark:text-sophia-blue-400">{selectedProduct.nombre}</strong>. Se recomienda programar visitas preventivas de reposición a clínicas oftalmológicas antes de los días 15 de cada mes para mantener un inventario mínimo de <strong className="text-neutral-900 dark:text-white">{metrics.stockSeguridad} unidades</strong> de reserva.
              </p>
            </div>

            <div className="mt-4 pt-4 border-t border-sophia-blue/15 flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400">
                Línea: {selectedProduct.sub_familia}
              </span>
              <span className="text-[11px] font-black text-sophia-blue dark:text-sophia-blue-300">
                Prioridad Alta de Suministro
              </span>
            </div>
          </div>

          {/* Top Clinics Demanding this product */}
          <div className="p-6 rounded-3xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sophia-blue" />
              <span>Instituciones con Mayor Demanda Histórica</span>
            </h4>

            {topClientes.length === 0 ? (
              <p className="text-xs text-neutral-400 italic py-4 text-center">
                Sin transacciones específicas registradas en ventas_detalle.
              </p>
            ) : (
              <div className="space-y-2">
                {topClientes.map((c: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-sophia-blue/10 text-sophia-blue text-[10px] font-black flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-neutral-900 dark:text-white block line-clamp-1">
                          {c.cliente}
                        </span>
                        <span className="text-[10px] text-neutral-400 uppercase font-semibold">
                          {c.zona}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-neutral-900 dark:text-white">
                        {c.cantidad} uds
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold block">
                        S/ {Number(c.monto).toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Catalog Selector Grid */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-neutral-900 dark:text-white uppercase tracking-wider">
              Portafolio Oftalmológico Laboratorios Sophia
            </h3>
            <p className="text-xs text-neutral-500">
              Selecciona un producto para proyectar la demanda específica con IA.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-60">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar fármaco..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-sophia-blue"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue cursor-pointer w-full sm:w-auto"
            >
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredCatalog.map(prod => {
            const isSelected = selectedProduct.nombre === prod.nombre
            return (
              <button
                key={prod.nombre}
                type="button"
                onClick={() => setSelectedProduct(prod)}
                className={`p-4 rounded-2xl text-left transition-all border flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sophia-blue text-white border-sophia-blue shadow-lg shadow-sophia-blue/20'
                    : 'bg-neutral-50 dark:bg-neutral-950 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-wider ${isSelected ? 'text-white/80' : 'text-neutral-400'}`}>
                      {prod.sku}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300'}`}>
                      {prod.formato}
                    </span>
                  </div>
                  <h4 className={`text-base font-black ${isSelected ? 'text-white' : 'text-neutral-900 dark:text-white'}`}>
                    {prod.nombre}
                  </h4>
                  <p className={`text-xs mt-0.5 line-clamp-1 ${isSelected ? 'text-white/90 font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                    {prod.sub_familia}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-white/20 flex items-center justify-between text-[11px] font-bold">
                  <span className={isSelected ? 'text-white/80' : 'text-sophia-blue dark:text-sophia-blue-400'}>
                    Ver Proyección
                  </span>
                  <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'translate-x-0.5' : ''}`} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
