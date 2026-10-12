/**
 * =============================================================================
 *  LOG DE AUDITORÍA DE SEGURIDAD  (RF-16 · ISO/IEC 27002 control 8.15)
 * =============================================================================
 * Registro centralizado, inmutable y con sello temporal de:
 *   - intentos de inicio de sesión fallidos / exitosos
 *   - accesos no autorizados (401/403) y tokens inválidos
 *   - cambios de privilegios (alta, edición de rol, inhabilitación)
 *   - cierre de sesión automático por inactividad (RF-17)
 *   - eventos de consentimiento informado (Ley N° 29733)
 *
 * Cada evento conserva: usuario, dirección IP, marca de tiempo, recurso,
 * código de estado y detalles en JSON.
 *
 * Estrategia de persistencia tolerante a fallos:
 *   1. Memoria RAM (ring buffer)  -> siempre disponible (últimos 1000 eventos).
 *   2. PostgreSQL (tabla pública)  -> persistencia real e inmutable.
 *   3. Archivo JSONL local         -> respaldo si la BD no responde.
 * Nunca lanza excepciones: auditar no puede tumbar la API.
 * =============================================================================
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const MEMORY_BUFFER_LIMIT = 1000
const LOG_DIR = path.resolve(__dirname, '../../logs')

const memoryBuffer = []
const simulationBuffer = []

/** Tipos de evento admitidos (lista blanca · previene inyección de registros basura) */
export const AUDIT_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',
  SESSION_IDLE_TIMEOUT: 'session_idle_timeout',
  SESSION_REVOKED: 'session_revoked',
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  INVALID_TOKEN: 'invalid_token',
  ACCOUNT_DISABLED: 'account_disabled',
  PRIVILEGE_CHANGE: 'privilege_change',
  USER_CREATED: 'user_created',
  PRODUCT_CREATED: 'product_created',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  ZONE_SCOPE_UNASSIGNED: 'scope_zone_unassigned',
  CONSENT_GRANTED: 'consent_granted',
  CONSENT_REVOKED: 'consent_revoked',
  PASSWORD_RECOVERY: 'password_recovery_requested',
  MODEL_UPDATED: 'model_updated'
}

const ALLOWED_EVENT_TYPES = new Set(Object.values(AUDIT_EVENTS))
const ALLOWED_SEVERITIES = new Set(['info', 'warning', 'critical'])

/** Truncatea y sanea cualquier valor antes de persistirlo. */
function safeText(value, maxLength = 250) {
  if (value === null || value === undefined) return null
  const raw = typeof value === 'string' ? value : String(value)
  // Elimina bytes de control y etiquetas HTML (prevención de XSS en visores)
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/<[^>]*>/g, '')
    .trim()
    .slice(0, maxLength)
}

/** Obtiene la IP real del cliente priorizando cabeceras del reverse proxy (Nginx). */
export function getClientIp(c) {
  const forwarded = c.req.header('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }
  const realIp = c.req.header('x-real-ip')
  if (realIp) return realIp.trim()
  return c.req.header('cf-connecting-ip') || '0.0.0.0'
}

export function getUserAgent(c) {
  return safeText(c.req.header('user-agent'), 200)
}

/**
 * Normaliza y almacena un evento en el ring buffer en memoria.
 * Devuelve el registro creado.
 */
function recordInMemory(buffer, record) {
  buffer.unshift(record)
  if (buffer.length > MEMORY_BUFFER_LIMIT) buffer.pop()
  return record
}

/**
 * Escribe en disco el respaldo JSONL cuando PostgreSQL no está disponible.
 */
function appendToFile(tableName, record) {
  try {
    if (process.env.NODE_ENV === 'test') return
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true })
    }
    const day = new Date().toISOString().slice(0, 10)
    const filePath = path.join(LOG_DIR, `${tableName}-${day}.log`)
    fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, 'utf-8')
  } catch (fileErr) {
    console.error('[AUDIT] No se pudo escribir el respaldo en disco:', fileErr.message)
  }
}

/**
 * Registra un evento de seguridad. Fire-and-forget: jamás revienta el request.
 *
 * @param {object} event
 * @param {string} event.eventType   Tipo de evento (ver AUDIT_EVENTS).
 * @param {string} [event.severity]  info | warning | critical
 * @param {string} [event.userId]
 * @param {string} [event.userEmail]
 * @param {string} [event.userRole]
 * @param {string} [event.ip]
 * @param {string} [event.userAgent]
 * @param {string} [event.method]
 * @param {string} [event.resource]
 * @param {number} [event.statusCode]
 * @param {object} [event.details]
 */
export async function logSecurityEvent(event = {}) {
  const now = new Date()
  const record = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    event_time: now.toISOString(),
    event_type: ALLOWED_EVENT_TYPES.has(event.eventType) ? event.eventType : 'unauthorized_access',
    severity: ALLOWED_SEVERITIES.has(event.severity) ? event.severity : 'info',
    user_id: safeText(event.userId, 64),
    user_email: safeText(event.userEmail, 160),
    user_role: safeText(event.userRole, 40),
    ip_address: safeText(event.ip, 64),
    user_agent: safeText(event.userAgent, 200),
    http_method: safeText(event.method, 10),
    resource: safeText(event.resource, 300),
    status_code: Number.isFinite(event.statusCode) ? Number(event.statusCode) : null,
    details: event.details && typeof event.details === 'object' ? event.details : {}
  }

  recordInMemory(memoryBuffer, record)

  // En pruebas unitarias solo queda el buffer en memoria (sin I/O).
  if (process.env.NODE_ENV === 'test') return record

  try {
    const { pool } = await import('../config/db.js')
    await pool.query(
      `INSERT INTO public.security_audit_log (
         event_time, event_type, severity, user_id, user_email, user_role,
         ip_address, user_agent, http_method, resource, status_code, details
       ) VALUES ($1::timestamptz, $2, $3, NULLIF($4,'')::uuid, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
      [
        record.event_time,
        record.event_type,
        record.severity,
        record.user_id,
        record.user_email,
        record.user_role,
        record.ip_address,
        record.user_agent,
        record.http_method,
        record.resource,
        record.status_code,
        JSON.stringify(record.details || {})
      ]
    )
  } catch (err) {
    // La tabla aún no existe (migración pendiente) o la BD está offline.
    appendToFile('security-audit', record)
  }

  return record
}

/**
 * RF-14 · Registro inmutable de trazabilidad de cada simulación ejecutada:
 * usuario, cliente, producto recomendado y argumento comercial generado.
 */
export async function logSimulationTrace(trace = {}) {
  const now = new Date()
  const record = {
    id: `${now.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
    executed_at: now.toISOString(),
    user_id: safeText(trace.userId, 64),
    user_email: safeText(trace.userEmail, 160),
    user_role: safeText(trace.userRole, 40),
    client_id: Number.isFinite(Number(trace.clientId)) ? Number(trace.clientId) : null,
    client_name: safeText(trace.clientName, 200),
    client_zone: safeText(trace.clientZone, 120),
    recommended_product: safeText(trace.recommendedProduct, 200),
    commercial_argument: safeText(trace.commercialArgument, 1200),
    source: safeText(trace.source, 40),
    ip_address: safeText(trace.ip, 64),
    payload: trace.payload && typeof trace.payload === 'object' ? trace.payload : {}
  }

  recordInMemory(simulationBuffer, record)

  if (process.env.NODE_ENV === 'test') return record

  try {
    const { pool } = await import('../config/db.js')
    await pool.query(
      `INSERT INTO public.simulation_trace_log (
         executed_at, user_id, user_email, user_role, client_id, client_name,
         client_zone, recommended_product, commercial_argument, source, ip_address, payload
       ) VALUES ($1::timestamptz, NULLIF($2,'')::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)`,
      [
        record.executed_at,
        record.user_id,
        record.user_email,
        record.user_role,
        record.client_id,
        record.client_name,
        record.client_zone,
        record.recommended_product,
        record.commercial_argument,
        record.source,
        record.ip_address,
        JSON.stringify(record.payload || {})
      ]
    )
  } catch (err) {
    appendToFile('simulation-trace', record)
  }

  return record
}

/**
 * Protege eventos de alta frecuencia (p.ej. tokens inválidos masivos) para que
 * un atacante no pueda inundar la tabla de auditoría.
 */
const throttleMap = new Map()
export function throttleAudit(key, limit = 20, windowMs = 5 * 60 * 1000) {
  if (process.env.NODE_ENV === 'test') return true
  const now = Date.now()
  const entry = throttleMap.get(key)
  if (!entry || now > entry.resetAt) {
    throttleMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  entry.count += 1
  return entry.count <= limit
}

/* --------------------------- Consultas para el visor ----------------------- */

function clampLimit(limit, fallback = 100) {
  const parsed = Number(limit)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return Math.min(Math.floor(parsed), 500)
}

/** RF-16: últimas entradas del log de auditoría de seguridad. */
export async function getSecurityLog({ limit = 100, eventType = null } = {}) {
  const max = clampLimit(limit)
  try {
    const { pool } = await import('../config/db.js')
    const params = []
    let where = ''
    if (eventType && ALLOWED_EVENT_TYPES.has(eventType)) {
      params.push(eventType)
      where = `WHERE event_type = $${params.length}`
    }
    params.push(max)
    const res = await pool.query(
      `SELECT id, event_time, event_type, severity, user_id, user_email, user_role,
              ip_address, user_agent, http_method, resource, status_code, details
       FROM public.security_audit_log
       ${where}
       ORDER BY event_time DESC, id DESC
       LIMIT $${params.length}`,
      params
    )
    return { data: res.rows, source: 'postgres' }
  } catch (err) {
    let rows = memoryBuffer
    if (eventType) rows = rows.filter(r => r.event_type === eventType)
    return { data: rows.slice(0, max), source: 'memory', fallbackReason: err.message }
  }
}

/** RF-14: últimas simulaciones registradas. */
export async function getSimulationLog({ limit = 100 } = {}) {
  const max = clampLimit(limit)
  try {
    const { pool } = await import('../config/db.js')
    const res = await pool.query(
      `SELECT id, executed_at, user_id, user_email, user_role, client_id, client_name,
              client_zone, recommended_product, commercial_argument, source, ip_address, payload
       FROM public.simulation_trace_log
       ORDER BY executed_at DESC, id DESC
       LIMIT $1`,
      [max]
    )
    return { data: res.rows, source: 'postgres' }
  } catch (err) {
    return { data: simulationBuffer.slice(0, max), source: 'memory', fallbackReason: err.message }
  }
}

/** Resumen de eventos por tipo para el panel del administrador. */
export async function getSecurityStats() {
  const counts = {}
  try {
    const { pool } = await import('../config/db.js')
    const res = await pool.query(
      `SELECT event_type, COUNT(*)::int AS total
       FROM public.security_audit_log
       GROUP BY event_type`
    )
    res.rows.forEach(r => { counts[r.event_type] = r.total })
    return { counts, source: 'postgres' }
  } catch (err) {
    memoryBuffer.forEach(r => {
      counts[r.event_type] = (counts[r.event_type] || 0) + 1
    })
    return { counts, source: 'memory', fallbackReason: err.message }
  }
}

/** Solo para pruebas unitarias. */
export function __resetAuditBuffers() {
  memoryBuffer.length = 0
  simulationBuffer.length = 0
  throttleMap.clear()
}

export { memoryBuffer as __auditMemoryBuffer }
