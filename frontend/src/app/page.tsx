'use client'

import Link from "next/link";
import { LineChart, Zap, Sparkles, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between selection:bg-sophia-blue/30 selection:text-white font-sans antialiased relative overflow-hidden">
      {/* Background Subtle Radial Gradients */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(17,63,156,0.15),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(2,132,199,0.1),transparent_50%)]"></div>

      {/* Navigation */}
      <nav className="px-8 py-4 flex items-center justify-between border-b border-neutral-800/80 backdrop-blur-md bg-slate-950/80 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <img src="/logo-sophia-color.png" alt="Logo Sophia" className="h-8 w-auto object-contain dark:brightness-110" />
        </div>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-sm font-semibold text-neutral-400 hover:text-white transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/register" className="px-4 py-2 text-sm font-bold bg-sophia-blue text-white rounded-xl hover:bg-sophia-blue-600 transition-colors shadow-lg shadow-sophia-blue/20">
            Registrarse
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-24 text-center relative z-10 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-sophia-blue/30 bg-sophia-blue/10 text-sophia-blue-300 text-xs font-bold mb-8 tracking-wide mx-auto">
          <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
          Sistema Predictivo Comercial & Recomendaciones IA
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-300 mb-8 leading-tight max-w-4xl mx-auto tracking-tight">
          Análisis de Patrones de Compra con Inteligencia Artificial
        </h1>

        <p className="text-md sm:text-lg text-neutral-400 max-w-3xl mx-auto leading-relaxed mb-10">
          Plataforma empresarial de analítica predictiva y optimización de cartera para Laboratorios Sophia. Identifica oportunidades de cross-selling comercial, pronóstico de demanda trimestral y afinidad terapéutica con alta precisión.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-sophia-blue text-white font-bold rounded-xl text-md hover:bg-sophia-blue-600 transition-all shadow-xl shadow-sophia-blue/25 group">
            Comenzar Ahora
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-neutral-900 text-neutral-300 border border-neutral-800 font-bold rounded-xl text-md hover:bg-neutral-800 hover:text-white transition-colors">
            Acceso a la Plataforma
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-20 relative z-10 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-8 border border-neutral-800 hover:border-sophia-blue/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-sophia-blue/10 border border-sophia-blue/30 rounded-xl flex items-center justify-center mb-6">
                <LineChart className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Pronóstico de Demanda</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Forecasting a 3 meses modelado por redes neuronales recurrentes Attention-GRU, optimizando la cadena de suministro y previniendo quiebres de stock.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-8 border border-neutral-800 hover:border-sophia-blue/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-sophia-blue/10 border border-sophia-blue/30 rounded-xl flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Oportunidades Comerciales</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Recomendaciones B2B con justificación de ventas directa y persuasiva, identificando los productos con mayor probabilidad de aceptación.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-8 border border-neutral-800 hover:border-sophia-blue/50 transition-all flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 bg-sophia-blue/10 border border-sophia-blue/30 rounded-xl flex items-center justify-center mb-6">
                <Zap className="w-6 h-6 text-sky-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-3">Similitud de Nuevos Lanzamientos</h3>
              <p className="text-sm text-neutral-400 leading-relaxed">
                Motor NLP TF-IDF para solucionar el escenario de Cold Start en nuevos fármacos, cruzando su composición terapéutica con el historial de compras.
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
