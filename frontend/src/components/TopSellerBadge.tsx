'use client'

import React from 'react'
import { Flame, TrendingUp } from 'lucide-react'

interface TopSellerBadgeProps {
  className?: string
  salesCount?: number
}

export default function TopSellerBadge({ className = '', salesCount }: TopSellerBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm ${className}`}
      title="Producto con el mayor volumen de rotación en los últimos 3 meses"
    >
      <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse flex-shrink-0" />
      <span>Más vendido (Últimos 3 meses)</span>
      {salesCount ? <span className="text-[10px] font-bold opacity-80">({salesCount} unds)</span> : null}
    </span>
  )
}
