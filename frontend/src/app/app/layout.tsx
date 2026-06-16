'use client'

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  RiDashboardLine,
  RiFocus2Line,
  RiBarChartBoxLine,
  RiDatabase2Line,
  RiUserLine,
  RiLogoutBoxRLine,
  RiNotification3Line,
  RiArrowDownSLine,
  RiSettings4Line,
  RiSunLine,
  RiMoonLine,
  RiLineChartLine,
  RiTerminalBoxLine,
} from "react-icons/ri";
import { supabase } from "../../lib/supabase";
import { fetchWithAuth } from "../../lib/apiClient";


export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [user, setUser] = useState<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { path: "/app", icon: RiDashboardLine, label: "Dashboard" },
    { path: "/app/recommendations", icon: RiFocus2Line, label: "Recomendaciones (XAI)" },
    { path: "/app/forecasting", icon: RiLineChartLine, label: "Pronóstico" },
    { path: "/app/statistics", icon: RiBarChartBoxLine, label: "Estadísticas" },
    { path: "/app/pipeline", icon: RiDatabase2Line, label: "Data Pipeline" },
    { path: "/app/notebook", icon: RiTerminalBoxLine, label: "Notebook MVP" },
    { path: "/app/users", icon: RiUserLine, label: "Gestionar Usuarios", adminOnly: true },
    { path: "/app/profile", icon: RiUserLine, label: "Mi Perfil" },
  ];

  useEffect(() => {
    // 1. Sync theme with document class on mount
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');

    // 2. Check current active session and sync real-time role
    let mounted = true;
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
        } else {
          // Fetch real-time profile from database via Hono.js
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
                console.log(`[AUTH SYNC] Datos locales difieren de base de datos. Sincronizando...`);
                // Refrescar sesión para actualizar el token JWT local de Supabase de inmediato
                const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
                if (refreshedSession) {
                  currentUser = refreshedSession.user;
                }
              }
            }
            setUser(currentUser);
            setCheckingAuth(false);
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
        router.push("/login");
      }
    };
    checkSession();

    // 3. Listen for dynamic authentication state changes (Cybersecurity Best Practice)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push("/login");
      } else if (session) {
        if (mounted) {
          setUser(session.user);
          setCheckingAuth(false);
        }
      }
    });

    // 4. Polling de sincronización de datos en tiempo real (evita cerrar sesión/entrar de nuevo)
    const roleSyncInterval = setInterval(async () => {
      if (!mounted) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const profileRes = await fetchWithAuth('/api/users/me');
        if (profileRes.status === 401) {
          console.warn("[AUTH SYNC LOG] Cuenta inhabilitada en segundo plano. Cerrando sesión...");
          await supabase.auth.signOut();
          router.push("/login");
          return;
        }

        if (profileRes.ok) {
          const dbUserMeta = await profileRes.json();
          if (dbUserMeta) {
            const localMeta = session.user.user_metadata || {};
            const roleChanged = dbUserMeta.role !== localMeta.role;
            const nameChanged = dbUserMeta.name !== localMeta.full_name;
            const companyChanged = dbUserMeta.company !== localMeta.company;

            if (roleChanged || nameChanged || companyChanged) {
              console.log(`[AUTH SYNC LOG] Perfil desactualizado detectado. Refrescando token...`);
              const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
              if (refreshedSession && mounted) {
                setUser(refreshedSession.user);
              }
            }
          }
        }
      } catch (err) {
        // Silenciar errores de red en polling de segundo plano
      }
    }, 5000);

    // 5. Click outside listener
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearInterval(roleSyncInterval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [router]);

  const toggleTheme = () => {
    if (theme === 'dark') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      localStorage.theme = 'light';
      setTheme('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      localStorage.theme = 'dark';
      setTheme('dark');
    }
  };

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Dynamic user data extraction from Supabase Session
  const userEmail = user?.email || "usuario@sophia.com";
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";
  const userInitials = userName.substring(0, 2).toUpperCase();

  // Bulletproof Route Guard Fullscreen Loading Screen
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans antialiased relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_60%)]"></div>
        <div className="relative z-10 flex flex-col items-center gap-6">
          <img src="/logo-sophia-color.png" alt="Logo" className="h-16 w-auto object-contain animate-pulse" />
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
            <span className="text-xs uppercase tracking-widest font-black text-neutral-400">Verificando Credenciales...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white flex selection:bg-emerald-500/30 font-sans antialiased transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-neutral-900/60 backdrop-blur-2xl border-r border-neutral-200 dark:border-neutral-800/80 text-neutral-800 dark:text-white flex flex-col fixed h-full shadow-2xl z-20 transition-all duration-200">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-200 dark:border-neutral-800/80">
          <div className="flex items-center justify-center">
            <img src="/logo-sophia-color.png" alt="Logo" className="h-10 w-auto object-contain" />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems
            .filter((item) => !item.adminOnly || user?.user_metadata?.role === 'admin')
            .map((item) => {
              const isActive = pathname === item.path || (item.path !== '/app' && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-300 font-semibold tracking-wide text-sm ${
                    isActive
                      ? "bg-emerald-500/10 text-emerald-650 dark:text-emerald-400 border border-emerald-500/20 shadow-inner font-bold"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white"
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-emerald-500' : ''}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* User Info in Sidebar */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-neutral-950/30 transition-colors duration-200">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-full flex items-center justify-center shadow-inner">
              <span className="text-xs text-neutral-600 dark:text-neutral-300 font-black tracking-wider">{userInitials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{userName}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-emerald-650 dark:text-emerald-500 truncate">Miembro Sophia</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="h-20 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800/80 px-8 flex items-center justify-end sticky top-0 z-10 shadow-sm transition-colors duration-200">
          <div className="flex items-center gap-6">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Theme"
              className="p-2.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all"
            >
              {theme === 'dark' ? (
                <RiSunLine className="w-5 h-5" />
              ) : (
                <RiMoonLine className="w-5 h-5" />
              )}
            </button>

            {/* Notifications */}
            <button className="p-2.5 text-neutral-400 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all relative">
              <RiNotification3Line className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 rounded-xl p-2 pl-3 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/50 text-neutral-800 dark:text-neutral-200"
              >
                <span className="text-sm font-bold tracking-wide text-neutral-700 dark:text-neutral-300">{userName}</span>
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-full flex items-center justify-center">
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 font-black">{userInitials}</span>
                </div>
                <RiArrowDownSLine className={`w-4 h-4 text-neutral-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 bg-white dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700/50 py-2 z-50 overflow-hidden animate-fadeIn">
                  {/* User Info */}
                  <div className="px-5 py-4 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950/40 transition-colors">
                    <p className="font-bold text-neutral-800 dark:text-white text-sm">{userName}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{userEmail}</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      href="/app/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-3 px-5 py-2.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <RiUserLine className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                      <span className="text-sm font-bold">Mi Perfil</span>
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-2 pb-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-5 py-2.5 text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full group"
                    >
                      <RiLogoutBoxRLine className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                      <span className="text-sm font-bold">Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content area */}
        <main className="flex-1 p-8 overflow-y-auto w-full relative">
          {children}
        </main>
      </div>
    </div>
  );
}
