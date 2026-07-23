'use client'

import React from 'react';

interface XAIAuditCardProps {
  producto: string;
  motor: string;
  detonante?: string;
  cantidadSugerida?: number;
  ingresoEstimado?: number;
  justificacion: string;
  probabilidad: number;
}

export default function XAIAuditCard({
  producto,
  motor,
  detonante,
  cantidadSugerida,
  ingresoEstimado,
  justificacion,
  probabilidad
}: XAIAuditCardProps) {
  const párrafos = justificacion ? justificacion.split('\n\n') : [justificacion];

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-5 shadow-sm space-y-4 transition-all">
      {/* Header Fármaco y Métricas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Fármaco Sugerido:</span>
            <h4 className="text-base font-black text-neutral-900 dark:text-white uppercase tracking-wide">
              {producto}
            </h4>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
            Motor: <span className="font-bold text-neutral-800 dark:text-neutral-200">{motor}</span>
            {detonante && ` | Ancla: ${detonante}`}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {cantidadSugerida && (
            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-lg border border-emerald-500/20">
              {cantidadSugerida} unds.
            </span>
          )}
          {ingresoEstimado && (
            <span className="px-3 py-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold rounded-lg border border-blue-500/20">
              S/ {ingresoEstimado.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          )}
          <span className="px-3 py-1 bg-purple-500/10 text-purple-600 dark:text-purple-400 font-extrabold rounded-lg border border-purple-500/20">
            {probabilidad}% Confianza
          </span>
        </div>
      </div>

      {/* Justificación Comercial B2B (2 Párrafos) */}
      <div className="space-y-2 text-xs leading-relaxed text-neutral-700 dark:text-neutral-300 font-medium">
        <h5 className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest">
          Auditoría de Inteligencia Explicable (XAI):
        </h5>
        {párrafos.map((p, idx) => (
          <div key={idx} className="bg-neutral-50 dark:bg-neutral-950 p-3 rounded-xl border border-neutral-200 dark:border-neutral-800">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
              {idx === 0 ? 'Origen y Fundamento Algorítmico:' : 'Planificación Temporal y Capacidad Financiera:'}
            </span>
            <p>{p}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
