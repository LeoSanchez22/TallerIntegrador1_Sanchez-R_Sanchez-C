import { useState } from "react";
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

export function Forecasting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(products[0]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A365D] mb-2">Predicción de Demanda</h1>
        <p className="text-[#64748B]">Predicción de demanda a 3 meses con LSTM y análisis de tendencias estacionales</p>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <label className="block text-[#1A365D] font-semibold mb-3">Search Ophthalmic SKU</label>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter product name or SKU..."
            className="w-full pl-12 pr-4 py-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
          />
        </div>
      </div>

      {/* Selected Product Details */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-[#1A365D] mb-1">{selectedProduct.name}</h2>
            <p className="text-[#64748B]">SKU: {selectedProduct.sku}</p>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            selectedProduct.risk === "high"
              ? "bg-red-100 text-red-700"
              : selectedProduct.risk === "medium"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-green-100 text-green-700"
          }`}>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-semibold capitalize">{selectedProduct.risk} Risk</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-[#F8FAFC] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-[#64748B]" />
              <span className="text-sm text-[#64748B]">Current Stock</span>
            </div>
            <p className="text-2xl font-bold text-[#1A365D]">{selectedProduct.currentStock.toLocaleString()}</p>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#00B4D8]" />
              <span className="text-sm text-[#64748B]">Predicted Demand (3mo)</span>
            </div>
            <p className="text-2xl font-bold text-[#00B4D8]">{selectedProduct.predicted3mo.toLocaleString()}</p>
          </div>
          <div className="bg-[#F8FAFC] rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-[#64748B]" />
              <span className="text-sm text-[#64748B]">Trend Pattern</span>
            </div>
            <p className="text-2xl font-bold text-[#1A365D] capitalize">{selectedProduct.trend}</p>
          </div>
        </div>

        {/* Forecast Chart */}
        <div>
          <h3 className="text-lg font-bold text-[#1A365D] mb-4">Seasonal Trend Graph</h3>
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart
              data={forecastData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              id="forecast-chart"
            >
              <defs>
                <linearGradient id="colorActual-forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1A365D" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1A365D" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorForecast-forecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00B4D8" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00B4D8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="month" stroke="#64748B" />
              <YAxis stroke="#64748B" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                }}
              />
              <Area
                type="monotone"
                dataKey="actual"
                stroke="#1A365D"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorActual-forecast)"
                name="Demanda Histórica"
                connectNulls={false}
                isAnimationActive={false}
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
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-1">Potential Stockout Risk Detected</h4>
                <p className="text-sm text-red-700">
                  Current inventory levels may not meet predicted demand. Consider increasing production by{" "}
                  <span className="font-semibold">
                    {((selectedProduct.predicted3mo - selectedProduct.currentStock) / selectedProduct.currentStock * 100).toFixed(0)}%
                  </span>{" "}
                  to avoid stockouts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Product List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-[#1A365D]">All Products</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A365D]">Product</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A365D]">Current Stock</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A365D]">3-Month Forecast</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A365D]">Risk Level</th>
                <th className="text-left px-6 py-3 text-sm font-semibold text-[#1A365D]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredProducts.map((product, index) => (
                <tr
                  key={index}
                  className={`hover:bg-[#F8FAFC] transition-colors cursor-pointer ${
                    selectedProduct.sku === product.sku ? "bg-[#00B4D8]/5" : ""
                  }`}
                  onClick={() => setSelectedProduct(product)}
                >
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#1A365D]">{product.name}</div>
                    <div className="text-sm text-[#64748B]">{product.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-[#1A365D]">{product.currentStock.toLocaleString()}</td>
                  <td className="px-6 py-4 font-semibold text-[#00B4D8]">{product.predicted3mo.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      product.risk === "high"
                        ? "bg-red-100 text-red-700"
                        : product.risk === "medium"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {product.risk.charAt(0).toUpperCase() + product.risk.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="text-sm text-[#00B4D8] hover:text-[#0096C7] font-semibold">
                      View Details
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
