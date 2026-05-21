import { Link } from "react-router";
import { TrendingUp, BarChart3, Target } from "lucide-react";
import logo from "../../imports/ChatGPT_Image_26_abr_2026,_13_26_09.png";

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1A365D] via-[#2D4A73] to-[#1A365D]">
      {/* Navigation */}
      <nav className="px-6 py-4 flex items-center justify-between border-b border-white/10 backdrop-blur-sm bg-white/5">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Sophia AI" className="w-10 h-10" />
          <span className="text-xl text-white font-semibold">Sophia AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/login" className="px-4 py-2 text-white hover:text-[#00B4D8] transition-colors">
            Login
          </Link>
          <Link to="/register" className="px-6 py-2 bg-[#00B4D8] text-white rounded-lg hover:bg-[#0096C7] transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-6 pt-20 pb-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl font-bold text-white mb-6 leading-tight">
              Análisis Inteligente de Patrones de Compra con Deep Learning
            </h1>
            <p className="text-xl text-white/80 mb-8 leading-relaxed">
              Transforma tu proceso de ventas con recomendaciones estratégicas basadas en análisis de datos históricos y predicción de demanda.
            </p>
            <Link to="/register" className="inline-flex items-center gap-2 px-8 py-4 bg-[#00B4D8] text-white rounded-lg text-lg hover:bg-[#0096C7] transition-colors">
              Start Free Trial
              <Target className="w-5 h-5" />
            </Link>
          </div>

          {/* Neural Network Visualization */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#00B4D8]/20 to-[#48CAE4]/20 rounded-2xl blur-3xl"></div>
            <div className="relative bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20">
              <div className="grid grid-cols-3 gap-4">
                {[...Array(9)].map((_, i) => (
                  <div key={i} className="aspect-square bg-[#00B4D8]/30 rounded-lg animate-pulse" style={{ animationDelay: `${i * 0.1}s` }}></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="w-14 h-14 bg-[#00B4D8] rounded-xl flex items-center justify-center mb-6">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Predicción de Demanda</h3>
            <p className="text-white/70 leading-relaxed">
              Análisis predictivo con LSTM para forecasting de demanda a 3 meses, identificando tendencias estacionales y alertas de riesgo de desabastecimiento.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mb-6 p-2">
              <img src={logo} alt="AI" className="w-full h-full object-contain" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Recomendaciones Estratégicas</h3>
            <p className="text-white/70 leading-relaxed">
              Sistema inteligente de recomendaciones basado en patrones históricos de compra con precisión superior al 70%, optimizando oportunidades comerciales.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-colors">
            <div className="w-14 h-14 bg-[#00B4D8] rounded-xl flex items-center justify-center mb-6">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-2xl font-semibold text-white mb-4">Analítica Estratégica</h3>
            <p className="text-white/70 leading-relaxed">
              Métricas de rendimiento completas incluyendo Precision@K, análisis de Hit Rate y comparativas de eficiencia operativa impulsadas por IA.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center text-white/60">
          <p>&copy; 2026 Sophia AI. Advanced B2B Solutions for Ophthalmic Laboratories.</p>
        </div>
      </footer>
    </div>
  );
}
