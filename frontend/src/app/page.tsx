'use client'

import Link from "next/link";
import { RiLineChartLine, RiFlashlightLine, RiFocus2Line, RiArrowRightLine } from "react-icons/ri";

const logo = "https://cdn-icons-png.flaticon.com/512/8297/8297121.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col justify-between selection:bg-neutral-800 selection:text-white font-sans antialiased relative overflow-hidden">
      {/* Background Subtle Radial Gradients (Next.js style) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.03),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(0,180,216,0.02),transparent_40%)]"></div>

      {/* Navigation */}
      <nav className="px-8 py-4 flex items-center justify-between border-b border-neutral-900 backdrop-blur-md bg-black/60 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo-sophia-color.png" alt="Logo" className="h-8 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-medium text-neutral-400 hover:text-white transition-colors">
            Login
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm font-bold bg-white text-black rounded-lg hover:bg-neutral-200 transition-colors shadow-lg shadow-white/5">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-24 pb-28 text-center relative z-10 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-neutral-800 bg-neutral-900/50 text-neutral-400 text-xs font-semibold mb-8 tracking-wide">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          Sistema predictivo de ventas
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400 mb-8 leading-tight max-w-4xl mx-auto tracking-tight">
          Análisis de Patrones de Compra con Inteligencia Artificial
        </h1>

        <p className="text-md sm:text-lg text-neutral-400 max-w-3xl mx-auto leading-relaxed mb-12">
          El presente informe detalla la justificación teórica y académica para el desarrollo del sistema predictivo de ventas en Laboratorios Sophia. El objetivo es demostrar, respaldado por la literatura científica reciente, por qué el proceso manual actual es insuficiente y cómo la arquitectura de Inteligencia Artificial propuesta resuelve este problema.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-black font-bold rounded-lg text-md hover:bg-neutral-200 transition-colors shadow-xl shadow-white/5 group">
            Comenzar Ahora
            <RiArrowRightLine className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-neutral-950 text-neutral-300 border border-neutral-800 font-bold rounded-lg text-md hover:bg-neutral-900 hover:text-white transition-colors">
            Ver Demo
          </Link>
        </div>
      </div>

      {/* Features Grid (Next.js style minimalist bento grid) */}
      <div className="max-w-6xl mx-auto px-6 pb-24 relative z-10 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-neutral-950/60 backdrop-blur-md rounded-xl p-8 border border-neutral-900/80 hover:border-neutral-800 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                <RiLineChartLine className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Predicción de Demanda</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Análisis predictivo con modelos Attention-Gru para forecasting de demanda a 3 meses, optimizando el abastecimiento y mitigando quiebres de stock.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-neutral-950/60 backdrop-blur-md rounded-xl p-8 border border-neutral-900/80 hover:border-neutral-800 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                <RiFocus2Line className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Recomendaciones Estratégicas</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Sistema inteligente basado en patrones históricos y afinidad de perfil institucional con precisión académica demostrable en cada predicción.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-neutral-950/60 backdrop-blur-md rounded-xl p-8 border border-neutral-900/80 hover:border-neutral-800 transition-all flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-center mb-6">
                <RiFlashlightLine className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Analítica Avanzada</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Métricas de rendimiento de vanguardia, análisis de Hit Rate y reportes visuales de eficiencia para la toma de decisiones clínicas y comerciales.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-neutral-900 py-8 w-full">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-neutral-600">
          <p>&copy; 2026. Soluciones avanzadas para Laboratorios Sophia. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
