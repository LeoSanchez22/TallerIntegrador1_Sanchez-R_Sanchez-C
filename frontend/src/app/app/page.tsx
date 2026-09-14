'use client'

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Sparkles,
  Building2,
  LineChart,
  ArrowRight,
  TrendingUp,
  Package,
  ShieldCheck,
  Award
} from "lucide-react";
import { fetchWithAuth } from '../../lib/apiClient';
import KPICards from "../../components/KPICards";

export default function Dashboard() {
  const [zonas, setZonas] = useState<string[]>([]);
  const [selectedZona, setSelectedZona] = useState<string>('Todas');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar Zonas
  useEffect(() => {
    let active = true;
    fetchWithAuth('/api/zonas')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        if (active && data.zonas) setZonas(['Todas', ...data.zonas]);
      })
      .catch(err => console.error("Error cargando zonas comercial:", err));
    return () => { active = false; };
  }, []);

  // Cargar KPIs con optimización de cancelado/debouncing
  const fetchDashboardData = useCallback((zona: string) => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    fetchWithAuth(`/api/dashboard?zona=${encodeURIComponent(zona)}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.details || errData.error || `Error ${res.status}`);
        }
        return res.json();
      })
      .then(data => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setError(err.message || 'Error de conexión con el servidor.');
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cleanup = fetchDashboardData(selectedZona);
    return cleanup;
  }, [selectedZona, fetchDashboardData]);

  const topProducts = dashboardData?.top_productos || [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-sophia-blue/10 text-sophia-blue dark:text-sophia-blue-300 text-[10px] font-black uppercase tracking-wider border border-sophia-blue/20">
              Laboratorios Sophia • Área Comercial
            </span>
            <span className="text-neutral-400 text-xs font-medium">Líderes en Oftalmología Humana</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-neutral-900 dark:text-white tracking-tight">
            Panel de Inteligencia & Ventas Oftálmicas
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1 max-w-2xl">
            Monitoreo en tiempo real de facturación, rotación de colirios, cobertura de farmacias y oportunidades de prescripción.
          </p>
        </div>
        
        {/* Dropdown de Zonas */}
        <div className="flex flex-col gap-1 min-w-[240px]">
          <label className="text-xs font-bold text-sophia-blue dark:text-sophia-blue-300 uppercase tracking-wider">
            Zona Comercial
          </label>
          <select 
            className="w-full bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-sophia-blue focus:outline-none shadow-sm transition-all cursor-pointer font-bold text-xs"
            value={selectedZona}
            onChange={(e) => setSelectedZona(e.target.value)}
          >
            {zonas.length > 0 ? (
              zonas.map(z => (
                <option key={z} value={z} className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
                  {z === 'Todas' ? 'Todas las Zonas (Nacional)' : z}
                </option>
              ))
            ) : (
              <option className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
                Cargando zonas...
              </option>
            )}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col justify-center items-center h-64 gap-3">
          <Loader2 className="w-10 h-10 text-sophia-blue animate-spin" />
          <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Actualizando indicadores comerciales...</span>
        </div>
      ) : error ? (
        <div className="text-center p-12 bg-red-500/10 rounded-3xl border border-red-500/20 shadow-xl">
          <p className="text-red-500 text-xl font-bold mb-2">Error de Conexión: {error}</p>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Asegúrate de que los servicios de backend estén iniciados y accesibles.</p>
        </div>
      ) : (
        <>
          {/* KPI Cards Row */}
          <KPICards dashboardData={dashboardData} />

          {/* Grid de Secciones Comerciales */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Fármacos Más Demandados */}
            <div className="lg:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-sophia-blue/10 flex items-center justify-center text-sophia-blue dark:text-sophia-blue-300">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-neutral-900 dark:text-white">
                      Top Fármacos Oftálmicos por Recurrencia
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Mayor rotación en {selectedZona === 'Todas' ? 'territorio nacional' : selectedZona}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-sophia-blue dark:text-sophia-blue-300 bg-sophia-blue/10 px-2.5 py-1 rounded-full">
                  Líderes de Prescripción
                </span>
              </div>

              <div className="space-y-3">
                {topProducts.length > 0 ? (
                  topProducts.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-neutral-950/60 border border-slate-100 dark:border-neutral-800/60 hover:border-sophia-blue/40 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center ${
                          idx === 0 
                            ? 'bg-[#FFBE00] text-neutral-900' 
                            : idx === 1 
                            ? 'bg-slate-300 text-neutral-900' 
                            : idx === 2 
                            ? 'bg-amber-600/30 text-amber-800 dark:text-amber-200' 
                            : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
                        }`}>
                          #{idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-neutral-900 dark:text-white">{item.producto}</p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Línea Oftalmológica Sophia</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-sophia-blue dark:text-sophia-blue-300">
                          {item.ventas} pedidos
                        </span>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">Alta Rotación</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-400 text-center py-6">No hay transacciones registradas para este filtro.</p>
                )}
              </div>
            </div>

            {/* Módulos y Acciones Rápidas */}
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-sophia-blue to-sophia-dark text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-10 pointer-events-none">
                  <Sparkles className="w-48 h-48" />
                </div>
                <div className="relative z-10 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 text-white px-2.5 py-1 rounded-full">
                    Módulo de Ventas
                  </span>
                  <h3 className="text-lg font-black leading-tight">Recomendaciones & Cross-Selling</h3>
                  <p className="text-xs text-blue-100 leading-relaxed">
                    Genera sugerencias personalizadas de colirios para cada clínica y farmacia según su histórico de compras.
                  </p>
                  <Link
                    href="/app/recommendations"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sophia-blue font-black text-xs uppercase tracking-wider hover:bg-neutral-100 transition-all shadow-md mt-2"
                  >
                    <span>Abrir Recomendador</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 border border-sky-500/20">
                    <LineChart className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white">Pronóstico de Demanda</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Planificación de stock trimestral</p>
                  </div>
                </div>
                <Link
                  href="/app/forecasting"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  <span>Ver Curvas de Demanda</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </Link>
              </div>

              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/80 rounded-3xl p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-neutral-900 dark:text-white">Cartera de Clientes</h4>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">Gestión de instituciones y compras</p>
                  </div>
                </div>
                <Link
                  href="/app/clients"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-neutral-950 hover:bg-slate-100 dark:hover:bg-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
                >
                  <span>Administrar Instituciones</span>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
