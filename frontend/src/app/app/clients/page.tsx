'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Building2,
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  Sparkles,
  RefreshCw,
  Database,
  Layers,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Package,
  CheckCircle2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Activity,
  ChevronRight
} from 'lucide-react'
import { fetchWithAuth } from '../../../lib/apiClient'
import NewCustomerForm from '../../../components/NewCustomerForm'

interface ClientSummary {
  cliente_id: number
  cliente: string
  zona: string
  vendedor: string
  created_at: string
  total_transacciones: number | string
  total_unidades: number | string
  total_monto: number | string
  productos_consumidos?: string[]
}

interface ClientDetailData {
  cliente_id: number
  cliente: string
  ventas_detalle: any[]
  ventas_base: any[]
  cliente_secuencias: any[]
}

export default function ClientsManagementPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedZona, setSelectedZona] = useState('Todas')
  const [isNewModalOpen, setIsNewModalOpen] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Drawer / Detail modal state
  const [detailClient, setDetailClient] = useState<ClientDetailData | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [activeDetailTab, setActiveDetailTab] = useState<'detalle' | 'base' | 'secuencias'>('detalle')

  // Edit modal state
  const [editingClient, setEditingClient] = useState<ClientSummary | null>(null)
  const [editForm, setEditForm] = useState({ cliente: '', zona: '', vendedor: '' })
  const [savingEdit, setSavingEdit] = useState(false)

  // Delete state
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadClients = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth('/api/clientes/list')
      if (res.ok) {
        const json = await res.json()
        setClients(json.data || [])
      }
    } catch (err: any) {
      console.error('Error cargando clientes:', err)
      setNotification({ type: 'error', message: 'No se pudo cargar el listado de clientes.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadClients()
  }, [])

  const zonas = useMemo(() => {
    const set = new Set<string>()
    clients.forEach(c => {
      if (c.zona) set.add(c.zona)
    })
    return ['Todas', ...Array.from(set)]
  }, [clients])

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch =
        !search ||
        (c.cliente && c.cliente.toLowerCase().includes(search.toLowerCase())) ||
        String(c.cliente_id).includes(search)
      const matchesZona = selectedZona === 'Todas' || c.zona === selectedZona
      return matchesSearch && matchesZona
    })
  }, [clients, search, selectedZona])

  // KPIs
  const totalClientsCount = clients.length
  const totalUnitsSum = clients.reduce((acc, c) => acc + (Number(c.total_unidades) || 0), 0)
  const totalMontoSum = clients.reduce((acc, c) => acc + (Number(c.total_monto) || 0), 0)
  const totalZonasCount = zonas.length - 1

  const handleOpenDetail = async (client: ClientSummary) => {
    setLoadingDetail(true)
    setActiveDetailTab('detalle')
    try {
      const res = await fetchWithAuth(`/api/clientes/detalle/${client.cliente_id}`)
      if (res.ok) {
        const data = await res.json()
        setDetailClient(data)
      } else {
        setDetailClient({
          cliente_id: client.cliente_id,
          cliente: client.cliente,
          ventas_detalle: [],
          ventas_base: [],
          cliente_secuencias: []
        })
      }
    } catch (err) {
      console.error('Error cargando detalle:', err)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleOpenEdit = (client: ClientSummary) => {
    setEditingClient(client)
    setEditForm({
      cliente: client.cliente || '',
      zona: client.zona || '',
      vendedor: client.vendedor || `PHARMA - ${client.zona || 'LIMA'}`
    })
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingClient) return
    setSavingEdit(true)
    try {
      const res = await fetchWithAuth(`/api/clientes/${editingClient.cliente_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Error actualizando cliente')
      }
      setNotification({ type: 'success', message: 'Cliente actualizado correctamente en base de datos.' })
      setEditingClient(null)
      loadClients()
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al guardar cambios.' })
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDeleteClient = async () => {
    if (!deletingId) return
    setIsDeleting(true)
    try {
      const res = await fetchWithAuth(`/api/clientes/${deletingId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}))
        throw new Error(errJson.error || 'Error al eliminar cliente')
      }
      setNotification({ type: 'success', message: 'Cliente eliminado correctamente de las tablas relacionales.' })
      setDeletingId(null)
      loadClients()
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Error al eliminar cliente.' })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Notification */}
      {notification && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between animate-fadeIn ${
            notification.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-500'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="p-1 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-sophia-blue/10 text-sophia-blue dark:text-sophia-blue-300 text-[10px] font-black uppercase tracking-wider border border-sophia-blue/20">
              Cartera & Tablas Relacionales
            </span>
            <span className="text-neutral-400 text-xs font-medium">PostgreSQL / Supabase</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight flex items-center gap-3">
            <Building2 className="w-7 h-7 text-sophia-blue dark:text-sophia-blue-400" />
            <span>Gestión de Clientes & Instituciones</span>
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Monitorea el consumo histórico en <code className="font-mono text-neutral-800 dark:text-neutral-200">ventas_detalle</code>, <code className="font-mono text-neutral-800 dark:text-neutral-200">ventas_base</code> y administra las secuencias para los modelos de Deep Learning.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={loadClients}
            disabled={loading}
            className="p-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-2xl transition-all flex items-center justify-center min-h-[44px]"
            title="Recargar listado"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-sophia-blue' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            className="px-5 py-3 bg-sophia-blue hover:bg-sophia-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-sophia-blue/20 hover:shadow-sophia-blue/40 flex items-center gap-2 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Nuevo Cliente</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Clientes Totales
            </span>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {totalClientsCount}
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 block">
              100% Sincronizados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sophia-blue/10 flex items-center justify-center text-sophia-blue dark:text-sophia-blue-400 border border-sophia-blue/20">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Unidades Vendidas
            </span>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {totalUnitsSum.toLocaleString()}
            </h3>
            <span className="text-[10px] text-neutral-400 font-medium mt-0.5 block">
              Fármacos oftalmológicos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Package className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Facturación Histórica
            </span>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              S/ {totalMontoSum.toLocaleString('es-PE', { maximumFractionDigits: 0 })}
            </h3>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-0.5 block">
              Cartera Sophia
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Zonas Activas
            </span>
            <h3 className="text-2xl font-black text-neutral-900 dark:text-white mt-1">
              {totalZonasCount}
            </h3>
            <span className="text-[10px] text-neutral-400 font-medium mt-0.5 block">
              Cobertura Nacional
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente o ID..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 font-medium"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-neutral-400" />
            <span className="text-xs font-bold text-neutral-500 uppercase">Zona:</span>
            <select
              value={selectedZona}
              onChange={(e) => setSelectedZona(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white font-semibold focus:outline-none focus:border-sophia-blue uppercase cursor-pointer"
            >
              {zonas.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/50 text-[11px] font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                <th className="py-3.5 px-6">ID / Razón Social</th>
                <th className="py-3.5 px-4">Zona Comercial</th>
                <th className="py-3.5 px-4">Representante</th>
                <th className="py-3.5 px-4 text-center">Transacciones</th>
                <th className="py-3.5 px-4 text-center">Unidades</th>
                <th className="py-3.5 px-4 text-right">Facturación</th>
                <th className="py-3.5 px-6 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-2 border-sophia-blue border-t-transparent"></div>
                      <span className="font-semibold text-xs">Cargando instituciones...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-neutral-400">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-bold">No se encontraron clientes con el criterio especificado.</p>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client, idx) => {
                  const monto = Number(client.total_monto) || 0
                  const unidades = Number(client.total_unidades) || 0
                  return (
                    <tr
                      key={`client-row-${client.cliente_id}-${idx}`}
                      className="hover:bg-neutral-50/70 dark:hover:bg-neutral-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-sophia-blue/10 flex items-center justify-center font-black text-sophia-blue dark:text-sophia-blue-300 text-xs flex-shrink-0">
                            {client.cliente_id}
                          </div>
                          <div>
                            <span className="font-bold text-neutral-900 dark:text-white block line-clamp-1">
                              {client.cliente}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-medium">
                              ID: #{client.cliente_id}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-bold border border-neutral-200 dark:border-neutral-700 uppercase">
                          {client.zona || 'LIMA'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-neutral-600 dark:text-neutral-400 font-medium">
                        {client.vendedor || `PHARMA - ${client.zona || 'LIMA'}`}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-neutral-700 dark:text-neutral-300">
                        {client.total_transacciones}
                      </td>

                      <td className="py-3.5 px-4 text-center font-bold text-neutral-900 dark:text-white">
                        {unidades.toLocaleString()} uds
                      </td>

                      <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                        S/ {monto.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ver Detalle Relacional */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(client)}
                            className="p-2 text-neutral-500 hover:text-sophia-blue hover:bg-sophia-blue/10 rounded-xl transition-all"
                            title="Ver Tablas Relacionales (ventas_detalle, ventas_base, secuencias)"
                          >
                            <Database className="w-4 h-4" />
                          </button>

                          {/* Simular Recomendaciones IA */}
                          <button
                            type="button"
                            onClick={() => router.push('/app/recommendations')}
                            className="p-2 text-neutral-500 hover:text-sky-500 hover:bg-sky-500/10 rounded-xl transition-all"
                            title="Simular Oportunidades Comerciales"
                          >
                            <Sparkles className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(client)}
                            className="p-2 text-neutral-500 hover:text-amber-500 hover:bg-amber-500/10 rounded-xl transition-all"
                            title="Editar Cliente"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Eliminar */}
                          <button
                            type="button"
                            onClick={() => setDeletingId(client.cliente_id)}
                            className="p-2 text-neutral-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                            title="Eliminar Cliente"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Detalle de Tablas Relacionales */}
      {detailClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDetailClient(null)}
          ></div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-5xl relative z-10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scaleIn">
            {/* Modal Header */}
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sophia-blue/10 flex items-center justify-center text-sophia-blue dark:text-sophia-blue-400 border border-sophia-blue/20">
                  <Database className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wide">
                    {detailClient.cliente}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    ID Cliente: #{detailClient.cliente_id} · Registros relacionales en PostgreSQL
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailClient(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="px-6 pt-3 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2 bg-neutral-100/50 dark:bg-neutral-950/30">
              <button
                type="button"
                onClick={() => setActiveDetailTab('detalle')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeDetailTab === 'detalle'
                    ? 'border-sophia-blue text-sophia-blue dark:text-sophia-blue-300 bg-white dark:bg-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>ventas_detalle ({detailClient.ventas_detalle?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab('base')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeDetailTab === 'base'
                    ? 'border-sophia-blue text-sophia-blue dark:text-sophia-blue-300 bg-white dark:bg-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>ventas_base ({detailClient.ventas_base?.length || 0})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailTab('secuencias')}
                className={`px-4 py-2.5 rounded-t-xl text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                  activeDetailTab === 'secuencias'
                    ? 'border-sophia-blue text-sophia-blue dark:text-sophia-blue-300 bg-white dark:bg-neutral-900'
                    : 'border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>cliente_secuencias ({detailClient.cliente_secuencias?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {loadingDetail ? (
                <div className="py-12 text-center text-neutral-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-sophia-blue border-t-transparent mx-auto mb-2"></div>
                  <span className="text-xs">Consultando base de datos relacional...</span>
                </div>
              ) : activeDetailTab === 'detalle' ? (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Tabla <code className="font-mono text-neutral-800 dark:text-neutral-200">ventas_detalle</code>: Contiene todas las transacciones históricas a nivel SKU, incluyendo montos, metas de venta y cliente_id.
                  </p>
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 dark:bg-neutral-950 text-[10px] font-black uppercase text-neutral-500">
                        <tr>
                          <th className="py-2.5 px-3">ID</th>
                          <th className="py-2.5 px-3">Producto</th>
                          <th className="py-2.5 px-3">Mes</th>
                          <th className="py-2.5 px-3 text-center">Cant.</th>
                          <th className="py-2.5 px-3 text-right">Monto Cancelado</th>
                          <th className="py-2.5 px-3">Zona</th>
                          <th className="py-2.5 px-3">Fecha Registro</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                        {detailClient.ventas_detalle?.map((row, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            <td className="py-2 px-3 font-mono text-[11px] text-neutral-400">{row.id}</td>
                            <td className="py-2 px-3 font-bold text-sophia-blue dark:text-sophia-blue-300">
                              {row.producto}
                            </td>
                            <td className="py-2 px-3">{row.mes_nombre || row.mes_abbr || `Mes ${row.mes_num}`}</td>
                            <td className="py-2 px-3 text-center font-bold">{row.cantidad}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              S/ {Number(row.monto_cancelado || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-neutral-500">{row.zona}</td>
                            <td className="py-2 px-3 text-[11px] text-neutral-400">
                              {row.created_at ? new Date(row.created_at).toLocaleDateString('es-PE') : 'N/D'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : activeDetailTab === 'base' ? (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Tabla <code className="font-mono text-neutral-800 dark:text-neutral-200">ventas_base</code>: Registros normalizados para análisis agregados y reglas de asociación Apriori.
                  </p>
                  <div className="border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-neutral-50 dark:bg-neutral-950 text-[10px] font-black uppercase text-neutral-500">
                        <tr>
                          <th className="py-2.5 px-3">ID</th>
                          <th className="py-2.5 px-3">Producto</th>
                          <th className="py-2.5 px-3">Mes Num</th>
                          <th className="py-2.5 px-3 text-center">Cantidad</th>
                          <th className="py-2.5 px-3 text-right">Monto Cancelado</th>
                          <th className="py-2.5 px-3">Zona</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 font-medium">
                        {detailClient.ventas_base?.map((row, idx) => (
                          <tr key={idx} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                            <td className="py-2 px-3 font-mono text-[11px] text-neutral-400">{row.id}</td>
                            <td className="py-2 px-3 font-bold text-neutral-900 dark:text-white">{row.producto}</td>
                            <td className="py-2 px-3">{row.mes_abbr || `Mes ${row.mes_num}`}</td>
                            <td className="py-2 px-3 text-center font-bold">{row.cantidad}</td>
                            <td className="py-2 px-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                              S/ {Number(row.monto_cancelado || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-neutral-500">{row.zona}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Tabla <code className="font-mono text-neutral-800 dark:text-neutral-200">cliente_secuencias</code>: Representación secuencial de consumo alimentada a la red neuronal recurrente Attention-GRU.
                  </p>
                  <div className="space-y-3">
                    {detailClient.cliente_secuencias?.map((seq, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-sophia-blue dark:text-sophia-blue-300">
                            Secuencia #{seq.id}
                          </span>
                          <span className="text-[10px] text-neutral-400">
                            {seq.created_at ? new Date(seq.created_at).toLocaleString('es-PE') : 'Sincronizado'}
                          </span>
                        </div>
                        <div className="p-3 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-800 dark:text-neutral-200 overflow-x-auto">
                          {typeof seq.secuencia_productos === 'string'
                            ? seq.secuencia_productos
                            : JSON.stringify(seq.secuencia_productos)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 flex justify-end">
              <button
                type="button"
                onClick={() => setDetailClient(null)}
                className="px-6 py-2.5 bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-bold rounded-xl text-xs uppercase tracking-wider hover:opacity-80 transition-opacity"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Editar Cliente */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setEditingClient(null)}
          ></div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg relative z-10 shadow-2xl overflow-hidden animate-scaleIn">
            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20">
                  <Edit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-white uppercase">
                    Editar Institución
                  </h3>
                  <p className="text-xs text-neutral-500">
                    ID Cliente: #{editingClient.cliente_id}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingClient(null)}
                className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Razón Social / Nombre
                </label>
                <input
                  type="text"
                  required
                  value={editForm.cliente}
                  onChange={(e) => setEditForm(prev => ({ ...prev, cliente: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Zona Comercial
                </label>
                <input
                  type="text"
                  required
                  value={editForm.zona}
                  onChange={(e) => setEditForm(prev => ({ ...prev, zona: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
                  Representante / Vendedor
                </label>
                <input
                  type="text"
                  value={editForm.vendedor}
                  onChange={(e) => setEditForm(prev => ({ ...prev, vendedor: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-6 py-2.5 bg-sophia-blue hover:bg-sophia-blue-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-sophia-blue/20"
                >
                  {savingEdit ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Eliminar Cliente */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setDeletingId(null)}
          ></div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-md relative z-10 shadow-2xl p-6 text-center animate-scaleIn">
            <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4 border border-red-500/20">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-lg font-black text-neutral-900 dark:text-white">
              ¿Eliminar Cliente #{deletingId}?
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 mb-6">
              Esta acción eliminará de forma irreversible las transacciones asociadas en <code className="font-mono">ventas_detalle</code>, <code className="font-mono">ventas_base</code> y <code className="font-mono">cliente_secuencias</code>.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="px-5 py-2.5 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteClient}
                disabled={isDeleting}
                className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-600/20"
              >
                {isDeleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Registrar Nuevo Cliente */}
      <NewCustomerForm
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onCustomerCreated={() => {
          setIsNewModalOpen(false)
          setNotification({
            type: 'success',
            message: 'Cliente registrado e integrado exitosamente a las tablas relacionales.'
          })
          loadClients()
        }}
        zonasDisponibles={zonas.filter(z => z !== 'Todas')}
      />
    </div>
  )
}
