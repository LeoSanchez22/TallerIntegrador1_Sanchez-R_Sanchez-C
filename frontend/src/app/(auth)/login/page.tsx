'use client'

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiMailLine, RiLockPasswordLine, RiLoader4Line, RiArrowLeftLine } from "react-icons/ri";
import { supabase } from "../../../lib/supabase";

const logo = "https://cdn-icons-png.flaticon.com/512/8297/8297121.png";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white grid lg:grid-cols-2 relative overflow-hidden font-sans antialiased">
      {/* Background radial gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.02),transparent_45%)]"></div>

      {/* Left Panel - Brand Mission (Next.js style minimalist) */}
      <div className="hidden lg:flex flex-col justify-between p-12 border-r border-neutral-900 bg-neutral-950/40 relative z-10">
        <Link href="/" className="flex items-center gap-3 group text-neutral-400 hover:text-white transition-colors">
          <RiArrowLeftLine className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-semibold">Volver al inicio</span>
        </Link>
        <div className="max-w-md my-auto">
          <div className="flex items-center gap-3 mb-8">
            <img src="/logo-sophia-color.png" alt="Logo" className="h-12 w-auto object-contain" />
          </div>
          <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-neutral-400 mb-6 leading-tight">
            Análisis de Demanda Farmacéutica con Machine Learning
          </h2>
          <p className="text-md text-neutral-400 leading-relaxed">
            Predicciones de alta fidelidad basadas en Reglas de Asociación Apriori, Segmentación K-Means y Regresión Polinomial (XAI) para la optimización comercial.
          </p>
        </div>
        <div className="text-xs text-neutral-600">
          &copy; 2026. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form (Next.js Style Form) */}
      <div className="p-8 sm:p-12 flex flex-col justify-center relative z-10 w-full max-w-md mx-auto lg:max-w-none">
        <div className="max-w-md w-full mx-auto">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <img src="/logo-sophia-color.png" alt="Logo" className="h-9 w-auto object-contain" />
          </div>

          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Iniciar Sesión</h1>
          <p className="text-neutral-400 text-sm mb-8">Ingresa tus credenciales para acceder a la plataforma</p>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 font-semibold">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@sophiasciences.com"
                  autoComplete="username"
                  className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Contraseña</label>
                <Link href="/recovery" className="text-xs text-neutral-400 hover:text-white transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded bg-neutral-900 border-neutral-800 text-white focus:ring-0 cursor-pointer" />
                <span className="text-xs font-semibold text-neutral-400">Recordarme en este equipo</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-70 text-sm shadow-lg shadow-white/5"
            >
              {loading && <RiLoader4Line className="w-5 h-5 animate-spin" />}
              {loading ? "Iniciando Sesión..." : "Iniciar Sesión"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-neutral-400">
            ¿No tienes una cuenta aún?{" "}
            <Link href="/register" className="text-white font-bold hover:underline">
              Regístrate aquí
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
