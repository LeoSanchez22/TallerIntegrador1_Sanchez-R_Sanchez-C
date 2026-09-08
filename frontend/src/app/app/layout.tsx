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
  RiSunLine,
  RiMoonLine,
  RiLineChartLine,
  RiTerminalBoxLine,
  RiMenuLine,
  RiCloseLine,
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
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
    // Close mobile drawer on route change
    setIsMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    // 1. Sync theme with document class on mount
    const isLight = document.documentElement.classList.contains('light');
    setTheme(isLight ? 'light' : 'dark');

    // 2. Sync sidebar state with localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebarCollapsed');
      if (stored === 'true') {
        setIsSidebarCollapsed(true);
      }
    }

    // 3. Check current active session and sync real-time role
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
                console.log(`[AUTH SYNC] Datos locales difieren de base de datos. Sincronizando...`);
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

    // 4. Listen for dynamic authentication state changes
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

    // 5. Polling de sincronización de datos en tiempo real
    const roleSyncInterval = setInterval(async () => {
      if (!mounted) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        const profileRes = await fetchWithAuth('/api/users/me');
        if (profileRes.status === 401) {
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
              const { data: { session: refreshedSession } } = await supabase.auth.refreshSession();
              if (refreshedSession && mounted) {
                setUser(refreshedSession.user);
              }
            }
          }
        }
      } catch (err) {
      }
    }, 300000); 

    // 6. Click outside listener for dropdown
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

  const toggleSidebar = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsMobileOpen(!isMobileOpen);
    } else {
      const newVal = !isSidebarCollapsed;
      setIsSidebarCollapsed(newVal);
      localStorage.setItem('sidebarCollapsed', String(newVal));
    }
  };

  const handleLogout = async () => {
    setShowUserDropdown(false);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const userEmail = user?.email || "usuario@sophia.com";
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Usuario";
  const userInitials = userName.substring(0, 2).toUpperCase();

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-sans antialiased relative overflow-hidden px-4">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_60%)]"></div>
        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          <img src="/logo-sophia-color.png" alt="Logo" className="h-14 sm:h-16 w-auto object-contain animate-pulse" />
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
              <span className="hidden lg:block text-xl font-black text-emerald-500 tracking-wider">S.</span>
            ) : null}
            <img
              src="/logo-sophia-color.png"
              alt="Logo Sophia"
              className={`h-8 sm:h-10 w-auto object-contain ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}
            />
          </Link>

          {/* Close mobile button */}
          <button
            onClick={() => setIsMobileOpen(false)}
            className="p-2 text-neutral-400 hover:text-white lg:hidden rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar menú"
          >
            <RiCloseLine className="w-6 h-6" />
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
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-inner font-bold"
                      : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800/50 hover:text-neutral-900 dark:hover:text-white"
                  } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-500' : ''}`} />
                  <span className={`${isSidebarCollapsed ? 'lg:hidden' : 'block'} truncate`}>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 sm:p-4 border-t border-neutral-200 dark:border-neutral-800/80 bg-neutral-100/50 dark:bg-neutral-950/30">
          <div className="flex items-center gap-3 px-1 py-1">
            <div className="w-9 h-9 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-full flex items-center justify-center shadow-inner flex-shrink-0">
              <span className="text-xs text-neutral-600 dark:text-neutral-300 font-black">{userInitials}</span>
            </div>
            <div className={`flex-1 min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : 'block'}`}>
              <p className="text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate">{userName}</p>
              <p className="text-[10px] uppercase tracking-widest font-black text-emerald-600 dark:text-emerald-500 truncate">Miembro Sophia</p>
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
        {/* Top Header */}
        <header className="h-16 sm:h-20 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl border-b border-neutral-200 dark:border-neutral-800/80 px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
          {/* Left Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleSidebar}
              aria-label="Toggle Navigation"
              className="p-2 sm:p-2.5 text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all flex items-center justify-center border border-neutral-200/60 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 shadow-sm min-h-[44px] min-w-[44px] active:scale-95"
            >
              <RiMenuLine className="w-5 h-5 lg:hidden" />
              <svg className="w-5 h-5 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isSidebarCollapsed ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h10M4 18h16" />
                )}
              </svg>
            </button>

            <div className="flex items-center gap-2 lg:hidden">
              <span className="text-sm font-black text-emerald-500 tracking-wider">SOPHIA</span>
            </div>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Cambiar Tema"
              className="p-2 sm:p-2.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {theme === 'dark' ? <RiSunLine className="w-5 h-5" /> : <RiMoonLine className="w-5 h-5" />}
            </button>

            {/* Notifications */}
            <button
              aria-label="Notificaciones"
              className="p-2 sm:p-2.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all relative min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <RiNotification3Line className="w-5 h-5" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_5px_rgba(16,185,129,0.8)]"></span>
            </button>

            {/* User Profile Menu */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 sm:gap-3 hover:bg-neutral-100 dark:hover:bg-neutral-800/60 rounded-xl p-1.5 sm:pl-3 transition-all border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/50 min-h-[44px]"
              >
                <span className="hidden md:inline-block text-xs sm:text-sm font-bold text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">{userName}</span>
                <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-neutral-600 dark:text-neutral-300 font-black">{userInitials}</span>
                </div>
                <RiArrowDownSLine className={`w-4 h-4 text-neutral-500 transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 bg-white dark:bg-neutral-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-neutral-200 dark:border-neutral-700/50 py-2 z-50 overflow-hidden animate-fadeIn">
                  <div className="px-4 py-3 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950/40">
                    <p className="font-bold text-neutral-800 dark:text-white text-sm truncate">{userName}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{userEmail}</p>
                  </div>

                  <div className="py-1.5">
                    <Link
                      href="/app/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white transition-colors"
                    >
                      <RiUserLine className="w-4 h-4 text-neutral-500" />
                      <span className="text-sm font-bold">Mi Perfil</span>
                    </Link>
                  </div>

                  <div className="border-t border-neutral-100 dark:border-neutral-800/80 pt-1.5 pb-1">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-500/10 hover:text-red-400 transition-colors w-full group"
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

        {/* Content Area */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 w-full max-w-7xl mx-auto relative overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

