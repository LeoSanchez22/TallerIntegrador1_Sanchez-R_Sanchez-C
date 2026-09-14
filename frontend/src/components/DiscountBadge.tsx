'use client'

import React from 'react'
import { Tag, Sparkles } from 'lucide-react'

interface DiscountBadgeProps {
  percentage?: number
  className?: string
  tipo?: string
}

export default function DiscountBadge({ percentage = 15, className = '', tipo = 'En Oferta' }: DiscountBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 shadow-sm ${className}`}
      title={`Precio preferencial con ${percentage}% de descuento para este cliente`}
    >
      <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 flex-shrink-0" />
      <span>{tipo}</span>
      <span className="bg-sophia-blue text-white px-1.5 py-0.2 rounded font-black text-[10px] ml-0.5 shadow-sm">
        -{percentage}%
      </span>
    </span>
  )
}
