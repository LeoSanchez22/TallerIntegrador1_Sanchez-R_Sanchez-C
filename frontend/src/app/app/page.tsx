'use client'

import { useState, useEffect, useCallback } from 'react';
import { RiLoader4Line } from "react-icons/ri";
import KPICards from "../../components/KPICards";

export default function Dashboard() {
  const [zonas, setZonas] = useState<string[]>([]);
  const [selectedZona, setSelectedZona] = useState<string>('Todas');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Cargar Zonas
  useEffect(() => {
    let active = true;
    fetch('http://127.0.0.1:3005/api/zonas')
      .then(res => res.json())
      .then(data => {
        if (active && data.zonas) setZonas(['Todas', ...data.zonas]);
      })
      .catch(err => console.error(err));
    return () => { active = false; };
  }, []);

  // Cargar KPIs con optimización de cancelado/debouncing para evitar ciclos o lags
  const fetchDashboardData = useCallback((zona: string) => {
    setLoading(true);
    const controller = new AbortController();
    fetch(`http://127.0.0.1:3005/api/dashboard?zona=${encodeURIComponent(zona)}`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        setDashboardData(data);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error(err);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cleanup = fetchDashboardData(selectedZona);
    return cleanup;
  }, [selectedZona, fetchDashboardData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Datos cargados en tiempo real desde base de datos Supabase</p>
        </div>
        
        {/* Dropdown de Zonas */}
        <div className="flex flex-col gap-1 min-w-[250px]">
          <label className="text-xs font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-wider">Filtro por Zona Comercial</label>
          <select 
            className="w-full bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-xl transition-all cursor-pointer font-semibold"
            value={selectedZona}
            onChange={(e) => setSelectedZona(e.target.value)}
          >
            {zonas.length > 0 ? (
              zonas.map(z => (
                <option key={z} value={z} className="bg-white dark:bg-neutral-950 text-neutral-900 dark:text-white">
                  {z}
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
        <div className="flex justify-center items-center h-64">
          <RiLoader4Line className="w-10 h-10 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          <KPICards dashboardData={dashboardData} />
        </>
      )}
    </div>
  );
}
