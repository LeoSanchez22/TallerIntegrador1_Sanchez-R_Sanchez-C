'use client'

import { useState, useEffect } from "react";
import { RiUserLine, RiMailLine, RiBriefcaseLine, RiBuildingLine, RiLoader4Line } from "react-icons/ri";
import { supabase } from "../lib/supabase";

export default function ProfileDetails() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const fetchUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && mounted) {
          setUser(session.user);
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

  const company = user?.user_metadata?.company || "Laboratorios Sophia S.A.";
  const initials = name.substring(0, 2).toUpperCase();
  
  const createdDate = user?.created_at 
    ? new Date(user.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    : "Enero 2026";

  if (loading) {
    return (
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm flex justify-center items-center h-48 transition-all duration-200">
        <RiLoader4Line className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Profile Card */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm transition-all duration-200">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="w-24 h-24 bg-gradient-to-br from-emerald-600 to-[#00B4D8] rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-neutral-800">
            <span className="text-3xl text-white font-black tracking-wider">{initials}</span>
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{name}</h2>
            <p className="text-neutral-500 dark:text-neutral-400 mb-4 font-semibold text-sm capitalize">
              {role} • Miembro desde {createdDate}
            </p>
            <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 rounded-lg transition-colors font-bold text-sm shadow-md shadow-emerald-500/10">
              Editar Perfil
            </button>
          </div>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white dark:bg-neutral-900/40 backdrop-blur-md rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-sm overflow-hidden transition-all duration-200">
        <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800">
          <h3 className="font-bold text-neutral-800 dark:text-white">Detalles de la Cuenta</h3>
        </div>
        <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
          {/* Nombre */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
              <RiUserLine className="w-6 h-6 text-emerald-650 dark:text-emerald-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Nombre Completo</p>
              <p className="text-neutral-800 dark:text-white font-bold">{name}</p>
            </div>
          </div>
          
          {/* Correo */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-[#00B4D8]/10 rounded-lg flex items-center justify-center">
              <RiMailLine className="w-6 h-6 text-[#00B4D8]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Correo Electrónico</p>
              <p className="text-neutral-800 dark:text-white font-bold">{email}</p>
            </div>
          </div>
          
          {/* Cargo */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
              <RiBriefcaseLine className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Cargo / Rol</p>
              <p className="text-neutral-800 dark:text-white font-bold capitalize">{role}</p>
            </div>
          </div>
          
          {/* Compañia */}
          <div className="p-6 flex items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/20 transition-colors">
            <div className="w-12 h-12 bg-[#FFBE00]/10 rounded-lg flex items-center justify-center">
              <RiBuildingLine className="w-6 h-6 text-[#FFBE00]" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Compañía / Organización</p>
              <p className="text-neutral-800 dark:text-white font-bold">{company}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
