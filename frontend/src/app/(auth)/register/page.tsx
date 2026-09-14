'use client'

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { User, Mail, Briefcase, Building2, Lock, Check, Loader2 } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const logo = "https://cdn-icons-png.flaticon.com/512/8297/8297121.png";

export default function Register() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
    company: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            role: formData.role,
            company: formData.company
          }
        }
      });

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        setStep(3);
        setLoading(false);
      }
    } else {
      router.push("/app");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex items-center justify-center p-6 relative overflow-hidden font-sans antialiased transition-colors duration-200">
      {/* Background Subtle Radial Gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-200/40 dark:bg-sky-950/20 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-100/50 dark:bg-blue-950/20 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>

      <div className="max-w-xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center justify-center mb-4">
            <img src="/logo-sophia-color.png" alt="Laboratorios Sophia" className="h-10 w-auto object-contain" />
          </Link>
          <h1 className="text-3xl font-black text-neutral-900 dark:text-white mb-2 tracking-tight">Crear Cuenta</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm">Únete a la plataforma predictiva avanzada para Laboratorios Sophia</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s ? "bg-sophia-blue text-white shadow-md shadow-sophia-blue/30" : "bg-white dark:bg-neutral-900 text-neutral-400 border border-slate-200 dark:border-neutral-800"
              }`}>
                {step > s ? <Check className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-[2px] ${step > s ? "bg-sophia-blue" : "bg-slate-200 dark:bg-neutral-800"}`}></div>}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 p-3.5 rounded-xl text-sm border border-red-200 dark:border-red-800 font-semibold flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}
            
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Nombre Completo</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Dr. Alejandro Gómez"
                      autoComplete="name"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sophia-blue text-neutral-900 dark:text-white placeholder-neutral-400 transition-all text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ejemplo@sophiasciences.com"
                      autoComplete="email"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sophia-blue text-neutral-900 dark:text-white placeholder-neutral-400 transition-all text-sm"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Corporate Role */}
            {step === 2 && (
              <>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Cargo / Rol</label>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sophia-blue text-neutral-900 dark:text-white transition-all text-sm cursor-pointer"
                      required
                    >
                      <option value="">Selecciona tu rol</option>
                      <option value="sales-manager">Gerente de Ventas</option>
                      <option value="data-analyst">Analista de Datos</option>
                      <option value="executive">Ejecutivo Comercial</option>
                      <option value="operations">Director de Operaciones</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">Nombre de la Institución / Empresa</label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Laboratorios Sophia S.A."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-neutral-950 border border-slate-200 dark:border-neutral-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-sophia-blue text-neutral-900 dark:text-white placeholder-neutral-400 transition-all text-sm"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Verification */}
            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-sophia-blue dark:text-sky-400" />
                </div>
                <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-3">Revisa tu correo</h3>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm mb-6 leading-relaxed">
                  Hemos enviado un enlace de verificación a <span className="font-semibold text-sophia-blue dark:text-sky-400">{formData.email}</span>
                </p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Haz clic en el enlace para activar tu cuenta y acceder a tu dashboard analítico.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-sophia-blue text-white font-bold rounded-xl hover:bg-sophia-blue-600 transition-all flex justify-center items-center gap-2 disabled:opacity-70 text-sm shadow-lg shadow-sophia-blue/20 hover:shadow-xl hover:shadow-sophia-blue/30 active:scale-95"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {step === 3 ? "Ir al Dashboard" : loading ? "Procesando..." : "Continuar"}
            </button>
          </form>

          {step < 3 && (
            <p className="mt-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-sophia-blue dark:text-sky-400 font-bold hover:underline">
                Inicia sesión
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
