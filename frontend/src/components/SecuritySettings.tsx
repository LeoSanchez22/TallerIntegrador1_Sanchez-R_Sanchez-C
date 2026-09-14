'use client'

import { useState } from "react";
import { ShieldCheck, KeyRound, Lock, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function SecuritySettings() {
  const [isOpen, setIsOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("La nueva contraseña debe contener al menos 6 caracteres.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden. Verifique los campos.");
      return;
    }

    setLoading(true);

    try {
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateErr) {
        throw updateErr;
      }

      setSuccess("¡Tu contraseña ha sido actualizada con éxito!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsOpen(false);
        setSuccess(null);
      }, 3000);
    } catch (err: any) {
      setError(err?.message || "Ocurrió un error al actualizar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all duration-200">
      <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="w-5 h-5 text-sophia-blue dark:text-sky-400" />
          <h3 className="font-black text-xs uppercase tracking-widest text-neutral-800 dark:text-white">
            Seguridad y Acceso
          </h3>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Cambiar Contraseña Item */}
        <div className="p-5 bg-neutral-50 dark:bg-neutral-950/70 rounded-2xl border border-neutral-200 dark:border-neutral-800/80 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sophia-blue/10 flex items-center justify-center border border-sophia-blue/20 flex-shrink-0">
                <KeyRound className="w-5 h-5 text-sophia-blue dark:text-sky-400" />
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
                  Cambiar Contraseña de Cuenta
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  Actualiza tu clave de acceso institucional para mantener protegidas tus operaciones comerciales.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(!isOpen);
                setError(null);
                setSuccess(null);
              }}
              className="px-5 py-2.5 bg-sophia-blue hover:bg-sophia-blue-600 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all shadow-md shadow-sophia-blue/20 flex-shrink-0 min-h-[44px]"
            >
              {isOpen ? "Cerrar" : "Modificar Clave"}
            </button>
          </div>

          {/* Expandable Form */}
          {isOpen && (
            <form onSubmit={handlePasswordChange} className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4 animate-fadeIn max-w-lg">
              {success && (
                <div className="p-4 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-sky-500" />
                  <span>{success}</span>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite tu nueva contraseña"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-sophia-blue hover:bg-sophia-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-sophia-blue/20 flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      <span>Actualizar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
