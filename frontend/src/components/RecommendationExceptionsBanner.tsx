'use client'

import React from 'react';

interface RecommendationExceptionsBannerProps {
  mensaje: string;
}

export default function RecommendationExceptionsBanner({ mensaje }: RecommendationExceptionsBannerProps) {
  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 my-3 flex items-start space-x-3 text-amber-700 dark:text-amber-300">
      <div className="flex-shrink-0 w-2 h-2 mt-2 rounded-full bg-amber-500 font-bold" />
      <div className="space-y-1">
        <h5 className="text-xs font-bold uppercase tracking-wider">Restricción de Seguridad B2B / Excepción</h5>
        <p className="text-sm">{mensaje}</p>
      </div>
    </div>
  );
}
