'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from './supabase'

/**
 * =============================================================================
 *  PERFIL DE ACCESO DEL USUARIO  (RF-11 · ISO/IEC 27002 control 5.15)
 * =============================================================================
 * Devuelve el rol comercial de la sesión activa para condicionar la interfaz:
 *
 *   • Administrador      → alta de productos, gestión de usuarios, auditoría
 *                          y mantenimiento del modelo.
 *   • Representante      → solo consulta (los módulos de escritura no se pintan
 *                          y el backend los rechaza con HTTP 403).
 *
 * IMPORTANTE: este hook es únicamente una capa de experiencia de usuario. El
 * control efectivo lo ejerce el backend mediante el middleware RBAC
 * (backend/src/middleware/rbac.js), que valida el rol real almacenado en
 * Supabase Auth en cada petición.
 * =============================================================================
 */

export interface AccessProfile {
  role: string
  zone: string
  isAdmin: boolean
  loading: boolean
  refresh: () => Promise<void>
}

export function useRole(): AccessProfile {
  const [role, setRole] = useState<string>('representante')
  const [zone, setZone] = useState<string>('')
  const [loading, setLoading] = useState(true)

  const syncFromSession = useCallback(async (session: any) => {
    const metadata = session?.user?.user_metadata || {}
    setRole(metadata.role === 'admin' ? 'admin' : 'representante')
    setZone((metadata.zona_comercial || metadata.zone || '').toString().toUpperCase())
    setLoading(false)
  }, [])

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await syncFromSession(session)
  }, [syncFromSession])

  useEffect(() => {
    let mounted = true

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) void syncFromSession(session)
    })

    void refresh()

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [refresh, syncFromSession])

  return {
    role,
    zone,
    isAdmin: role === 'admin',
    loading,
    refresh
  }
}
