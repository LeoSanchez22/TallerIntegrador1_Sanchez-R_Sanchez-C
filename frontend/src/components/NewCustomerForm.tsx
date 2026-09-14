'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import {
  Hospital,
  X,
  CheckCircle2,
  AlertCircle,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
  Plus,
  Search,
  ChevronDown,
  Sparkles,
  Check,
  Building2,
  Phone,
  UserCheck
} from 'lucide-react'
import { fetchWithAuth } from '../lib/apiClient'

const DEFAULT_SOPHIA_PRODUCTS = [
  'SOPHIXAL',
  'HUMYLUB',
  'MODUSIK-A',
  'KATIUS',
  'LATOF',
  'SOPHIXAL DX',
  'CRISTALAN',
  'HYABAK',
  'THEALOZ DUO',
  'TOBRADEX',
  'PATANOL',
  'VIGAMOX',
  'REFRESH TEARS',
  'SYSTANE ULTRA',
  'COMBIGAN',
  'AZOPT',
  'TRAVATAN',
  'LUMIGAN',
  'NEVANAC',
  'PRED FORTE',
  'OFTACILOX',
  'XALACOM',
  'ARTELAC ULTRA',
  'LOTERED',
  'FLUMEX',
  'SOFTACORT',
  'PROPARACAINA',
  'FLUORESCEINA',
  'TROPICAMIDA 1%',
  'FENILEFRINA 10%'
]

export interface MonthProductItem {
  producto: string
  cantidad: number
}

interface MonthProductSelectorProps {
  label: string
  subtitle: string
  selectedProducts: MonthProductItem[]
  onChange: (products: MonthProductItem[]) => void
  availableCatalog: string[]
}

function MonthProductSelector({
  label,
  subtitle,
  selectedProducts,
  onChange,
  availableCatalog
}: MonthProductSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toUpperCase()
    if (!q) return availableCatalog
    return availableCatalog.filter(p => p.toUpperCase().includes(q))
  }, [search, availableCatalog])

  const toggleProduct = (productName: string) => {
    const exists = selectedProducts.some(p => p.producto === productName)
    if (exists) {
      onChange(selectedProducts.filter(p => p.producto !== productName))
    } else {
      onChange([...selectedProducts, { producto: productName, cantidad: 10 }])
    }
  }

  const updateQuantity = (productName: string, delta: number) => {
    onChange(
      selectedProducts.map(p => {
        if (p.producto === productName) {
          const newQty = Math.max(1, p.cantidad + delta)
          return { ...p, cantidad: newQty }
        }
        return p
      })
    )
  }

  const setExactQuantity = (productName: string, qty: number) => {
    const validQty = isNaN(qty) || qty < 1 ? 1 : Math.round(qty)
    onChange(
      selectedProducts.map(p => {
        if (p.producto === productName) {
          return { ...p, cantidad: validQty }
        }
        return p
      })
    )
  }

  const handleAddCustomProduct = () => {
    const trimmed = search.trim().toUpperCase()
    if (trimmed && !selectedProducts.some(p => p.producto === trimmed)) {
      onChange([...selectedProducts, { producto: trimmed, cantidad: 10 }])
      setSearch('')
    }
  }

  const totalUnidades = selectedProducts.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0)

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950/60 p-4 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-black text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
            {label}
          </label>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sophia-blue/10 text-sophia-blue dark:text-sophia-blue-300">
            {selectedProducts.length} fár. ({totalUnidades} uds)
          </span>
        </div>
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">
          {subtitle}
        </p>

        {/* Selected Products with Quantities */}
        <div className="space-y-2 min-h-[60px] max-h-[180px] overflow-y-auto custom-scrollbar mb-3 p-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl">
          {selectedProducts.length === 0 ? (
            <div className="text-[11px] text-neutral-400 italic p-3 text-center">
              Ningún fármaco añadido aún
            </div>
          ) : (
            selectedProducts.map(item => (
              <div
                key={item.producto}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800"
              >
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-sophia-blue flex-shrink-0" />
                  <span className="font-bold text-neutral-900 dark:text-white text-xs leading-snug break-words">
                    {item.producto}
                  </span>
                </div>
                
                <div className="flex items-center justify-between sm:justify-end gap-1.5 flex-shrink-0">
                  <div className="flex items-center gap-1 bg-white dark:bg-neutral-900 px-1.5 py-0.5 rounded-md border border-neutral-200 dark:border-neutral-800">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.producto, -5)}
                      className="w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-xs font-black transition-colors"
                      title="Disminuir 5 unidades"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.cantidad}
                      onChange={(e) => setExactQuantity(item.producto, parseInt(e.target.value))}
                      className="w-11 text-center py-0.5 px-0.5 bg-transparent border-0 text-xs font-black text-neutral-900 dark:text-white focus:outline-none"
                    />
                    <span className="text-[10px] text-neutral-400 font-semibold pr-0.5">uds</span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.producto, 5)}
                      className="w-5 h-5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 flex items-center justify-center text-xs font-black transition-colors"
                      title="Aumentar 5 unidades"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProduct(item.producto)}
                    className="p-1 text-neutral-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                    title="Quitar fármaco"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Searchable Combobox */}
      <div className="relative" ref={containerRef}>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              if (!isOpen) setIsOpen(true)
            }}
            onFocus={() => setIsOpen(true)}
            placeholder="Buscar fármaco en catálogo..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all font-medium"
          />
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Dropdown Options */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar p-1">
            {filteredCatalog.length > 0 ? (
              filteredCatalog.map(item => {
                const isSelected = selectedProducts.some(p => p.producto === item)
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      toggleProduct(item)
                      setSearch('')
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-sophia-blue text-white'
                        : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                  </button>
                )
              })
            ) : (
              <div className="p-2 text-center">
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                  No se encontró &quot;{search}&quot;
                </p>
                <button
                  type="button"
                  onClick={handleAddCustomProduct}
                  className="px-3 py-1 bg-sophia-blue text-white rounded-lg text-xs font-bold hover:bg-sophia-blue-600 transition-colors inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  Agregar &quot;{search.toUpperCase()}&quot;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

interface NewCustomerFormProps {
  isOpen?: boolean
  onClose?: () => void
  onCustomerCreated?: (newCustomer: any) => void
  zonasDisponibles?: string[]
  embedded?: boolean
}

export default function NewCustomerForm({
  isOpen = true,
  onClose,
  onCustomerCreated,
  zonasDisponibles = ['NORTE', 'SUR', 'CENTRO', 'LIMA CENTRO', 'LIMA ESTE', 'LIMA NORTE', 'LIMA SUR', 'ORIENTE'],
  embedded = false
}: NewCustomerFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    ruc: '',
    zona: zonasDisponibles[0] || 'LIMA CENTRO',
    categoria: 'CLÍNICA OFTALMOLÓGICA',
    limite_credito: 15000,
    contacto: '',
    telefono: ''
  })

  // Selected products per month with individual quantities
  const [mes1Products, setMes1Products] = useState<MonthProductItem[]>([])
  const [mes2Products, setMes2Products] = useState<MonthProductItem[]>([])
  const [mes3Products, setMes3Products] = useState<MonthProductItem[]>([])

  const [catalog, setCatalog] = useState<string[]>(DEFAULT_SOPHIA_PRODUCTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Fetch newly launched products to keep catalog fresh
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetchWithAuth('/api/productos/nuevos')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data) && data.length > 0) {
            const dynamicProds = data.map((p: any) => p.nombre || p.descripcion || p.producto).filter(Boolean)
            const combined = Array.from(new Set([...DEFAULT_SOPHIA_PRODUCTS, ...dynamicProds]))
            setCatalog(combined)
          }
        }
      } catch {
        // use default catalog
      }
    }
    loadCatalog()
  }, [])

  if (!isOpen && !embedded) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)

    const payload = {
      ...formData,
      mes1_items: mes1Products,
      mes2_items: mes2Products,
      mes3_items: mes3Products,
      mes1_compras: mes1Products.map(p => `${p.producto} (${p.cantidad})`).join(', '),
      mes2_compras: mes2Products.map(p => `${p.producto} (${p.cantidad})`).join(', '),
      mes3_compras: mes3Products.map(p => `${p.producto} (${p.cantidad})`).join(', ')
    }

    try {
      const res = await fetchWithAuth('/api/clientes/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || errData.details || `Error ${res.status}`)
      }

      const data = await res.json()
      setSuccess('¡Cliente registrado exitosamente e integrado a la base de datos de aprendizaje de IA!')
      
      if (onCustomerCreated) {
        onCustomerCreated(data.cliente || payload)
      }

      if (onClose) {
        setTimeout(() => {
          onClose()
          setSuccess(null)
        }, 1500)
      }
    } catch (err: any) {
      setError(err.message || 'No se pudo registrar el cliente.')
    } finally {
      setLoading(false)
    }
  }

  const formContent = (
    <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
      {success && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 rounded-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-sky-500" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 1. Datos Institucionales */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200 dark:border-neutral-800">
          <h4 className="text-xs font-black uppercase tracking-widest text-sophia-blue dark:text-sophia-blue-400 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            <span>1. Datos Institucionales del Cliente</span>
          </h4>
          <span className="text-[11px] text-neutral-400 font-medium">* Campos obligatorios</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Razón Social / Clínica *
            </label>
            <input
              type="text"
              required
              value={formData.nombre}
              onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
              placeholder="Ej. Clínica Oftalmológica San Gabriel"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              RUC / Identificador Fiscal *
            </label>
            <input
              type="text"
              required
              value={formData.ruc}
              onChange={(e) => setFormData(prev => ({ ...prev, ruc: e.target.value }))}
              placeholder="Ej. 20601234567"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Zona Comercial *
            </label>
            <select
              value={formData.zona}
              onChange={(e) => setFormData(prev => ({ ...prev, zona: e.target.value }))}
              className="appearance-none w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all cursor-pointer uppercase"
            >
              {zonasDisponibles.map(z => (
                <option key={z} value={z}>{z}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Tipo de Establecimiento
            </label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData(prev => ({ ...prev, categoria: e.target.value }))}
              className="appearance-none w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all cursor-pointer uppercase"
            >
              <option value="CLÍNICA OFTALMOLÓGICA">CLÍNICA OFTALMOLÓGICA</option>
              <option value="HOSPITAL PRIVADO">HOSPITAL PRIVADO</option>
              <option value="CADENA DE BOTICAS">CADENA DE BOTICAS</option>
              <option value="FARMACIA INDEPENDIENTE">FARMACIA INDEPENDIENTE</option>
              <option value="CENTRO MÉDICO ESPECIALIZADO">CENTRO MÉDICO ESPECIALIZADO</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Límite de Crédito (S/)
            </label>
            <input
              type="number"
              value={formData.limite_credito}
              onChange={(e) => setFormData(prev => ({ ...prev, limite_credito: Number(e.target.value) }))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-1.5">
              Contacto Comercial / Comprador
            </label>
            <input
              type="text"
              value={formData.contacto}
              onChange={(e) => setFormData(prev => ({ ...prev, contacto: e.target.value }))}
              placeholder="Ej. Dr. Carlos Mendoza"
              className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 2. Historial de Compras Inicial de 3 Meses con Buscador */}
      <div className="space-y-4 border-t border-neutral-200 dark:border-neutral-800 pt-6">
        <div>
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-sophia-blue dark:text-sophia-blue-400 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>2. Historial de Consumo Inicial (Últimos 3 Meses)</span>
            </h4>
            <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Evita el Cold-Start en IA
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Selecciona con el buscador los productos farmacéuticos comprados por el cliente en cada mes para que los modelos Attention-GRU y Reglas de Asociación calibren sus recomendaciones inmediatamente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MonthProductSelector
            label="Mes 1 (Hace 2 meses)"
            subtitle="Primera compra registrada en el trimestre"
            selectedProducts={mes1Products}
            onChange={setMes1Products}
            availableCatalog={catalog}
          />

          <MonthProductSelector
            label="Mes 2 (Mes anterior)"
            subtitle="Rotación intermedia de inventario"
            selectedProducts={mes2Products}
            onChange={setMes2Products}
            availableCatalog={catalog}
          />

          <MonthProductSelector
            label="Mes 3 (Mes reciente)"
            subtitle="Últimas adquisiciones activas"
            selectedProducts={mes3Products}
            onChange={setMes3Products}
            availableCatalog={catalog}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-3 pt-6 border-t border-neutral-200 dark:border-neutral-800">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-3 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-all min-h-[44px]"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-3 bg-sophia-blue hover:bg-sophia-blue-600 text-white font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-sophia-blue/20 hover:shadow-sophia-blue/40 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
          ) : (
            <>
              <UserCheck className="w-4 h-4" />
              <span>Registrar & Integrar Cliente</span>
            </>
          )}
        </button>
      </div>
    </form>
  )

  if (embedded) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sophia-blue/10 dark:bg-sophia-blue/20 flex items-center justify-center border border-sophia-blue/20">
              <Hospital className="w-6 h-6 text-sophia-blue dark:text-sophia-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-wide">
                Registrar Nuevo Cliente / Institución
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Alta institucional en cartera con mapeo de 3 meses para inicialización de redes neuronales y reentrenamiento.
              </p>
            </div>
          </div>
        </div>
        {formContent}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity" onClick={onClose} aria-hidden="true" />

      {/* Modal Card */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl sm:rounded-3xl w-full max-w-4xl relative z-10 shadow-2xl overflow-hidden my-auto flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50/90 dark:bg-neutral-950/90 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sophia-blue/10 flex items-center justify-center border border-sophia-blue/20">
              <Hospital className="w-5 h-5 text-sophia-blue dark:text-sophia-blue-400" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-neutral-900 dark:text-white uppercase tracking-wide">
                Registrar Nuevo Cliente / Institución
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Alta comercial con historial de 3 meses para inicializar el modelo Deep Learning.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 max-h-[80vh]">
          {formContent}
        </div>
      </div>
    </div>
  )
}

