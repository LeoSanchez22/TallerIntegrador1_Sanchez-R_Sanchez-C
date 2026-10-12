'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { clearSessionMarker, touchSessionMarker } from '../lib/sessionMarkers'
import { reportAuthEvent } from '../lib/auditEvents'

/**
 * =============================================================================
 *  CIERRE DE SESIÓN AUTOMÁTICO POR INACTIVIDAD  (RF-17 · ISO/IEC 27002 5.17)
 * =============================================================================
 * Invalida la sesión de Supabase Auth tras un periodo de inactividad
 * configurable y obliga al usuario a reautenticarse.
 *
 *   • NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES → umbral total (defecto: 30).
 *   • NEXT_PUBLIC_SESSION_IDLE_WARNING_MINUTES → aviso previo (defecto: 2).
 *
 * Secuencia:
 *   1. Sin actividad durante el umbral de aviso → se muestra un modal de
 *      advertencia con cuenta regresiva.
 *   2. Al vencer el umbral total → se cierra la sesión (signOut), se reporta el
 *      evento `session_idle_timeout` al log de auditoría (RF-16) y se redirige
 *      al portal de inicio de sesión.
 *
 * El backend refuerza esta política con el middleware idleSessionGuard, que
 * rechaza con HTTP 401 cualquier petición realizada tras el umbral.
 * =============================================================================
 */

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'mousemove'
]

function envMinutes(name: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw > 0 ? raw : fallback
}

export function useSessionTimeout(options: { enabled?: boolean } = {}) {
  const router = useRouter()
  const { enabled = true } = options

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const expiryAtRef = useRef<number | null>(null)
  const tickingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastActivityRef = useRef<number>(Date.now())
  const expiredRef = useRef(false)

  const totalMinutes = envMinutes('NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES', 30)
  const warningMinutes = Math.min(
    envMinutes('NEXT_PUBLIC_SESSION_IDLE_WARNING_MINUTES', 2),
    Math.max(1, totalMinutes - 1)
  )

  const expireSession = useCallback(async () => {
    if (expiredRef.current) return
    expiredRef.current = true

    const { data: { user } } = await supabase.auth.getUser()

    await reportAuthEvent({
      event: 'session_idle_timeout',
      email: user?.email || null,
      reason: 'sesion_inactividad'
    })

    clearSessionMarker()
    await supabase.auth.signOut()
    router.push('/login?reason=idle_timeout')
  }, [router])

  const resetTimer = useCallback(() => {
    if (!enabled || expiredRef.current) return
    const timeoutMs = totalMinutes * 60 * 1000
    expiryAtRef.current = Date.now() + timeoutMs
    lastActivityRef.current = Date.now()
    setSecondsLeft(null)
    touchSessionMarker()
  }, [enabled, totalMinutes])

  useEffect(() => {
    if (!enabled) return

    resetTimer()

    const handleActivity = () => {
      if (expiredRef.current) return
      // Solo se reinicia el temporizador si queda margen antes del aviso:
      // así el modal de advertencia no se descarta con un clic accidental.
      const remaining = (expiryAtRef.current || 0) - Date.now()
      if (remaining > warningMinutes * 60 * 1000) {
        resetTimer()
      }
      lastActivityRef.current = Date.now()
    }

    ACTIVITY_EVENTS.forEach(eventName => {
      window.addEventListener(eventName, handleActivity, { passive: true })
    })

    tickingRef.current = setInterval(() => {
      if (!expiryAtRef.current || expiredRef.current) return
      const remainingMs = expiryAtRef.current - Date.now()

      if (remainingMs <= 0) {
        void expireSession()
        return
      }

      if (remainingMs <= warningMinutes * 60 * 1000) {
        setSecondsLeft(Math.ceil(remainingMs / 1000))
        // Mientras el usuario interactúa con el modal, la sesión se mantiene viva.
        if (Date.now() - lastActivityRef.current < 15 * 1000) {
          expiryAtRef.current = Date.now() + totalMinutes * 60 * 1000
          setSecondsLeft(null)
        }
      } else if (secondsLeft !== null) {
        setSecondsLeft(null)
      }
    }, 1000)

    return () => {
      ACTIVITY_EVENTS.forEach(eventName => {
        window.removeEventListener(eventName, handleActivity)
      })
      if (tickingRef.current) clearInterval(tickingRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, resetTimer, expireSession, totalMinutes, warningMinutes])

  const extendSession = useCallback(() => {
    expiredRef.current = false
    resetTimer()
  }, [resetTimer])

  return {
    /** Segundos restantes antes del cierre automático (null = sin advertencia). */
    secondsLeft,
    /** Minutos totales de inactividad permitidos. */
    totalMinutes,
    /** Minutos restantes que activan el modal de advertencia. */
    warningMinutes,
    /** Extiende la sesión activa desde el modal de advertencia. */
    extendSession
  }
}
