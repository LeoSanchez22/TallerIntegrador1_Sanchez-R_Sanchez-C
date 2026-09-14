'use client'

import { useState, useEffect } from "react";
import { User, Mail, Briefcase, Building2, Loader2, Edit3, CheckCircle2, AlertCircle, X, Save } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function ProfileDetails() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setUser(session.user);
          setFullName(session.user.user_metadata?.full_name || "");
          setCompany(session.user.user_metadata?.company || "Laboratorios Sophia S.A.");
        }
      } catch (err) {
        console.error("Error fetching user session for profile:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        if (session) {
          setUser(session.user);
          setFullName(session.user.user_metadata?.full_name || "");
          setCompany(session.user.user_metadata?.company || "Laboratorios Sophia S.A.");
        } else {
          setUser(null);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          company: company.trim()
        }
      });

      if (error) {
        throw error;
      }

      if (data?.user) {
        setUser(data.user);
      }

      setSuccessMsg("¡Perfil actualizado correctamente!");
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || "No se pudo actualizar el perfil.");
    } finally {
      setSaving(false);
    }
  };

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario Sophia";
  const email = user?.email || "usuario@sophia.com";
  
  // Format role name for visual layout
  const rawRole = user?.user_metadata?.role || "sales-manager";
  const roleMap: Record<string, string> = {
    "sales-manager": "Gerente de Ventas",
    "data-analyst": "Analista de Datos",
    "executive": "Ejecutivo Comercial",
    "operations": "Director de Operaciones",
  };
  const role = roleMap[rawRole] || rawRole;

  const currentCompany = user?.user_metadata?.company || "Laboratorios Sophia S.A.";
  const initials = (user?.user_metadata?.full_name || name).substring(0, 2).toUpperCase();
  
  const createdDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : "Enero 2026";

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-2xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm flex justify-center items-center h-48 transition-all duration-200">
        <Loader2 className="w-8 h-8 text-sophia-blue animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {successMsg && (
        <div className="p-4 bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-sky-500" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-24 h-24 bg-gradient-to-br from-sophia-blue to-sky-600 rounded-2xl flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-800 flex-shrink-0">
            <span className="text-3xl text-white font-black tracking-wider">{initials}</span>
          </div>
          <div className="flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
              <div>
                <h2 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tight">{name}</h2>
                <p className="text-neutral-500 dark:text-neutral-400 font-semibold text-xs sm:text-sm capitalize mt-0.5">
                  {role} • Miembro desde {createdDate}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(!isEditing);
                  setErrorMsg(null);
                }}
                className={`px-4 py-2 rounded-xl transition-all font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 min-h-[44px] ${
                  isEditing
                    ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200'
                    : 'bg-sophia-blue hover:bg-sophia-blue-600 text-white shadow-md shadow-sophia-blue/20'
                }`}
              >
                {isEditing ? (
                  <>
                    <X className="w-4 h-4" />
                    <span>Cancelar</span>
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4" />
                    <span>Editar Perfil</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-800 space-y-4 animate-fadeIn">
            <h4 className="text-xs font-black uppercase tracking-widest text-sophia-blue dark:text-sky-400">
              Actualizar Información de Perfil
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                  Compañía / Organización
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Laboratorios Sophia S.A."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-neutral-900 dark:text-white text-xs font-semibold focus:outline-none focus:border-sophia-blue dark:focus:border-sophia-blue-400 transition-all"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                Descartar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-sophia-blue hover:bg-sophia-blue-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-sophia-blue/20 flex items-center gap-1.5 disabled:opacity-50 min-h-[44px]"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Account Details View */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all duration-200">
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-black text-xs uppercase tracking-widest text-neutral-800 dark:text-white">Detalles de la Cuenta</h3>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {/* Nombre */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-sophia-blue/10 rounded-xl flex items-center justify-center">
              <User className="w-6 h-6 text-sophia-blue dark:text-sky-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Nombre Completo</p>
              <p className="text-neutral-800 dark:text-white font-bold text-sm mt-0.5">{name}</p>
            </div>
          </div>
          
          {/* Correo */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-sky-500/10 rounded-xl flex items-center justify-center">
              <Mail className="w-6 h-6 text-sky-600 dark:text-sky-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Correo Electrónico</p>
              <p className="text-neutral-800 dark:text-white font-bold text-sm mt-0.5">{email}</p>
            </div>
          </div>
          
          {/* Cargo */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Cargo / Rol</p>
              <p className="text-neutral-800 dark:text-white font-bold text-sm mt-0.5 capitalize">{role}</p>
            </div>
          </div>
          
          {/* Compañia */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Compañía / Organización</p>
              <p className="text-neutral-800 dark:text-white font-bold text-sm mt-0.5">{currentCompany}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
