'use client'

import { RiDatabase2Line } from "react-icons/ri";

interface PipelineStatusProps {
  totalRows: number;
}

export default function PipelineStatus({ totalRows }: PipelineStatusProps) {
  return (
    <div className="bg-gradient-to-br from-white to-neutral-50 dark:from-neutral-900 dark:to-neutral-950 rounded-xl p-6 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <RiDatabase2Line className="w-8 h-8 text-emerald-500" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Estado del Pool de Conexión</h2>
        </div>
        <span className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalRows.toLocaleString()} Filas en RAM</span>
      </div>
      <div className="w-full bg-neutral-200 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-full h-3">
        <div className="h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" style={{ width: "100%" }}></div>
      </div>
      <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-3">Sincronización completada exitosamente desde el Transaction Pooler (Puerto 6543)</p>
    </div>
  );
}
