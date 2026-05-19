import { TrendingUp, DollarSign, Target, Users, CheckCircle, AlertCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const salesData = [
  { month: "Ene", historical: 905000, predicted: 916000 },
  { month: "Feb", historical: 990000, predicted: 1002000 },
  { month: "Mar", historical: 1075000, predicted: 1068000 },
  { month: "Abr", historical: 1153000, predicted: 1164000 },
  { month: "May", historical: 1212000, predicted: 1227000 },
  { month: "Jun", historical: 1312000, predicted: 1323000 },
  { month: "Jul", predicted: 1397000 },
  { month: "Ago", predicted: 1460000 },
  { month: "Sep", predicted: 1523000 },
];

const pipelineSteps = [
  { step: "Data Collection", status: "completed", progress: 100 },
  { step: "Data Cleaning", status: "completed", progress: 100 },
  { step: "Feature Engineering", status: "in-progress", progress: 68 },
  { step: "Model Training", status: "pending", progress: 0 },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A365D] mb-2">Dashboard Ejecutivo</h1>
        <p className="text-[#64748B]">Insights en tiempo real de tu plataforma de optimización de ventas basada en IA</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <span className="text-sm text-green-600 font-semibold">+12.5%</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">S/ 1.52M</h3>
          <p className="text-sm text-[#64748B]">Ventas Proyectadas (3m)</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <span className="text-sm text-green-600 font-semibold">Healthy</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">72%</h3>
          <p className="text-sm text-[#64748B]">Precisión del Modelo</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <span className="text-sm text-[#00B4D8] font-semibold">New</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">24</h3>
          <p className="text-sm text-[#64748B]">Nuevas Oportunidades</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <span className="text-sm text-[#64748B] font-semibold">Active</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">187</h3>
          <p className="text-sm text-[#64748B]">Clientes Activos</p>
        </div>
      </div>

      {/* Sales Chart */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1A365D] mb-2">Ventas Históricas vs Predicción LSTM</h2>
          <p className="text-sm text-[#64748B]">Forecasting a 3 meses con predicciones de red neuronal</p>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={salesData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            id="sales-chart"
          >
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
            <Legend />
            <Line
              type="monotone"
              dataKey="historical"
              stroke="#1A365D"
              strokeWidth={3}
              name="Ventas Históricas"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="predicted"
              stroke="#00B4D8"
              strokeWidth={3}
              strokeDasharray="5 5"
              name="Predicción LSTM"
              dot={false}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data Pipeline Status */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1A365D] mb-2">Estado del Pipeline de Datos</h2>
          <p className="text-sm text-[#64748B]">Seguimiento en tiempo real del proceso de limpieza y estructuración de datos</p>
        </div>
        <div className="space-y-4">
          {pipelineSteps.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {item.status === "completed" ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : item.status === "in-progress" ? (
                    <div className="w-5 h-5 border-2 border-[#00B4D8] border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <AlertCircle className="w-5 h-5 text-[#CBD5E1]" />
                  )}
                  <span className="font-semibold text-[#1A365D]">{item.step}</span>
                </div>
                <span className="text-sm text-[#64748B]">{item.progress}%</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    item.status === "completed" ? "bg-green-600" : "bg-[#00B4D8]"
                  }`}
                  style={{ width: `${item.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
