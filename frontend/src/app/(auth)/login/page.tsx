'use client'

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Mail, Lock, Loader2, ArrowLeft, ShieldCheck, Sparkles, TimerOff, Info } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { reportAuthEvent } from "../../../lib/auditEvents";
import { touchSessionMarker } from "../../../lib/sessionMarkers";

/** Mensajes asociados a los cierres de sesión automáticos (RF-17 / RNF-04). */
const REASON_MESSAGES: Record<string, string> = {
  idle_timeout:
    "Tu sesión se cerró automáticamente por inactividad (RF-17). Vuelve a autenticarte para continuar.",
  session_required: "Debes iniciar sesión para acceder a los módulos operativos (RNF-04).",
  session_expired: "Tu sesión ha expirado. Vuelve a autenticarte para continuar.",
};

/**
 * Normaliza el mensaje de error de Supabase Auth a los códigos canónicos
 * admitidos por el endpoint público `POST /api/security/auth-event` (RF-16),
 * de modo que el log de auditoría permanece normalizado y consultable.
 */
function mapSupabaseAuthError(message?: string): string {
  const value = (message || "").toLowerCase();
  if (value.includes("invalid login credentials")) return "credenciales_invalidas";
  if (value.includes("email not confirmed")) return "usuario_no_encontrado";
  if (value.includes("user not found")) return "usuario_no_encontrado";
  if (value.includes("disabled") || value.includes("inhabilitad")) return "cuenta_inhabilitada";
  if (value.includes("network") || value.includes("fetch")) return "error_de_red";
  return "credenciales_invalidas";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(REASON_MESSAGES[reason || ""] || null);

  useEffect(() => {
    setNotice(REASON_MESSAGES[reason || ""] || null);
  }, [reason]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // RF-16 · Intento de inicio de sesión fallido (queda en el log con IP y hora).
      // El motivo se normaliza al catálogo canónico que admite el backend.
      void reportAuthEvent({
        event: "login_failed",
        email,
        reason: mapSupabaseAuthError(error.message)
      });
      setError(error.message);
      setLoading(false);
    } else {
      // RF-16 · Inicio exitoso + RNF-04 · marcador de sesión para el middleware.
      void reportAuthEvent({ event: "login_success", email });
      touchSessionMarker();
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-white grid lg:grid-cols-2 relative overflow-hidden font-sans antialiased transition-colors duration-200">
      
      {/* Left Panel - Brand Showcase with Sophia Gradient */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-sophia-blue-900 via-sophia-blue to-sky-600 text-white relative z-10 shadow-2xl overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-sky-400/20 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

        <Link href="/" className="inline-flex items-center gap-2 group text-white/80 hover:text-white transition-colors w-fit">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-bold">Volver al inicio</span>
        </Link>

        <div className="max-w-md my-auto relative z-10">
          <div className="p-3 bg-white rounded-2xl w-fit mb-8 shadow-xl">
            <img src="/logo-sophia-color.png" alt="Laboratorios Sophia" className="h-10 w-auto object-contain" />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-white text-xs font-bold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-sky-300" />
            <span>Sistema XAI & Forecasting Farmacéutico</span>
          </div>

          <h2 className="text-4xl font-black mb-6 leading-tight tracking-tight">
            Pronóstico de Demanda y Recomendaciones Clínicas
          </h2>
          <p className="text-base text-white/90 leading-relaxed font-normal">
            Plataforma con modelos Attention-GRU y algoritmos de asociación terapéutica diseñada para optimizar la toma de decisiones comerciales en el sector oftalmológico.
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-white/70 border-t border-white/15 pt-6">
          <span>&copy; 2026 Laboratorios Sophia S.A.</span>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-300" />
            <span>Acceso Seguro Encriptado</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form (Clean Pharma Light Mode) */}
      <div className="p-8 sm:p-12 flex flex-col justify-center relative z-10 w-full max-w-md mx-auto lg:max-w-none">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile Back button and Logo */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-bold">Inicio</span>
            </Link>
            <img src="/logo-sophia-color.png" alt="Logo Sophia" className="h-8 w-auto object-contain" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">Iniciar Sesión</h1>
            <p className="text-neutral-500 dark:text-neutral-400 text-sm">Ingresa con tus credenciales asignadas para acceder a la plataforma</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {notice && (
              <div className="bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-3.5 rounded-xl text-sm border border-amber-200 dark:border-amber-800 font-semibold flex items-start gap-2 animate-fadeIn">
                <TimerOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-sm border border-red-200 dark:border-red-800 font-semibold flex items-center gap-2 animate-shake">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@laboratoriossophia.com"
                  autoComplete="username"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sophia-blue focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 transition-all text-sm shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Contraseña</label>
                <Link href="/recovery" className="text-xs font-semibold text-sophia-blue dark:text-sky-400 hover:underline transition-colors">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-11 pr-4 py-3 bg-white dark:bg-neutral-900 border border-slate-300 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sophia-blue focus:border-transparent text-neutral-900 dark:text-white placeholder-neutral-400 transition-all text-sm shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input type="checkbox" className="w-4 h-4 rounded bg-white dark:bg-neutral-900 border-slate-300 dark:border-neutral-700 text-sophia-blue focus:ring-sophia-blue cursor-pointer" />
                <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">Recordar sesión</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-sophia-blue text-white font-bold rounded-xl hover:bg-sophia-blue-600 transition-all flex justify-center items-center gap-2 disabled:opacity-70 text-sm shadow-lg shadow-sophia-blue/20 hover:shadow-xl hover:shadow-sophia-blue/30 active:scale-95"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? "Iniciando Sesión..." : "Acceder a Sophia XAI"}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-neutral-500 dark:text-neutral-400">
            ¿No tienes una cuenta aún?{" "}
            <Link href="/register" className="text-sophia-blue dark:text-sky-400 font-bold hover:underline">
              Regístrate aquí
            </Link>
          </p>

          {/* Ley N° 29733 · Aviso de privacidad y consentimiento informado */}
          <p className="mt-4 text-center text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
            Al continuar aceptas el tratamiento de tus datos personales conforme a nuestro{" "}
            <Link
              href="/privacy"
              target="_blank"
              className="inline-flex items-center gap-1 font-bold text-sophia-blue dark:text-sky-400 hover:underline"
            >
              <Info className="w-3 h-3" />
              Aviso de Privacidad (Ley N° 29733)
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Login() {
  // useSearchParams requiere un límite de Suspense en Next.js 15.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-sophia-blue"></div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

