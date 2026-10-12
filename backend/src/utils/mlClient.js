/**
 * =============================================================================
 *  CLIENTE HTTP DEL MICROSERVICIO DE IA (FastAPI) — API Gateway Hono
 * =============================================================================
 * Centraliza las llamadas al microservicio Python (127.0.0.1:8000/8001) e
 * inyecta de forma automática:
 *
 *   • X-Service-Key → autenticación servicio-a-servicio (RF-11). FastAPI rechaza
 *     cualquier petición sin la clave compartida definida en ML_SERVICE_KEY.
 *   • X-User-Id / X-User-Email / X-User-Role → contexto del usuario autenticado,
 *     que FastAPI usa para aplicar RBAC (RF-11) y dejar constancia en el log de
 *     auditoría (RF-16) y en la trazabilidad de simulaciones (RF-14).
 * =============================================================================
 */

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

/** Construye las cabeceras comunes para el microservicio de IA. */
export function buildMlHeaders(authz = {}) {
  const headers = { 'Content-Type': 'application/json' }

  const serviceKey = process.env.ML_SERVICE_KEY
  if (serviceKey) headers['X-Service-Key'] = serviceKey

  if (authz.userId) headers['X-User-Id'] = String(authz.userId)
  if (authz.email) headers['X-User-Email'] = String(authz.email)
  if (authz.role) headers['X-User-Role'] = String(authz.role)

  return headers
}

/**
 * Realiza una petición al microservicio de IA reutilizando las cabeceras de
 * seguridad. Devuelve `null` si el servicio no responde (para que la ruta
 * active su fallback CLI de forma transparente).
 */
export async function callMlService(path, { method = 'GET', body, authz, timeoutMs } = {}) {
  const timeout = timeoutMs ?? (Number(process.env.ML_TIMEOUT_MS) || 15000)
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(`${FASTAPI_URL}${path}`, {
      method,
      headers: buildMlHeaders(authz),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal
    })
    return response
  } catch (err) {
    console.log(`[HONO API] Microservicio de IA no disponible (${err.message}). Se usará el fallback CLI.`)
    return null
  } finally {
    clearTimeout(timer)
  }
}

export { FASTAPI_URL }
