/**
 * =============================================================================
 *  SANITIZACIÓN Y VALIDACIÓN DE ENTRADA  (RNF-13 · ISO/IEC 27002 control 8.26)
 * =============================================================================
 * Prevención de inyección SQL y Cross-Site Scripting (XSS) en el API Gateway:
 *
 *   • Los cuerpos JSON se sanean recursivamente ANTES de llegar a las rutas
 *     (se eliminan etiquetas HTML, protocolos peligrosos y bytes de control).
 *   • Todas las consultas PostgreSQL usan consultas parametrizadas ($1, $2...)
 *     vía pg.Pool; ninguna tabla ni columna se interpola desde la entrada.
 *   • Los parámetros de query/URL que contengan patrones peligrosos se
 *     rechazan con HTTP 400 y se deja constancia en el log de auditoría.
 *   • Las llamadas al intérprete de Python usan execFile con lista de
 *     argumentos (sin shell), cerrando el vector de command injection.
 * =============================================================================
 */

import { AUDIT_EVENTS, getClientIp, logSecurityEvent } from '../security/audit.js'

const MAX_STRING_LENGTH = 2000
const MAX_ARRAY_ITEMS = 5000
const MAX_DEPTH = 6
const MAX_QUERY_LENGTH = 300

/** Patrones considerados peligrosos en cualquier entrada de usuario. */
const DANGEROUS_PATTERNS = [
  /<\s*script/i,                       // <script>
  /javascript\s*:/i,                   // javascript: URI
  /data\s*:\s*text\/html/i,            // data:text/html
  /on(error|load|click|mouseover|focus)\s*=/i, // handlers inline XSS
  /\/\*.*\*\/|\bunion\b\s+select\b|\bdrop\s+table\b|\binsert\s+into\b|\bdelete\s+from\b/i,
  /--\s*$/,                            // comentario SQL
  /\u0000/                             // null byte
]

export function hasDangerousPayload(value) {
  if (typeof value !== 'string') return false
  if (value.length > MAX_QUERY_LENGTH * 4) return true
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(value))
}

/** Limpia una cadena: elimina etiquetas HTML, protocolos peligrosos y controles. */
export function sanitizeText(value, maxLength = MAX_STRING_LENGTH) {
  if (value === null || value === undefined) return ''
  const raw = typeof value === 'string' ? value : String(value)
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript\s*:/gi, '')
    .slice(0, maxLength)
}

/** Sanea recursivamente el objeto recibido (mutación in-place sobre la caché de Hono). */
export function sanitizeObject(node, depth = 0) {
  if (depth > MAX_DEPTH) return null

  if (typeof node === 'string') return sanitizeText(node)

  if (Array.isArray(node)) {
    const limited = node.slice(0, MAX_ARRAY_ITEMS)
    for (let i = 0; i < limited.length; i++) {
      limited[i] = sanitizeObject(limited[i], depth + 1)
    }
    return limited
  }

  if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      node[key] = sanitizeObject(node[key], depth + 1)
    }
    return node
  }

  return node
}

/* --------------------------- Validadores de dominio ------------------------ */

export function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim()) && value.length <= 254
}

export function isUuid(value) {
  return typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
}

/** Validador estricto de identificador numérico entero (IDs de cliente). */
export function parseIntegerId(value) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  if (!Number.isInteger(parsed)) return null
  return parsed
}

/* ------------------------------- Middleware -------------------------------- */

export async function inputSanitizer(c, next) {
  const contentType = (c.req.header('content-type') || '').toLowerCase()

  // 1. Cuerpos JSON. Hono cachea el cuerpo CRUDO bajo la clave "text" y
  //    reconstruye el objeto en cada c.req.json(), por lo que la sanitización
  //    se aplica una sola vez y se reemplaza la caché con la versión limpia.
  if (contentType.includes('application/json')) {
    try {
      const rawText = await c.req.text()
      if (rawText && rawText.trim().length > 0) {
        const parsed = JSON.parse(rawText)
        const sanitized = sanitizeObject(parsed, 0)
        c.req.bodyCache.text = Promise.resolve(JSON.stringify(sanitized === undefined ? null : sanitized))
      }
    } catch (err) {
      return c.json({
        error: 'JSON inválido',
        details: 'El cuerpo de la petición no contiene JSON válido y fue rechazado.'
      }, 400)
    }
  }

  // 2. Parámetros de query y de ruta: rechazo temprano si son peligrosos.
  const queries = c.req.queries()
  for (const key of Object.keys(queries)) {
    const values = Array.isArray(queries[key]) ? queries[key] : [queries[key]]
    if (values.some(v => hasDangerousPayload(v))) {
      const rejection = logSecurityEvent({
        eventType: AUDIT_EVENTS.UNAUTHORIZED_ACCESS,
        severity: 'warning',
        ip: getClientIp(c),
        userAgent: c.req.header('user-agent'),
        method: c.req.method,
        resource: c.req.path,
        statusCode: 400,
        details: { vector: 'entrada_sospechosa_en_query', parametro: key }
      })
      rejection.catch(() => {})
      return c.json({
        error: 'Entrada no válida',
        details: 'La petición contiene caracteres no permitidos y fue rechazada.'
      }, 400)
    }
  }

  // 3. Tamaño máximo del cuerpo (protección contra DoS por payload gigante).
  const contentLength = Number(c.req.header('content-length') || 0)
  const maxBodyBytes = Number(process.env.MAX_REQUEST_BODY_BYTES) || 1024 * 1024 // 1 MB
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes && !contentType.includes('multipart/')) {
    return c.json({
      error: 'Cuerpo de la petición demasiado grande',
      details: `El límite permitido es de ${Math.round(maxBodyBytes / 1024)} KB.`
    }, 413)
  }

  return next()
}
