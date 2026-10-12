'use client'

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Sparkles,
  User,
  Users,
  LineChart,
  Building2,
  ShieldCheck,
  Timer,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { fetchWithAuth } from "../../lib/apiClient";
import { touchSessionMarker } from "../../lib/sessionMarkers";
import { useSessionTimeout } from "../../hooks/useSessionTimeout";
import Navbar from "../../components/Navbar";
import ConsentGate from "../../components/ConsentGate";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // RF-17 · Cierre de sesión automático por inactividad (aviso + invalidación).
  const { secondsLeft, totalMinutes, warningMinutes, extendSession } = useSessionTimeout();

  const navItems = [
    { path: "/app", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/app/clients", icon: Building2, label: "Clientes" },
    { path: "/app/recommendations", icon: Sparkles, label: "Recomendaciones" },
    { path: "/app/forecasting", icon: LineChart, label: "Pronóstico" },
    { path: "/app/users", icon: Users, label: "Gestionar Usuarios", adminOnly: true },
    { path: "/app/audit", icon: ShieldCheck, label: "Auditoría", adminOnly: true },
    { path: "/app/profile", icon: User, label: "Mi Perfil" },
  ];

  useEffect(() => {
    // Close mobile drawer on route change
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    // 1. Sync sidebar state with localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebarCollapsed');
      if (stored === 'true') {
        setIsSidebarCollapsed(true);
      }
    }

    // 2. Check current active session and sync real-time role
    let mounted = true;
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
        } else {
          let dbUserMeta = null;
          try {
            const profileRes = await fetchWithAuth('/api/users/me');
            if (profileRes.ok) {
              dbUserMeta = await profileRes.json();
            } else if (profileRes.status === 401) {
              console.warn("[AUTH INIT] Cuenta inhabilitada. Cerrando sesión...");
              await supabase.auth.signOut();
              router.push("/login");
              return;
            }
          } catch (profileErr) {
            console.error("Error fetching real-time role profile:", profileErr);
          }

          if (mounted) {
            let currentUser = session.user;
            if (dbUserMeta) {
              const localMeta = session.user.user_metadata || {};
              const roleChanged = dbUserMeta.role !== localMeta.role;
              const nameChanged = dbUserMeta.name !== localMeta.full_name;
              const companyChanged = dbUserMeta.company !== localMeta.company;

              if (roleChanged || nameChanged || companyChanged) {
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
                if (refreshedSession) {
                  currentUser = refreshedSession.user;
                }
              }
            }
            setUser(currentUser);
            // RNF-04 / RF-17 · Renueva el marcador de sesión que vigila el middleware.
            touchSessionMarker();
            setCheckingAuth(false);
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
        router.push("/login");
      }
    };
    checkSession();

    // 3. Listen for dynamic authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push("/login");
      } else if (session) {
        if (mounted) {
          setUser(session.user);
          touchSessionMarker();
          setCheckingAuth(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      const newVal = !isSidebarCollapsed;
      setIsSidebarCollapsed(newVal);
      localStorage.setItem('sidebarCollapsed', String(newVal));
    }
  };

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";
  const userInitials = userName.substring(0, 2).toUpperCase();

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans antialiased relative overflow-hidden px-4">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(17,63,156,0.15),transparent_70%)]"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <img src="/logo-sophia-color.png" alt="Logo Sophia" className="h-14 sm:h-16 w-auto object-contain animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sophia-blue animate-ping"></span>
            <span className="text-xs uppercase tracking-widest font-black text-neutral-400">Verificando Credenciales...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex selection:bg-sophia-blue/30 font-sans antialiased transition-colors duration-200">
      
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`bg-white dark:bg-neutral-900/95 backdrop-blur-2xl border-r border-neutral-200 dark:border-neutral-800/80 text-neutral-800 dark:text-white flex flex-col fixed h-full shadow-2xl z-40 transition-transform lg:transition-all duration-300 ${
          isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${isSidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}`}
      >
        {/* Logo Header */}
        <div className="p-4 sm:p-6 border-b border-neutral-200 dark:border-neutral-800/80 h-16 sm:h-20 flex items-center justify-between lg:justify-center overflow-hidden">
          <Link href="/app" className="flex items-center gap-2">
            {isSidebarCollapsed ? (
              <span className="hidden lg:block text-xl font-black text-sophia-blue dark:text-sophia-blue-300 tracking-wider">S.</span>
            ) : null}
            <img
              src="/logo-sophia-color.png"
              alt="Logo Sophia"
              className={`h-8 sm:h-10 w-auto object-contain dark:brightness-110 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}
            />
          </Link>

          {/* Close mobile button */}
          <button
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="p-2 text-neutral-400 hover:text-neutral-900 dark:hover:text-white lg:hidden rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar menú"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 p-3 sm:p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
          {navItems
            .filter((item) => !item.adminOnly || user?.user_metadata?.role === 'admin')
            .map((item) => {
              const isActive = pathname === item.path || (item.path !== '/app' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 px-3.5 py-3 sm:py-3.5 rounded-xl transition-all duration-200 font-semibold text-sm min-h-[44px] ${
                    isActive
                      ? "bg-sophia-blue/10 text-sophia-blue dark:text-sophia-blue-300 border border-sophia-blue/30 shadow-inner font-bold"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white"
                  } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-sophia-blue dark:text-sophia-blue-300' : ''}`} />
                  <span className={`${isSidebarCollapsed ? 'lg:hidden' : 'block'} truncate`}>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-neutral-950/30">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-9 h-9 bg-sophia-blue text-white rounded-full flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-xs font-black">{userInitials}</span>
            </div>
            <div className={`flex-1 min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{userName}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-sophia-blue dark:text-sophia-blue-400 truncate">Miembro Sophia</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Container */}
      <div
        className={`flex-1 flex flex-col min-h-screen transition-all duration-300 w-full ${
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Top Navbar Component */}
        <Navbar
          onToggleSidebar={toggleSidebar}
          user={user}
          isSidebarCollapsed={isSidebarCollapsed}
        />

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 w-full max-w-7xl mx-auto relative overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* RF-17 · Aviso previo al cierre de sesión por inactividad */}
      {secondsLeft !== null && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="idle-timeout-title"
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 shadow-2xl p-8 text-center animate-scaleIn"
          >
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto mb-5">
              <Timer className="w-7 h-7" />
            </div>
            <h2 id="idle-timeout-title" className="text-xl font-black text-neutral-900 dark:text-white uppercase mb-2">
              Sesión por expirar
            </h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
              Tu sesión se cerrará automáticamente en{" "}
              <strong className="text-amber-500 font-black">{secondsLeft}s</strong> por {totalMinutes} minutos de
              inactividad (RF-17). Deberás volver a autenticarte.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => router.push("/login?reason=idle_timeout")}
                className="flex-1 py-3.5 px-4 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all min-h-[44px]"
              >
                Cerrar sesión ahora
              </button>
              <button
                type="button"
                onClick={extendSession}
                className="flex-1 py-3.5 px-4 bg-sophia-blue hover:bg-sophia-dark text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(17,63,156,0.35)] min-h-[44px]"
              >
                Continuar con sesión ({warningMinutes} min)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ley N° 29733 · Consentimiento informado y aviso de privacidad */}
      <ConsentGate />
    </div>
  );
}
