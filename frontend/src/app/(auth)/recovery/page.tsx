'use client'

import Link from "next/link";
import { useState } from "react";
import { Mail, ArrowLeft, Check, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { reportAuthEvent } from "../../../lib/auditEvents";

export default function PasswordRecovery() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Directs the user to the reset password form after clicking the email link
      const resetRedirectUrl = `${window.location.origin}/recovery/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirectUrl,
      });
      if (error) {
        setError(error.message);
      } else {
        // RF-16 · Solicitud de recuperación de clave registrada en el log de auditoría.
        void reportAuthEvent({ event: "password_recovery_requested", email });
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error inesperado al enviar el enlace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center p-6 relative overflow-hidden font-sans antialiased transition-colors duration-200">
      {/* Background Subtle Radial Gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-200/40 dark:bg-sky-950/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/50 dark:bg-blue-950/20 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <img src="/logo-sophia-color.png" alt="Laboratorios Sophia" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          {!submitted ? (
            <>
              <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Recuperar Contraseña</h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-sm mb-8">
                Ingresa tu correo electrónico institucional y te enviaremos un enlace seguro para restablecer tu contraseña.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-sm border border-red-200 dark:border-red-800 font-semibold animate-fadeIn">
                    {error}
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
                      autoComplete="email"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sophia-blue text-neutral-900 dark:text-white placeholder-neutral-400 transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-sophia-blue text-white font-bold rounded-xl hover:bg-sophia-blue-600 transition-all text-sm shadow-lg shadow-sophia-blue/20 hover:shadow-xl hover:shadow-sophia-blue/30 flex justify-center items-center gap-2 disabled:opacity-75 active:scale-95"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {loading ? "Enviando enlace..." : "Enviar enlace de recuperación"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-6 h-6 text-sophia-blue dark:text-sky-400" />
              </div>
              <h1 className="text-2xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">¡Enlace Enviado!</h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-8 leading-relaxed">
                Hemos enviado las instrucciones de recuperación a <span className="font-semibold text-sophia-blue dark:text-sky-400">{email}</span>. Revisa tu bandeja de entrada.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-slate-200 dark:border-neutral-800 pt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-neutral-500 hover:text-sophia-blue dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
