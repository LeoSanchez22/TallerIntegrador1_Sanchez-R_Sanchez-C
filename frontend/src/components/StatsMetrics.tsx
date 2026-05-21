'use client'

import { RiFocus2Line, RiLineChartLine, RiFlashlightLine, RiGroupLine } from "react-icons/ri";

interface StatsMetricsProps {
  statsData: any;
}

export default function StatsMetrics({ statsData }: StatsMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Precision@K Promedio */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-green-100/10 rounded-lg flex items-center justify-center">
            <RiFocus2Line className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-950/50 px-2 py-1 rounded border border-green-200 dark:border-green-800/30">TARGET MET</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{(Number(statsData?.precision || 0)*100).toFixed(1)}%</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Precision@K Promedio</p>
      </div>

      {/* 2. Hit Rate Global */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
            <RiLineChartLine className="w-6 h-6 text-[#00B4D8]" />
          </div>
          <span className="text-xs font-semibold text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-950/50 px-2 py-1 rounded border border-green-200 dark:border-green-800/30">+18%</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{(Number(statsData?.hitRate || 0)*100).toFixed(1)}%</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Hit Rate Global</p>
      </div>

      {/* 3. Ganancia en Eficiencia */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
            <RiFlashlightLine className="w-6 h-6 text-[#00B4D8]" />
          </div>
          <span className="text-xs font-semibold text-[#00B4D8] bg-[#00B4D8]/10 px-2 py-1 rounded border border-[#00B4D8]/20">IMPROVED</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">+127%</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Ganancia en Eficiencia</p>
      </div>

      {/* 4. Transacciones Históricas */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
            <RiGroupLine className="w-6 h-6 text-neutral-600 dark:text-[#00B4D8]" />
          </div>
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700">ACTIVE</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{(statsData?.total_interacciones || 0).toLocaleString()}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Transacciones Históricas (Real)</p>
      </div>
    </div>
  );
}
