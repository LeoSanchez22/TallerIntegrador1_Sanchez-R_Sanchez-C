/**
 * =============================================================================
 *  CIERRE DE SESIÓN AUTOMÁTICO POR INACTIVIDAD  (RF-17 · ISO/IEC 27002 5.17)
 * =============================================================================
 * Invalidación automática de la sesión (tokens de Supabase Auth) tras un
 * periodo de inactividad configurable, obligando al usuario a reautenticarse.
 *
 * • Backend: este guard rechaza con HTTP 401 cualquier petición cuyo usuario
 *   supere el umbral de inactividad, aunque su access_token aún no haya vencido.
 *   El frontend detecta ese 401, cierra la sesión (signOut) y redirige al login.
 * • Frontend: hook useSessionTimeout() muestra una alerta previa y cierra la
 *   sesión antes de que el backend comience a rechazar peticiones.
 *
 * Configuración (variable de entorno):
 *   SESSION_IDLE_TIMEOUT_MINUTES  →  por defecto 30 minutos.
 *   SESSION_IDLE_WARNING_MINUTES  →  minuto de aviso previo (solo frontend).
 * =============================================================================
 */

import { AUDIT_EVENTS, getClientIp, getUserAgent, logSecurityEvent, throttleAudit } from '../security/audit.js'

const DEFAULT_TIMEOUT_MINUTES = 30

/** sub (UUID de usuario) -> último timestamp de actividad (epoch ms). */
const lastActivityByUser = new Map()
const warnedUsers = new Set()

const CLEANUP_INTERVAL_MS = 10 * 60 * 1000
const MAX_TRACKING_MS = 24 * 60 * 60 * 1000

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [sub, last] of lastActivityByUser.entries()) {
    if (now - last > MAX_TRACKING_MS) lastActivityByUser.delete(sub)
  }
}, CLEANUP_INTERVAL_MS)

if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref()

export function getSessionIdleTimeoutMinutes() {
  const parsed = Number(process.env.SESSION_IDLE_TIMEOUT_MINUTES)
  if (Number.isFinite(parsed) && parsed > 0) return parsed
  return DEFAULT_TIMEOUT_MINUTES
}

export function getSessionIdleTimeoutMs() {
  return getSessionIdleTimeoutMinutes() * 60 * 1000
}

export async function idleSessionGuard(c, next) {
  const payload = c.get('jwtPayload')
  const sub = payload?.sub
  if (!sub) return await next()

  const now = Date.now()
  const timeoutMs = getSessionIdleTimeoutMs()
  const lastActivity = lastActivityByUser.get(sub)

  if (lastActivity && now - lastActivity > timeoutMs) {
    // Se libera el seguimiento para que la reautenticación inicie una sesión nueva.
    lastActivityByUser.delete(sub)
    warnedUsers.delete(sub)

    if (throttleAudit(`idle:${sub}`, 3, 60 * 1000)) {
      await logSecurityEvent({
        eventType: AUDIT_EVENTS.SESSION_IDLE_TIMEOUT,
        severity: 'info',
        userId: sub,
        userEmail: payload.email,
        userRole: c.get('authz')?.role,
        ip: getClientIp(c),
        userAgent: getUserAgent(c),
        method: c.req.method,
        resource: c.req.path,
        statusCode: 401,
        details: {
          minutos_inactividad: Math.round((now - lastActivity) / 60000),
          umbral_minutos: getSessionIdleTimeoutMinutes()
        }
      })
    }

    return c.json({
      error: 'Sesión expirada por inactividad',
      details: `Tu sesión se cerró automáticamente tras ${getSessionIdleTimeoutMinutes()} minutos sin actividad. Vuelve a iniciar sesión.`
    }, 401)
  }

  lastActivityByUser.set(sub, now)
  return await next()
}

/** Invalida el seguimiento de un usuario (cierre de sesión manual o automático). */
export function invalidateUserSession(sub) {
  if (!sub) return
  lastActivityByUser.delete(sub)
  warnedUsers.delete(sub)
}

/** Solo para pruebas unitarias. */
export function __resetIdleSessionTracking() {
  lastActivityByUser.clear()
  warnedUsers.clear()
}
