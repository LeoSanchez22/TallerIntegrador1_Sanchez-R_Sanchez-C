'use client'

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RiLockPasswordLine, RiLoader4Line, RiCheckLine, RiArrowRightLine } from "react-icons/ri";
import { supabase } from "../../../../lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Check if we have an active session (parsed from the email reset link hash by Supabase)
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // If no active session, it means they didn't come from a valid reset link
        setError("Enlace de recuperación no válido o expirado. Por favor, solicita uno nuevo.");
      }
    };
    checkSession();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Automatically redirect to the app dashboard after 3 seconds
        setTimeout(() => {
          router.push("/app");
        }, 3000);
      }
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error inesperado al actualizar la contraseña.");
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

        {/* Card */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 shadow-2xl">
          {!success ? (
            <>
              <h1 className="text-2xl font-black text-white mb-2 tracking-tight">Establecer Nueva Contraseña</h1>
              <p className="text-neutral-400 text-sm mb-8">
                Ingresa tu nueva contraseña para restaurar el acceso completo a tu cuenta.
              </p>

              <form onSubmit={handleReset} className="space-y-6">
                {error && (
                  <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 font-semibold animate-fadeIn">
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Nueva Contraseña</label>
                  <div className="relative">
                    <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Confirmar Contraseña</label>
                  <div className="relative">
                    <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repite la contraseña"
                      autoComplete="new-password"
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
                  {loading ? "Actualizando..." : "Restablecer Contraseña"}
                </button>
              </form>
            </>
          ) : (
            <div className="text-center py-6">
              <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <RiCheckLine className="w-6 h-6 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-black text-white mb-2 tracking-tight">¡Contraseña Actualizada!</h1>
              <p className="text-neutral-400 text-sm mb-8 leading-relaxed">
                Tu contraseña ha sido restablecida con éxito. Redirigiéndote de forma segura al panel de control en unos segundos...
              </p>
              <Link
                href="/app"
                className="w-full py-3 bg-emerald-500 text-neutral-950 font-bold rounded-lg hover:bg-emerald-400 transition-colors text-sm shadow-lg shadow-emerald-500/10 flex justify-center items-center gap-2"
              >
                <span>Acceder al Dashboard ahora</span>
                <RiArrowRightLine className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
