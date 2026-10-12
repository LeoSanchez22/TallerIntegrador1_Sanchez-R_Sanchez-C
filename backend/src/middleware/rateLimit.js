/**
 * =============================================================================
 *  LIMITACIÓN DE TASA (RATE LIMITING)  (RNF-14 · ISO/IEC 27002 control 8.5)
 * =============================================================================
 * API Gateway (Hono) con control de frecuencia por cliente (IP) y por ventana
 * deslizante fija, para proteger el microservicio de IA y el consumo de la API
 * de Gemini contra abusos y ataques de denegación de servicio (DoS/DDoS).
 *
 * Escenarios:
 *   • gen_api : tráfico general autenticado de la plataforma.
 *   • auth    : intentos de autenticación / eventos de login (muy restrictivo).
 *   • model   : carga de checkpoints y entrenamiento del modelo.
 *
 * La IP se resuelve detrás de Nginx mediante X-Forwarded-For (ver audit.js).
 * El listado de claves se depura periódicamente para no crecer en memoria.
 * =============================================================================
 */

import { AUDIT_EVENTS, getClientIp, logSecurityEvent, throttleAudit } from '../security/audit.js'

const counters = new Map()

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of counters.entries()) {
    if (now > entry.resetAt) counters.delete(key)
  }
}, CLEANUP_INTERVAL_MS)

// No bloquea el cierre del proceso ni la ejecución de las pruebas unitarias.
if (typeof cleanupTimer.unref === 'function') cleanupTimer.unref()

function envNumber(name, fallback) {
  const parsed = Number(process.env[name])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function getRateLimitConfig() {
  return {
    api: {
      limit: envNumber('RATE_LIMIT_API_MAX', 300),
      windowMs: envNumber('RATE_LIMIT_API_WINDOW_MS', 60 * 1000)
    },
    auth: {
      limit: envNumber('RATE_LIMIT_AUTH_MAX', 10),
      windowMs: envNumber('RATE_LIMIT_AUTH_WINDOW_MS', 5 * 60 * 1000)
    },
    model: {
      limit: envNumber('RATE_LIMIT_MODEL_MAX', 20),
      windowMs: envNumber('RATE_LIMIT_MODEL_WINDOW_MS', 60 * 1000)
    }
  }
}

/**
 * @param {object} options
 * @param {'api'|'auth'|'model'|string} options.name  Nombre del bucket.
 * @param {number} [options.limit]                     Peticiones permitidas.
 * @param {number} [options.windowMs]                  Ventana en milisegundos.
 * @param {(c:any)=>string} [options.keyFn]           Clave personalizada.
 * @param {(c:any)=>boolean} [options.skip]           Predicado para eximir peticiones.
 */
export function rateLimit({ name = 'api', limit, windowMs, keyFn, skip } = {}) {
  const config = getRateLimitConfig()[name] || getRateLimitConfig().api
  const max = limit ?? config.limit
  const window = windowMs ?? config.windowMs

  return async function rateLimitMiddleware(c, next) {
    // Las pruebas unitarias disparan ráfagas sintéticas: se omite el control.
    if (process.env.NODE_ENV === 'test') return await next()
    if (typeof skip === 'function' && skip(c)) return await next()

    const ip = getClientIp(c)
    const key = `${name}:${keyFn ? keyFn(c) : ip}`
    const now = Date.now()

    let entry = counters.get(key)
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + window }
      counters.set(key, entry)
    }
    entry.count += 1

    const remaining = Math.max(0, max - entry.count)
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1000))

    c.header('X-RateLimit-Limit', String(max))
    c.header('X-RateLimit-Remaining', String(remaining))
    c.header('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)))

    if (entry.count > max) {
      c.header('Retry-After', String(retryAfterSeconds))

      // Solo se audita la primera excedencia por clave y ventana.
      if (throttleAudit(`rate:${key}`, 1, window)) {
        await logSecurityEvent({
          eventType: AUDIT_EVENTS.RATE_LIMIT_EXCEEDED,
          severity: 'warning',
          ip,
          userAgent: c.req.header('user-agent'),
          method: c.req.method,
          resource: c.req.path,
          statusCode: 429,
          details: { bucket: name, limite: max, ventana_ms: window }
        })
      }

      return c.json({
        error: 'Límite de peticiones excedido',
        details: `Demasiadas solicitudes al recurso. Intenta nuevamente en ${retryAfterSeconds} segundos.`
      }, 429)
    }

    return await next()
  }
}

/** Solo para pruebas unitarias. */
export function __resetRateLimitCounters() {
  counters.clear()
}
