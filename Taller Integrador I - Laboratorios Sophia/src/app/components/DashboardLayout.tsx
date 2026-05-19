import { Outlet, Link, useLocation, useNavigate } from "react-router";
import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Target,
  TrendingUp,
  BarChart3,
  Database,
  User,
  LogOut,
  Search,
  Activity,
  Bell,
  ChevronDown,
  Settings,
} from "lucide-react";
import logo from "../../imports/ChatGPT_Image_26_abr_2026,_13_26_09.png";

export function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { path: "/app", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/app/recommendations", icon: Target, label: "Recommendations" },
    { path: "/app/forecasting", icon: TrendingUp, label: "Forecasting" },
    { path: "/app/statistics", icon: BarChart3, label: "Statistics" },
    { path: "/app/pipeline", icon: Database, label: "Data Pipeline" },
    { path: "/app/profile", icon: User, label: "My Profile" },
  ];

  const handleLogout = () => {
    setShowUserDropdown(false);
    navigate("/");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1A365D] text-white flex flex-col fixed h-full">
        {/* Logo */}
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Sophia AI" className="w-10 h-10" />
            <span className="text-xl font-bold">Sophia AI</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#00B4D8] text-white"
                    : "text-white/70 hover:bg-[#2D4A73] hover:text-white"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info in Sidebar */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 px-4 py-3 text-white/70">
            <div className="w-8 h-8 bg-[#00B4D8] rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-semibold">SM</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">Sarah Mitchell</p>
              <p className="text-xs text-white/50 truncate">Sales Manager</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-[#E2E8F0] px-6 flex items-center justify-between sticky top-0 z-10">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search products, clients..."
                className="w-full pl-10 pr-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00B4D8] text-[#1A365D]"
              />
            </div>
          </div>

          {/* System Status & User */}
          <div className="flex items-center gap-4">
            {/* Model Health */}
            <div className="flex items-center gap-2 px-3 py-2 bg-[#00B4D8]/10 rounded-lg">
              <Activity className="w-4 h-4 text-[#00B4D8]" />
              <span className="text-sm text-[#1A365D]">Model Health: 72%</span>
            </div>

            {/* Notifications */}
            <button className="p-2 hover:bg-[#F8FAFC] rounded-lg transition-colors relative">
              <Bell className="w-5 h-5 text-[#64748B]" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#00B4D8] rounded-full"></span>
            </button>

            {/* User Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 hover:bg-[#F8FAFC] rounded-lg p-2 transition-colors"
              >
                <div className="w-8 h-8 bg-[#00B4D8] rounded-full flex items-center justify-center">
                  <span className="text-sm text-white font-semibold">SM</span>
                </div>
                <span className="text-sm text-[#1A365D] font-medium">Sarah Mitchell</span>
                <ChevronDown className={`w-4 h-4 text-[#64748B] transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-[#E2E8F0] py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-[#E2E8F0]">
                    <p className="font-semibold text-[#1A365D]">Sarah Mitchell</p>
                    <p className="text-sm text-[#64748B]">sarah.mitchell@ophthalmic-solutions.com</p>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    <Link
                      to="/app/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2 text-[#1A365D] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">Mi Perfil</span>
                    </Link>
                    <Link
                      to="/app/profile"
                      onClick={() => setShowUserDropdown(false)}
                      className="flex items-center gap-3 px-4 py-2 text-[#1A365D] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Configuración</span>
                    </Link>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-[#E2E8F0] pt-2">
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors w-full"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm font-medium">Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          <Outlet />
        </main>
      </div>

    </div>
  );
}
