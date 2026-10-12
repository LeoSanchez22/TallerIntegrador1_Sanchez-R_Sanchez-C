/**
 * =============================================================================
 *  RUTAS DE AUDITORÍA (solo Administrador)
 * =============================================================================
 *  RF-16 · Log de auditoría de seguridad  → GET /api/audit
 *  RF-14 · Trazabilidad de simulaciones  → GET /api/audit/simulations
 *  Compliance Ley 29733                  → GET /api/audit/consents
 *
 * El control de acceso a estas rutas lo impone el middleware RBAC
 * (ADMIN_READ_PREFIXES en src/middleware/rbac.js).
 * =============================================================================
 */

import { Hono } from 'hono'

import { getSecurityLog, getSecurityStats, getSimulationLog, AUDIT_EVENTS } from '../security/audit.js'
import { POLICY_VERSION } from '../security/policy.js'

const auditRouter = new Hono()

const ALLOWED_EVENT_TYPES = new Set(Object.values(AUDIT_EVENTS))

/** RF-16 · Log de seguridad con IP, sello temporal y detalle del evento. */
auditRouter.get('/', async (c) => {
  const limit = Number(c.req.query('limit')) || 100
  const eventTypeParam = c.req.query('event_type')
  const eventType = eventTypeParam && ALLOWED_EVENT_TYPES.has(eventTypeParam) ? eventTypeParam : null

  const { data, source, fallbackReason } = await getSecurityLog({ limit, eventType })

  return c.json({
    data,
    total: data.length,
    source,
    ...(fallbackReason ? { fallbackReason } : {})
  })
})

/** Resumen de eventos para las tarjetas de indicadores del administrador. */
auditRouter.get('/stats', async (c) => {
  const { counts, source } = await getSecurityStats()
  return c.json({ counts, source })
})

/** RF-14 · Registro inmutable de simulaciones ejecutadas. */
auditRouter.get('/simulations', async (c) => {
  const limit = Number(c.req.query('limit')) || 100
  const { data, source, fallbackReason } = await getSimulationLog({ limit })
  return c.json({
    data,
    total: data.length,
    source,
    ...(fallbackReason ? { fallbackReason } : {})
  })
})

/** Consentimientos informados registrados (Ley N° 29733). */
auditRouter.get('/consents', async (c) => {
  try {
    const { pool } = await import('../config/db.js')
    const res = await pool.query(
      `SELECT user_id, user_email, user_role, policy_version, purposes, granted,
              ip_address, granted_at, revoked_at
       FROM public.user_consents
       ORDER BY granted_at DESC
       LIMIT 200`
    )
    return c.json({ data: res.rows, total: res.rows.length, source: 'postgres' })
  } catch (err) {
    return c.json({
      data: [],
      total: 0,
      source: 'memory',
      fallbackReason: 'La tabla user_consents aún no existe. Ejecuta supabase/migrations/001_security_controls.sql',
      policy_version: POLICY_VERSION
    })
  }
})

export { auditRouter }
