'use client'

import { RiLineChartLine, RiMoneyDollarCircleLine, RiFocus2Line, RiGroupLine } from "react-icons/ri";

interface KPICardsProps {
  dashboardData: any;
}

export default function KPICards({ dashboardData }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Volumen de Ingresos */}
      <div className="bg-white dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all hover:scale-[1.02] duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
            <RiMoneyDollarCircleLine className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />
          </div>
          <span className="text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 px-2 py-1 rounded-full font-bold">+Real</span>
        </div>
        <h3 className="text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1 truncate" title={`S/ ${Number(dashboardData?.ingresos_totales || 0).toLocaleString()}`}>
          S/ {Math.round(dashboardData?.ingresos_totales || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </h3>
        <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Volumen de Ingresos</p>
      </div>

      {/* 2. SKU Más Solicitado */}
      <div className="bg-white dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all hover:scale-[1.02] duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-[#FFBE00]/10 rounded-xl flex items-center justify-center border border-[#FFBE00]/20">
            <RiFocus2Line className="w-6 h-6 text-[#FFBE00]" />
          </div>
          <span className="text-xs bg-[#FFBE00]/20 text-[#FFBE00] px-2 py-1 rounded-full font-bold">Top</span>
        </div>
        <h3 className="text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1 truncate">
          {dashboardData?.top_productos?.[0]?.producto || 'N/A'}
        </h3>
        <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">SKU Más Solicitado</p>
      </div>

      {/* 3. Clínicas Registradas */}
      <div className="bg-white dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all hover:scale-[1.02] duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
            <RiGroupLine className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-1 rounded-full font-bold">Base</span>
        </div>
        <h3 className="text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1">
          {dashboardData?.clientes_activos || 0}
        </h3>
        <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Clínicas Registradas</p>
      </div>

      {/* 4. Variedad de Productos */}
      <div className="bg-white dark:bg-neutral-900/60 backdrop-blur-md rounded-2xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all hover:scale-[1.02] duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-xl flex items-center justify-center border border-[#00B4D8]/20">
            <RiLineChartLine className="w-6 h-6 text-[#00B4D8]" />
          </div>
          <span className="text-xs bg-[#00B4D8]/20 text-[#00B4D8] px-2 py-1 rounded-full font-bold">ML Engine</span>
        </div>
        <h3 className="text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1">
          {dashboardData?.productos_vendidos || 0}
        </h3>
        <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400">Variedad Productos Históricos</p>
      </div>
    </div>
  );
}
