'use client'

import React, { useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Menu,
  Sun,
  Moon,
  ChevronDown,
  User,
  LogOut,
  Sparkles
} from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { supabase } from '../lib/supabase'
import { clearSessionMarker } from '../lib/sessionMarkers'
import { reportAuthEvent } from '../lib/auditEvents'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  onToggleSidebar: () => void
  user: any
  isSidebarCollapsed: boolean
}

export default function Navbar({ onToggleSidebar, user, isSidebarCollapsed }: NavbarProps) {
  const { theme, toggleTheme } = useTheme()
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    setShowUserDropdown(false)
    // RF-16 · Deja constancia del cierre de sesión manual en el log de auditoría.
    void reportAuthEvent({ event: 'logout', email: user?.email || null })
    // RNF-04 · Elimina el marcador que vigila el middleware de Next.js.
    clearSessionMarker()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Representante Sophia'
  const userEmail = user?.email || 'usuario@sophiasciences.com'
  const userInitials = userName.substring(0, 2).toUpperCase()

  return (
    <header className="h-16 sm:h-20 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-xl border-b border-slate-200 dark:border-neutral-800 px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors">
      {/* Left Area */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile / Collapse Toggle Button */}
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Abrir o colapsar navegación"
          className="p-2.5 text-neutral-700 dark:text-neutral-200 hover:text-sophia-blue dark:hover:text-sophia-blue-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-all border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-95"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand Name on Mobile & Status Badge */}
        <div className="flex items-center gap-2">
          <Link href="/app" className="flex items-center gap-2 lg:hidden">
            <div className="p-1 rounded-lg bg-white dark:bg-white/10 dark:p-1.5 shadow-sm border border-slate-200/50 dark:border-white/10">
              <img
                src="/logo-sophia-color.png"
                alt="Logo Sophia"
                className="h-7 w-auto object-contain dark:brightness-110"
              />
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-sophia-blue/10 dark:bg-sophia-blue/20 border border-sophia-blue/20">
            <Sparkles className="w-3.5 h-3.5 text-sophia-blue dark:text-sophia-blue-300" />
            <span className="text-[11px] font-black tracking-widest uppercase text-sophia-blue dark:text-sophia-blue-300">
              Sophia Inteligencia Comercial
            </span>
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Switch de Tema Institucional */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          className="p-2.5 text-neutral-600 dark:text-neutral-300 hover:text-sophia-blue dark:hover:text-sophia-blue-300 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-all min-h-[44px] min-w-[44px] flex items-center justify-center border border-slate-200 dark:border-neutral-800"
          title={theme === 'dark' ? 'Activar Tema Claro' : 'Activar Tema Oscuro'}
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5 text-amber-400" />
          ) : (
            <Moon className="w-5 h-5 text-sophia-blue" />
          )}
        </button>

        {/* Menú de Usuario con Alto Contraste */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 sm:gap-3 hover:bg-slate-100 dark:hover:bg-neutral-800/80 rounded-xl p-1.5 sm:pl-3 transition-all border border-slate-200 dark:border-neutral-800 min-h-[44px]"
          >
            <span className="hidden md:inline-block text-xs sm:text-sm font-bold text-neutral-800 dark:text-neutral-200 truncate max-w-[140px]">
              {userName}
            </span>
            <div className="w-8 h-8 bg-sophia-blue text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-md border border-sophia-blue-400">
              <span className="text-xs font-black">{userInitials}</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-neutral-500 transition-transform duration-200 ${
                showUserDropdown ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* User Dropdown */}
          {showUserDropdown && (
            <div className="absolute right-0 top-[calc(100%+0.5rem)] w-64 bg-white dark:bg-neutral-900 backdrop-blur-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-neutral-800 py-2 z-50 overflow-hidden animate-fadeIn">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-950/60">
                <p className="font-bold text-neutral-900 dark:text-white text-sm truncate">{userName}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 truncate">{userEmail}</p>
              </div>

              <div className="py-1.5">
                <Link
                  href="/app/profile"
                  onClick={() => setShowUserDropdown(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-neutral-700 dark:text-neutral-300 hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors text-sm font-semibold"
                >
                  <User className="w-4 h-4 text-sophia-blue dark:text-sophia-blue-300" />
                  <span>Mi Perfil</span>
                </Link>
              </div>

              <div className="border-t border-slate-100 dark:border-neutral-800 pt-1.5 pb-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-2.5 text-red-500 hover:bg-red-500/10 transition-colors w-full group text-sm font-semibold"
                >
                  <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
