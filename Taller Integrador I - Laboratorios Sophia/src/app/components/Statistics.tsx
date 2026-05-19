import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { TrendingUp, Target, Users, Zap } from "lucide-react";

const precisionData = [
  { k: "K=5", precision: 74 },
  { k: "K=10", precision: 71 },
  { k: "K=15", precision: 68 },
  { k: "K=20", precision: 72 },
];

const efficiencyData = [
  { category: "Tiempo de Respuesta", manual: 45, ai: 12 },
  { category: "Tasa de Precisión", manual: 58, ai: 72 },
  { category: "Identificación Oportunidades", manual: 32, ai: 68 },
  { category: "Satisfacción Cliente", manual: 65, ai: 84 },
];

const hitRateData = [
  { name: "Hit", value: 73, color: "#00B4D8" },
  { name: "Miss", value: 27, color: "#E2E8F0" },
];

export function Statistics() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A365D] mb-2">Estadísticas Avanzadas</h1>
        <p className="text-[#64748B]">Analítica integral y evidencia de mejora en eficiencia de ventas impulsada por IA</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">TARGET MET</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">72.5%</h3>
          <p className="text-sm text-[#64748B]">Precision@K Promedio</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">+18%</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">73%</h3>
          <p className="text-sm text-[#64748B]">Hit Rate</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <span className="text-xs font-semibold text-[#00B4D8] bg-[#00B4D8]/10 px-2 py-1 rounded">IMPROVED</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">+127%</h3>
          <p className="text-sm text-[#64748B]">Ganancia en Eficiencia</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <span className="text-xs font-semibold text-[#64748B] bg-[#E2E8F0] px-2 py-1 rounded">ACTIVE</span>
          </div>
          <h3 className="text-2xl font-bold text-[#1A365D] mb-1">2,847</h3>
          <p className="text-sm text-[#64748B]">Predicciones del Modelo</p>
        </div>
      </div>

      {/* Precision@K Chart */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1A365D] mb-2">Precision@K Performance</h2>
          <p className="text-sm text-[#64748B]">
            Recommendation accuracy at different K values (Target: &gt;70%)
          </p>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={precisionData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            id="precision-chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="k" stroke="#64748B" />
            <YAxis stroke="#64748B" domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
              }}
            />
            <Bar
              dataKey="precision"
              fill="#00B4D8"
              radius={[8, 8, 0, 0]}
              name="Precision %"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Hit Rate Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#1A365D] mb-2">Hit Rate Analysis</h2>
            <p className="text-sm text-[#64748B]">Percentage of successful recommendations accepted by clients</p>
          </div>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                id="hitrate-chart"
              >
                <Pie
                  data={hitRateData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  isAnimationActive={false}
                >
                  {hitRateData.map((entry) => (
                    <Cell key={`hitrate-cell-${entry.name}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="text-center mt-4">
            <p className="text-4xl font-bold text-[#00B4D8]">73%</p>
            <p className="text-sm text-[#64748B] mt-1">Recommendations Accepted</p>
          </div>
        </div>

        {/* Model Performance Summary */}
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-[#1A365D] mb-2">Model Performance Summary</h2>
            <p className="text-sm text-[#64748B]">Key performance indicators for deployed models</p>
          </div>
          <div className="space-y-4">
            <div className="p-4 bg-[#F8FAFC] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#64748B]">NCF Model Accuracy</span>
                <span className="text-sm font-semibold text-[#1A365D]">72.5%</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div className="h-2 rounded-full bg-[#00B4D8]" style={{ width: "72.5%" }}></div>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#64748B]">LSTM Forecast Accuracy</span>
                <span className="text-sm font-semibold text-[#1A365D]">68.3%</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div className="h-2 rounded-full bg-[#00B4D8]" style={{ width: "68.3%" }}></div>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#64748B]">Data Quality Score</span>
                <span className="text-sm font-semibold text-[#1A365D]">91.2%</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div className="h-2 rounded-full bg-green-600" style={{ width: "91.2%" }}></div>
              </div>
            </div>
            <div className="p-4 bg-[#F8FAFC] rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-[#64748B]">Model Training Status</span>
                <span className="text-sm font-semibold text-green-600">Healthy</span>
              </div>
              <div className="w-full bg-[#E2E8F0] rounded-full h-2">
                <div className="h-2 rounded-full bg-green-600" style={{ width: "100%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Before vs After Comparison */}
      <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-[#1A365D] mb-2">Toma de Decisiones Manual vs Impulsada por IA</h2>
          <p className="text-sm text-[#64748B]">
            Análisis de impacto: Antes vs Después de implementación de IA (Evidencia Sprint 2)
          </p>
        </div>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={efficiencyData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            id="efficiency-chart"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
            <XAxis dataKey="category" stroke="#64748B" />
            <YAxis stroke="#64748B" domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                backgroundColor: "white",
                border: "1px solid #E2E8F0",
                borderRadius: "8px",
              }}
            />
            <Legend />
            <Bar
              dataKey="manual"
              fill="#64748B"
              radius={[8, 8, 0, 0]}
              name="Decisiones Manuales %"
              isAnimationActive={false}
            />
            <Bar
              dataKey="ai"
              fill="#00B4D8"
              radius={[8, 8, 0, 0]}
              name="Eficiencia con IA %"
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
