import { Target, TrendingUp, MapPin, FileText } from "lucide-react";

const recommendations = [
  {
    client: "VisionCare Pharmaceuticals",
    region: "Lima Metropolitana",
    products: ["Lubricant Drops 5ml", "Anti-glaucoma Solution 10ml"],
    confidence: 87,
    potential: "S/ 167,100",
  },
  {
    client: "OptiMed Solutions",
    region: "Arequipa",
    products: ["Antibiotic Eye Drops", "Preservative-free Tears"],
    confidence: 82,
    potential: "S/ 142,300",
  },
  {
    client: "ClearSight Laboratories",
    region: "Trujillo",
    products: ["Anti-inflammatory Suspension", "Lubricant Drops 5ml"],
    confidence: 79,
    potential: "S/ 192,600",
  },
  {
    client: "EyeCare Direct",
    region: "Cusco",
    products: ["Anti-glaucoma Solution 10ml", "Antihistamine Drops"],
    confidence: 85,
    potential: "S/ 154,500",
  },
  {
    client: "Precision Optics Corp",
    region: "Piura",
    products: ["Lubricant Drops 5ml", "Diagnostic Staining Solution"],
    confidence: 76,
    potential: "S/ 125,300",
  },
  {
    client: "Advanced Eye Solutions",
    region: "Lima Norte",
    products: ["Mydriatic Eye Drops", "Anti-glaucoma Solution 10ml"],
    confidence: 91,
    potential: "S/ 215,500",
  },
];

export function Recommendations() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#1A365D] mb-2">Motor de Recomendaciones</h1>
        <p className="text-[#64748B]">Recomendaciones estratégicas basadas en análisis de patrones de compra con NCF</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-[#00B4D8]" />
            <span className="text-sm text-[#64748B]">Confianza Promedio</span>
          </div>
          <p className="text-2xl font-bold text-[#1A365D]">83.3%</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-[#00B4D8]" />
            <span className="text-sm text-[#64748B]">Potencial Total</span>
          </div>
          <p className="text-2xl font-bold text-[#1A365D]">S/ 997.3K</p>
        </div>
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-[#00B4D8]" />
            <span className="text-sm text-[#64748B]">Recomendaciones Activas</span>
          </div>
          <p className="text-2xl font-bold text-[#1A365D]">{recommendations.length}</p>
        </div>
      </div>

      {/* Recommendations List */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A365D]">Cliente</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A365D]">Región</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A365D]">Recomendación Estratégica</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A365D]">Confianza</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A365D]">Valor Potencial</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-[#1A365D]">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {recommendations.map((rec, index) => (
                <tr key={index} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-[#1A365D]">{rec.client}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{rec.region}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {rec.products.map((product, i) => (
                        <div key={i} className="text-sm text-[#1A365D] bg-[#00B4D8]/5 px-3 py-1 rounded-md inline-block mr-2">
                          {product}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-[#E2E8F0] rounded-full h-2 max-w-[100px]">
                        <div
                          className={`h-2 rounded-full ${
                            rec.confidence >= 85
                              ? "bg-green-600"
                              : rec.confidence >= 75
                              ? "bg-[#00B4D8]"
                              : "bg-yellow-500"
                          }`}
                          style={{ width: `${rec.confidence}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold text-[#1A365D] w-12">{rec.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-[#00B4D8]">{rec.potential}</span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="px-4 py-2 bg-[#1A365D] text-white rounded-lg hover:bg-[#2D4A73] transition-colors text-sm">
                      Generar Cotización
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
