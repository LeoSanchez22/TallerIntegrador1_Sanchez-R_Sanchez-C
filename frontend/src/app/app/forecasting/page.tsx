'use client'

import { useState, useEffect } from "react";
import { Search, TrendingUp, AlertTriangle, Calendar, Package } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

const forecastData = [
  { month: "Ene", actual: 12400 },
  { month: "Feb", actual: 13200 },
  { month: "Mar", actual: 14800 },
  { month: "Abr", actual: 15600 },
  { month: "May", actual: 16200 },
  { month: "Jun", actual: 17800 },
  { month: "Jul", forecast: 18500 },
  { month: "Ago", forecast: 19200 },
  { month: "Sep", forecast: 20100 },
];

const products = [
  {
    sku: "OPH-LUB-005",
    name: "Lubricant Drops 5ml",
    currentStock: 2400,
    predicted3mo: 5800,
    risk: "medium",
    trend: "increasing",
  },
  {
    sku: "OPH-GLU-010",
    name: "Anti-glaucoma Solution 10ml",
    currentStock: 890,
    predicted3mo: 3200,
    risk: "high",
    trend: "increasing",
  },
  {
    sku: "OPH-ANT-015",
    name: "Antibiotic Eye Drops 15ml",
    currentStock: 4200,
    predicted3mo: 3100,
    risk: "low",
    trend: "stable",
  },
  {
    sku: "OPH-PRE-005",
    name: "Preservative-free Tears 5ml",
    currentStock: 1650,
    predicted3mo: 4500,
    risk: "high",
    trend: "increasing",
  },
];

export default function Forecasting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(products[0]);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    setMounted(true);
    const checkTheme = () => {
      const isLight = document.documentElement.classList.contains('light');
      setTheme(isLight ? 'light' : 'dark');
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!mounted) {
    return (
      <div className="flex justify-center items-center h-64 w-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">Predicción de Demanda</h1>
        <p className="text-neutral-500 dark:text-neutral-400">Predicción de demanda a 3 meses con LSTM y análisis de tendencias estacionales</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all duration-200">
        <label className="block text-neutral-850 dark:text-white font-semibold mb-3">Buscar SKU Oftálmico</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-450 dark:text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ingrese el nombre del producto o SKU..."
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-neutral-900 dark:text-white transition-colors"
          />
        </div>
      </div>

      {/* Selected Product Details */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-3xl p-6 border border-neutral-200 dark:border-neutral-800 shadow-xl transition-all duration-200">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{selectedProduct.name}</h2>
            <p className="text-neutral-500 dark:text-neutral-400 font-mono text-sm">SKU: {selectedProduct.sku}</p>
          </div>
          <div className={`px-4 py-2 rounded-xl ${
            selectedProduct.risk === "high"
              ? "bg-red-100 text-red-750 font-bold"
              : selectedProduct.risk === "medium"
              ? "bg-yellow-100 text-yellow-755 font-bold"
              : "bg-green-100 text-green-755 font-bold"
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wider">Riesgo: {selectedProduct.risk}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-neutral-50 dark:bg-neutral-950 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-850/60 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-neutral-455 dark:text-neutral-450" />
              <span className="text-sm font-semibold text-neutral-550 dark:text-neutral-400">Stock Actual</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white">{selectedProduct.currentStock.toLocaleString()}</p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-950 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-850/60 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#00B4D8]" />
              <span className="text-sm font-semibold text-neutral-550 dark:text-neutral-400">Demanda Proyectada (3m)</span>
            </div>
            <p className="text-2xl font-bold text-[#00B4D8]">{selectedProduct.predicted3mo.toLocaleString()}</p>
          </div>
          <div className="bg-neutral-50 dark:bg-neutral-950 rounded-2xl p-5 border border-neutral-200 dark:border-neutral-850/60 shadow-sm transition-colors duration-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-neutral-455 dark:text-neutral-450" />
              <span className="text-sm font-semibold text-neutral-550 dark:text-neutral-400">Patrón de Tendencia</span>
            </div>
            <p className="text-2xl font-bold text-neutral-900 dark:text-white capitalize">{selectedProduct.trend}</p>
          </div>
        </div>

        {/* Forecast Chart */}
        <div className="mt-8">
          <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-4">Gráfico de Tendencia Estacional (LSTM)</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={forecastData}
              margin={{ top: 5, right: 10, left: -5, bottom: 5 }}
              id="forecast-chart"
            >
              <defs>
                <linearGradient id="colorActual-forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={theme === 'light' ? 0.15 : 0.35} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast-forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B4D8" stopOpacity={theme === 'light' ? 0.15 : 0.35} />
                  <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? "#f3f4f6" : "#262626"} />
              <XAxis 
                dataKey="month" 
                stroke={theme === 'light' ? "#6b7280" : "#a3a3a3"} 
                fontSize={11}
                fontWeight="semibold"
              />
              <YAxis 
                stroke={theme === 'light' ? "#6b7280" : "#a3a3a3"} 
                fontSize={11}
                fontWeight="semibold"
                tickFormatter={(value) => `S/ ${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === 'light' ? "white" : "#171717",
                  border: `1px solid ${theme === 'light' ? "#e5e7eb" : "#262626"}`,
                  borderRadius: "16px",
                  color: theme === 'light' ? "#171717" : "white",
                  boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                }}
                formatter={(value: any) => [`S/ ${value.toLocaleString()}`, '']}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorActual-forecast)"
                name="Demanda Histórica"
                connectNulls={false}
                isAnimationActive={true}
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="forecast"
                stroke="#00B4D8"
                strokeWidth={3}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorForecast-forecast)"
                name="Pronóstico LSTM"
                connectNulls={false}
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Stockout Warning */}
        {selectedProduct.risk === "high" && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-950/20 border border-red-250 dark:border-red-900/55 rounded-2xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-bold text-red-900 dark:text-red-400 mb-1">Riesgo de Quiebre de Stock Detectado</h4>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Los niveles de inventario actuales pueden no cubrir la demanda prevista. Considere aumentar el inventario en un{" "}
                  <span className="font-bold">
                    {((selectedProduct.predicted3mo - selectedProduct.currentStock) / selectedProduct.currentStock * 100).toFixed(0)}%
                  </span>{" "}
                  para evitar desabastecimientos.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product List */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden transition-all duration-200">
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800/80">
          <h3 className="font-bold text-neutral-900 dark:text-white uppercase tracking-widest text-xs sm:text-sm">Catálogo de Productos Oftálmicos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Producto</th>
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Stock Actual</th>
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Pronóstico (3 Meses)</th>
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Nivel de Riesgo</th>
                <th className="text-left px-6 py-3 text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950/40">
              {filteredProducts.map((product, index) => (
                <tr
                  key={index}
                  className={`hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors cursor-pointer ${
                    selectedProduct.sku === product.sku ? "bg-[#00B4D8]/10 dark:bg-[#00B4D8]/5 font-bold" : ""
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-neutral-900 dark:text-white text-sm">{product.name}</div>
                    <div className="text-sm text-neutral-450 dark:text-neutral-400 font-mono mt-0.5">{product.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-neutral-850 dark:text-neutral-300 font-semibold">{product.currentStock.toLocaleString()}</td>
                  <td className="px-6 py-4 text-sm font-bold text-[#00B4D8]">{product.predicted3mo.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      product.risk === "high"
                        ? "bg-red-100 text-red-750"
                        : product.risk === "medium"
                        ? "bg-yellow-100 text-yellow-750"
                        : "bg-green-100 text-green-755"
                    }`}>
                      {product.risk}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-xs font-black uppercase tracking-widest text-[#00B4D8] hover:text-[#0096C7] transition-colors">
                      Ver Detalles
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

