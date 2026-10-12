/**
 * =============================================================================
 *  MARCADOR DE SESIÓN PARA EL MIDDLEWARE (RNF-04)
 * =============================================================================
 * Supabase Auth mantiene el JWT del usuario en almacenamiento local del
 * navegador; el middleware de Next.js no puede leerlo (se ejecuta en el
 * servidor). Este marcador (no contiene ningún token ni credencial)
 * permite que el middleware bloquee el acceso directo a /app/* cuando el
 * usuario no tiene una sesión activa, y su vida útil coincide con el periodo
 * de inactividad permitido (RF-17).
 *
 * La validación criptográfica real del token siempre ocurre en el backend Hono
 * (JWKS de Supabase) y en el layout del dashboard.
 * =============================================================================
 */

export const SESSION_COOKIE = 'sophia_session'

function idleTimeoutSeconds(): number {
  const minutes = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES)
  if (Number.isFinite(minutes) && minutes > 0) return Math.round(minutes * 60)
  return 30 * 60 // 30 minutos por defecto
}

function secureSuffix(): string {
  return typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : ''
}

/** Crea o renueva el marcador de sesión (vida útil = tiempo de inactividad). */
export function touchSessionMarker(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${idleTimeoutSeconds()}; SameSite=Lax${secureSuffix()}`
}

/** Elimina el marcador (cierre de sesión manual o automático). */
export function clearSessionMarker(): void {
  if (typeof document === 'undefined') return
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0; SameSite=Lax${secureSuffix()}`
}
