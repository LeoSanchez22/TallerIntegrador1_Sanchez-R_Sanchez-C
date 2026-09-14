'use client'

import Link from "next/link";
import { LineChart, Zap, Sparkles, ArrowRight, ShieldCheck, Database, BarChart3, ChevronRight, Activity } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex flex-col justify-between selection:bg-sophia-blue/20 selection:text-sophia-blue font-sans antialiased relative overflow-hidden transition-colors duration-200">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-sky-200/40 dark:bg-sky-950/20 rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-100/50 dark:bg-blue-950/20 rounded-full blur-3xl pointer-events-none -ml-32 -mb-32"></div>

      {/* Navigation */}
      <nav className="px-6 sm:px-10 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-neutral-800/80 backdrop-blur-md bg-white/80 dark:bg-neutral-950/80 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-3">
          <img src="/logo-sophia-color.png" alt="Laboratorios Sophia" className="h-9 sm:h-10 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href="/login" className="text-sm font-bold text-neutral-600 dark:text-neutral-300 hover:text-sophia-blue dark:hover:text-sky-400 transition-colors">
            Iniciar Sesión
          </Link>
          <Link href="/register" className="px-5 py-2.5 text-sm font-bold bg-sophia-blue text-white rounded-xl hover:bg-sophia-blue-600 transition-all shadow-md shadow-sophia-blue/20 hover:shadow-lg hover:shadow-sophia-blue/30 active:scale-95">
            Registrarse
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto px-6 pt-16 pb-20 text-center relative z-10 flex-1 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sky-200 dark:border-sky-800/50 bg-sky-50 dark:bg-sky-950/40 text-sophia-blue dark:text-sky-300 text-xs font-bold mb-8 tracking-wide mx-auto shadow-sm">
          <span className="w-2.5 h-2.5 rounded-full bg-sky-500 animate-pulse"></span>
          Sistema Predictivo Comercial & Recomendaciones IA · Laboratorios Sophia
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-neutral-900 dark:text-white mb-6 leading-[1.15] max-w-4xl mx-auto tracking-tight">
          Inteligencia Artificial y Pronóstico de Demanda Farmacéutica
        </h1>

        <p className="text-base sm:text-lg text-neutral-600 dark:text-neutral-300 max-w-3xl mx-auto leading-relaxed mb-10 font-normal">
          Plataforma empresarial de analítica predictiva para <strong className="font-semibold text-sophia-blue dark:text-sky-400">Laboratorios Sophia</strong>. Anticipa patrones de compra, optimiza abastecimiento con redes neuronales Attention-GRU y descubre oportunidades de cross-selling clínico con alta precisión.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-sophia-blue text-white font-bold rounded-xl text-base hover:bg-sophia-blue-600 transition-all shadow-xl shadow-sophia-blue/25 hover:shadow-2xl hover:shadow-sophia-blue/30 active:scale-95 group">
            Acceso a la Plataforma
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link href="/register" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border border-slate-300 dark:border-neutral-700 font-bold rounded-xl text-base hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all shadow-sm">
            Crear Cuenta Comercial
          </Link>
        </div>

        {/* Live Metrics Pill Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto w-full">
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-sm">
            <p className="text-2xl font-black text-sophia-blue dark:text-sky-400">4,725</p>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Transacciones Reales</p>
          </div>
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-sm">
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">94.2%</p>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Calidad de Datos</p>
          </div>
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-sm">
            <p className="text-2xl font-black text-sky-600 dark:text-sky-400">&lt; 15ms</p>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">Tiempo Inferencia</p>
          </div>
          <div className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-neutral-800 shadow-sm">
            <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">100%</p>
            <p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">XAI Explicable</p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-6xl mx-auto px-6 pb-20 relative z-10 w-full">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white dark:bg-neutral-900/90 rounded-2xl p-8 border border-slate-200/90 dark:border-neutral-800 hover:border-sophia-blue/40 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/50 rounded-xl flex items-center justify-center mb-6 text-sophia-blue dark:text-sky-400 group-hover:scale-110 transition-transform">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">Pronóstico de Demanda</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Modelado predictivo a 3 meses con redes recurrentes Attention-GRU, permitiendo anticipar requerimientos de stock y planificar distribución en clínicas y cadenas.
              </p>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="bg-white dark:bg-neutral-900/90 rounded-2xl p-8 border border-slate-200/90 dark:border-neutral-800 hover:border-sophia-blue/40 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 rounded-xl flex items-center justify-center mb-6 text-sophia-blue dark:text-sky-400 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">Oportunidades Comerciales</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Recomendaciones B2B con justificación de ventas clínica y persuasiva, identificando los fármacos de mayor probabilidad de compra y afinidad terapéutica.
              </p>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="bg-white dark:bg-neutral-900/90 rounded-2xl p-8 border border-slate-200/90 dark:border-neutral-800 hover:border-sophia-blue/40 shadow-lg shadow-slate-200/50 dark:shadow-none hover:shadow-xl transition-all flex flex-col justify-between group">
            <div>
              <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/50 rounded-xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-3">Nuevos Lanzamientos & Cold Start</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Motor NLP TF-IDF para registrar nuevos medicamentos e integrarlos inmediatamente al árbol de afinidad según su indicación, formato y composición química.
              </p>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-slate-200 dark:border-neutral-900 py-8 w-full bg-white/50 dark:bg-neutral-950/50">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500 dark:text-neutral-400">
          <p>&copy; 2026 Laboratorios Sophia S.A. Todos los derechos reservados.</p>
          <div className="flex items-center gap-6 font-semibold">
            <span>Privacidad</span>
            <span>Términos</span>
            <span>Soporte</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

