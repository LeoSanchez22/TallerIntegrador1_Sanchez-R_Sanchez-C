'use client'

import { DollarSign, Target, Users, Sparkles } from "lucide-react";

interface KPICardsProps {
  dashboardData: any;
}

export default function KPICards({ dashboardData }: KPICardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
      {/* 1. Volumen de Ingresos */}
      <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sophia-blue/10 rounded-xl flex items-center justify-center border border-sophia-blue/20">
            <DollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-sophia-blue dark:text-sky-400" />
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-bold">Venta Real</span>
        </div>
        <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1 truncate" title={`S/ ${Number(dashboardData?.ingresos_totales || 0).toLocaleString()}`}>
          S/ {Math.round(dashboardData?.ingresos_totales || 0).toLocaleString('es-PE', { maximumFractionDigits: 0 })}
        </h3>
        <p className="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">Facturación Acumulada</p>
      </div>

      {/* 2. SKU Más Solicitado */}
      <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#FFBE00]/10 rounded-xl flex items-center justify-center border border-[#FFBE00]/20">
            <Target className="w-5 h-5 sm:w-6 sm:h-6 text-[#FFBE00]" />
          </div>
          <span className="text-xs bg-[#FFBE00]/20 text-amber-700 dark:text-[#FFBE00] px-2 py-0.5 rounded-full font-bold">Líder</span>
        </div>
        <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1 truncate" title={dashboardData?.top_productos?.[0]?.producto || 'SOPHIXAL'}>
          {dashboardData?.top_productos?.[0]?.producto || 'SOPHIXAL'}
        </h3>
        <p className="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">Colirio Más Prescrito</p>
      </div>

      {/* 3. Clínicas & Boticas */}
      <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-500/10 rounded-xl flex items-center justify-center border border-purple-500/20">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-xs bg-purple-500/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-full font-bold">Cartera</span>
        </div>
        <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1">
          {dashboardData?.clientes_activos || 0}
        </h3>
        <p className="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">Clínicas & Boticas Activas</p>
      </div>

      {/* 4. Variedad de Fármacos */}
      <div className="bg-white dark:bg-neutral-900/80 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all hover:shadow-md duration-200">
        <div className="flex items-center justify-between mb-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-sky-500/10 rounded-xl flex items-center justify-center border border-sky-500/20">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-xs bg-sky-500/20 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full font-bold">Catálogo</span>
        </div>
        <h3 className="text-xl sm:text-2xl xl:text-3xl font-black text-neutral-900 dark:text-white mb-1">
          {dashboardData?.productos_vendidos || 0}
        </h3>
        <p className="text-xs sm:text-sm font-semibold text-neutral-500 dark:text-neutral-400">Líneas Farmacéuticas Activas</p>
      </div>
    </div>
  );
}
