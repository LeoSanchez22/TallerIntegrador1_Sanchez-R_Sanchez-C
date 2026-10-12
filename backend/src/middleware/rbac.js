/**
 * =============================================================================
 *  CONTROL DE ACCESO BASADO EN ROLES (RBAC)  (RF-11 · ISO/IEC 27002 control 5.15)
 * =============================================================================
 * Perfiles diferenciados:
 *
 *   • Administrador ("admin")
 *       - Alta de productos y lanzamientos.
 *       - Alta / edición / inhabilitación de usuarios.
 *       - Auditoría de seguridad y trazabilidad de simulaciones.
 *       - Mantenimiento del modelo (entrenamiento / reentrenamiento).
 *       - Lectura y escritura de la totalidad de las zonas comerciales.
 *
 *   • Representante Comercial ("representante" u otro rol no admin)
 *       - SOLO CONSULTA: verbos GET / HEAD / OPTIONS.
 *       - Alcance limitado a su zona comercial asignada (RNF-12).
 *
 * Cualquier denegación genera un evento de auditoría con IP y sello temporal.
 * =============================================================================
 */

import { AUDIT_EVENTS, getClientIp, getUserAgent, logSecurityEvent } from '../security/audit.js'

/** Rutas reservadas a la administración (lectura incluida). */
const ADMIN_READ_PREFIXES = [
  '/api/users',   // salvo /api/users/me
  '/api/audit',   // visor de auditoría y trazabilidad
  '/model'        // salvo /model/upload (autenticado con token de despliegue)
]

/** Excepciones de las reglas anteriores. */
const ADMIN_READ_EXCEPTIONS = new Set([
  '/api/users/me',
  '/model/upload'
])

/** Rutas de escritura permitidas a cualquier usuario autenticado. */
const WRITE_EXEMPT_PATHS = new Set([
  '/api/consent',        // consentimiento informado (Ley N° 29733)
  '/api/security/auth-event' // registro de intentos de autenticación
])

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

export function isAdminRole(role) {
  return role === 'admin'
}

function isDeniedRead(path) {
  if (ADMIN_READ_EXCEPTIONS.has(path)) return false
  return ADMIN_READ_PREFIXES.some(prefix => path === prefix || path.startsWith(`${prefix}/`))
}

export async function rbacMiddleware(c, next) {
  // Las rutas públicas ya fueron validadas por el authMiddleware (lista blanca estricta).
  const payload = c.get('jwtPayload')
  if (!payload) return await next()

  const ctx = c.get('authz') || {}
  const role = ctx.role || 'representante'
  const isAdmin = isAdminRole(role)
  const path = c.req.path
  const method = (c.req.method || 'GET').toUpperCase()
  const isSafeMethod = SAFE_METHODS.has(method)

  const deniedBecauseWrite = !isSafeMethod && !isAdmin && !WRITE_EXEMPT_PATHS.has(path)
  const deniedBecauseAdminRead = isSafeMethod && !isAdmin && isDeniedRead(path)

  if (deniedBecauseWrite || deniedBecauseAdminRead) {
    await logSecurityEvent({
      eventType: AUDIT_EVENTS.UNAUTHORIZED_ACCESS,
      severity: 'warning',
      userId: ctx.userId || payload.sub,
      userEmail: ctx.email || payload.email,
      userRole: role,
      ip: getClientIp(c),
      userAgent: getUserAgent(c),
      method,
      resource: path,
      statusCode: 403,
      details: {
        motivo: deniedBecauseWrite ? 'escritura_restringida_a_administrador' : 'recurso_restringido_a_administrador',
        rol_solicitante: role
      }
    })

    return c.json({
      error: 'Acceso denegado',
      details: 'Se requieren privilegios de Administrador para acceder a este recurso.'
    }, 403)
  }

  return await next()
}
