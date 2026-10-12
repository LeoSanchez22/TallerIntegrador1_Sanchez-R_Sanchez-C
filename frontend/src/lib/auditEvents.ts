import { API_URL } from '../config'

/**
 * =============================================================================
 *  REGISTRO DE EVENTOS DE AUTENTICACIÓN  (RF-16 · ISO/IEC 27002 control 8.15)
 * =============================================================================
 * El frontend notifica al backend cada evento de acceso para que quede en el
 * log de auditoría de seguridad con la dirección IP del cliente y la marca de
 * tiempo del servidor:
 *
 *   • login_failed             → intento de inicio de sesión fallido
 *   • login_success            → inicio de sesión exitoso
 *   • logout                   → cierre de sesión manual
 *   • session_idle_timeout     → cierre automático por inactividad (RF-17)
 *   • password_recovery_requested → solicitud de recuperación de clave
 *
 * La llamada es "best effort": nunca debe romper el flujo de autenticación.
 * =============================================================================
 */

export type AuthEventType =
  | 'login_success'
  | 'login_failed'
  | 'logout'
  | 'session_idle_timeout'
  | 'session_revoked'
  | 'password_recovery_requested'

export interface AuthEventPayload {
  event: AuthEventType
  email?: string | null
  reason?: string | null
}

export async function reportAuthEvent(payload: AuthEventPayload): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch(`${API_URL}/api/security/auth-event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: payload.event,
        email: payload.email || null,
        reason: payload.reason || null
      }),
      keepalive: true
    })
  } catch {
    // El registro de auditoría no puede bloquear la autenticación del usuario.
  }
}
