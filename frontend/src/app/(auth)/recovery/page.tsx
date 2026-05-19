'use client'

import Link from "next/link";
import { useState } from "react";
import { RiMailLine, RiArrowLeftLine, RiCheckLine, RiLoader4Line } from "react-icons/ri";
import { supabase } from "../../../lib/supabase";

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
        setSubmitted(true);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error inesperado al enviar el enlace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden font-sans antialiased">
      {/* Background Subtle Radial Gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_50%)]"></div>

      <div className="max-w-md w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo-sophia-color.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
        </div>

        {/* Card (Next.js Sleek Card Style) */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 shadow-2xl">
          {!submitted ? (
            <>
              <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Recuperar Contraseña</h1>
              <p className="text-neutral-400 text-sm mb-8">
                Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña de forma segura.
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 font-semibold animate-fadeIn">
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
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors text-sm shadow-lg shadow-white/5 flex justify-center items-center gap-2 disabled:opacity-75"
                >
                  {loading && <RiLoader4Line className="w-5 h-5 animate-spin" />}
                  {loading ? "Enviando..." : "Enviar enlace de recuperación"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <RiCheckLine className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black text-white mb-2 tracking-tight">¡Enlace Enviado!</h1>
              <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                Hemos enviado las instrucciones de recuperación a <span className="font-semibold text-white">{email}</span>. Revisa tu bandeja de entrada.
              </p>
            </div>
          )}

          <div className="mt-8 border-t border-neutral-900 pt-6 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-white transition-colors"
            >
              <RiArrowLeftLine className="w-4 h-4" />
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
