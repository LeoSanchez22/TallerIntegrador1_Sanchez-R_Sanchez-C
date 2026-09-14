'use client'

import { Target, TrendingUp, Zap, Users } from "lucide-react";

interface StatsMetricsProps {
  statsData: any;
}

export default function StatsMetrics({ statsData }: StatsMetricsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* 1. Precision@K Promedio */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-sophia-blue/10 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-sophia-blue dark:text-sky-400" />
          </div>
          <span className="text-xs font-bold text-sophia-blue dark:text-sky-400 bg-sophia-blue/10 px-2 py-1 rounded border border-sophia-blue/20">TARGET MET</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{(Number(statsData?.precision || 0)*100).toFixed(1)}%</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Precision@K Promedio</p>
      </div>

      {/* 2. Hit Rate Global */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-sky-500/10 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-sky-600 dark:text-sky-400" />
          </div>
          <span className="text-xs font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2 py-1 rounded border border-sky-500/20">+18%</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{(Number(statsData?.hitRate || 0)*100).toFixed(1)}%</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Hit Rate Global</p>
      </div>

      {/* 3. Ganancia en Eficiencia */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center">
            <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20">IMPROVED</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">+127%</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Ganancia en Eficiencia</p>
      </div>

      {/* 4. Transacciones Históricas */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-neutral-100 dark:bg-neutral-800 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-neutral-600 dark:text-sky-400" />
          </div>
          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 bg-neutral-200 dark:bg-neutral-800 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700">ACTIVE</span>
        </div>
        <h3 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{(statsData?.total_interacciones || 0).toLocaleString()}</h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Transacciones Históricas (Real)</p>
      </div>
    </div>
  );
}
