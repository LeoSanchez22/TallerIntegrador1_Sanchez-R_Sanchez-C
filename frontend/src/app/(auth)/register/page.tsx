'use client'

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { RiUserLine, RiMailLine, RiBriefcaseLine, RiBuildingLine, RiLockPasswordLine, RiCheckLine, RiLoader4Line } from "react-icons/ri";
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden font-sans antialiased">
      {/* Background Subtle Radial Gradient */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.02),transparent_50%)]"></div>

      <div className="max-w-xl w-full relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo-sophia-color.png" alt="Logo" className="w-10 h-10 object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Crear Cuenta</h1>
          <p className="text-neutral-400 text-sm">Únete a la plataforma predictiva avanzada para Laboratorios Sophia</p>
        </div>

        {/* Progress Steps (Next.js Monochrome Style) */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                step >= s ? "bg-white text-black" : "bg-neutral-900 text-neutral-500 border border-neutral-800"
              }`}>
                {step > s ? <RiCheckLine className="w-4 h-4" /> : s}
              </div>
              {s < 3 && <div className={`w-12 h-[1px] ${step > s ? "bg-white" : "bg-neutral-800"}`}></div>}
            </div>
          ))}
        </div>

        {/* Form Card (Next.js Sleek Card Style) */}
        <div className="bg-neutral-950 border border-neutral-900 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-sm border border-red-500/20 font-semibold">
                {error}
              </div>
            )}
            
            {/* Step 1: Personal Info */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Nombre Completo</label>
                  <div className="relative">
                    <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ej. Dr. Alejandro Gómez"
                      autoComplete="name"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Correo Electrónico</label>
                  <div className="relative">
                    <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
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

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Contraseña</label>
                  <div className="relative">
                    <RiLockPasswordLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      autoComplete="new-password"
                      className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Corporate Role */}
            {step === 2 && (
              <>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Cargo / Rol</label>
                  <div className="relative">
                    <RiBriefcaseLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white transition-colors text-sm cursor-pointer"
                      required
                    >
                      <option value="" className="bg-black">Selecciona tu rol</option>
                      <option value="sales-manager" className="bg-black">Gerente de Ventas</option>
                      <option value="data-analyst" className="bg-black">Analista de Datos</option>
                      <option value="executive" className="bg-black">Ejecutivo Comercial</option>
                      <option value="operations" className="bg-black">Director de Operaciones</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Nombre de la Empresa</label>
                  <div className="relative">
                    <RiBuildingLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      placeholder="Laboratorios Sophia S.A."
                      className="w-full pl-12 pr-4 py-3 bg-neutral-900 border border-neutral-800 rounded-lg focus:outline-none focus:border-neutral-700 text-white placeholder-neutral-600 transition-colors text-sm"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {/* Step 3: Verification */}
            {step === 3 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-neutral-900 border border-neutral-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <RiMailLine className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Revisa tu correo</h3>
                <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                  Hemos enviado un enlace de verificación a <span className="font-semibold text-white">{formData.email}</span>
                </p>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Haz clic en el enlace para activar tu cuenta y acceder a tu dashboard analítico.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-neutral-200 transition-colors flex justify-center items-center gap-2 disabled:opacity-70 text-sm shadow-lg shadow-white/5"
            >
              {loading && <RiLoader4Line className="w-5 h-5 animate-spin" />}
              {step === 3 ? "Ir al Dashboard" : loading ? "Procesando..." : "Continuar"}
            </button>
          </form>

          {step < 3 && (
            <p className="mt-6 text-center text-xs text-neutral-400">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/login" className="text-white font-bold hover:underline">
                Inicia sesión
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
