'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import TopSellerBadge from './TopSellerBadge'
import DiscountBadge from './DiscountBadge'

export interface RecommendationCardItem {
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
  isTopSeller?: boolean
  discountPercentage?: number
  precio_unitario?: number
}

interface RecommendationCardProps {
  item: RecommendationCardItem
  onOpenAudit?: () => void
  onAddToCart?: (item: RecommendationCardItem) => void
}

export default function RecommendationCard({
  item
}: RecommendationCardProps) {
  const isTopSeller = item.isTopSeller || Number(item.probabilidad) >= 80 || item.motor?.toLowerCase().includes('apriori')
  const discountPct = item.discountPercentage || (item.probabilidad > 70 ? 15 : 10)

  // Generación de micro-copy comercial B2B dinámico y persuasivo
  const commercialPitch = React.useMemo(() => {
    if (item.justificacion && !item.justificacion.includes("SELECT") && !item.justificacion.includes("None")) {
      return item.justificacion
    }
    if (item.detonante) {
      return `Basado en la alta rotación de ${item.detonante} en este cliente, ${item.producto} complementa la cartera terapéutica ofreciendo una alternativa con precio preferencial y alta aceptación médica regional.`
    }
    return `Basado en las compras frecuentes y la demanda del mercado, este producto optimiza el mix de inventario del cliente con una proyección de retorno garantizada.`
  }, [item])

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 shadow-xl hover:shadow-2xl transition-all duration-300 hover:border-sophia-blue/40 dark:hover:border-sophia-blue/50 flex flex-col justify-between group relative overflow-hidden">
      {/* Top Banner Gradient Accent */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-sophia-blue via-sky-500 to-indigo-600"></div>

      <div>
        {/* Badges Bar */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {isTopSeller && <TopSellerBadge />}
          <DiscountBadge percentage={discountPct} tipo="Precio Preferencial" />
          
          <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
            {item.motor || 'Motor XAI'}
          </span>
        </div>

        {/* Product Title & Formats */}
        <div className="mb-3">
          <h3 className="text-lg sm:text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tight group-hover:text-sophia-blue dark:group-hover:text-sophia-blue-300 transition-colors">
            {item.producto}
          </h3>
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 font-semibold">
            <span>{item.sub_familia || 'Línea Oftalmológica'}</span>
            <span>•</span>
            <span className="text-[11px] uppercase">{item.formato || 'Solución Oftálmica'}</span>
          </div>
        </div>

        {/* Commercial Pitch / Micro-copy B2B */}
        <div className="bg-neutral-50 dark:bg-neutral-950/70 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-neutral-200/60 dark:border-neutral-800/80 mb-4">
          <div className="flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-sophia-blue dark:text-sophia-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed font-medium">
              {commercialPitch}
            </p>
          </div>
        </div>

        {/* Financial & Quantitative Projections - 2-Column Responsive Layout */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 py-3 border-t border-neutral-100 dark:border-neutral-800">
          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-black text-neutral-500 dark:text-neutral-400 tracking-wider mb-1">
              Afinidad
            </span>
            <span className="text-base sm:text-lg font-black text-sophia-blue dark:text-sky-400">
              {item.probabilidad}%
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-950/60 border border-neutral-200/60 dark:border-neutral-800/60 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-black text-neutral-500 dark:text-neutral-400 tracking-wider mb-1">
              Sugerido
            </span>
            <span className="text-base sm:text-lg font-black text-neutral-900 dark:text-white">
              {item.cantidad_sugerida || 15} <span className="text-xs font-bold text-neutral-400">uds</span>
            </span>
          </div>

          <div className="col-span-2 p-3.5 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-black text-emerald-700 dark:text-emerald-400 tracking-wider block">
                Facturación Estimada
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                Retorno proyectado
              </span>
            </div>
            <span className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400">
              S/ {Math.round(item.ingreso_estimado || (item.cantidad_sugerida || 15) * 38).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
