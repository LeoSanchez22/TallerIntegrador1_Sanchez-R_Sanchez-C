/**
 * =============================================================================
 *  RUTAS DE SEGURIDAD: EVENTOS DE AUTENTICACIÓN + CONSENTIMIENTO INFORMADO
 * =============================================================================
 *  RF-16 · Registro y auditoría de accesos (ISO/IEC 27002, control 8.15)
 *  Ley N° 29733 / D.S. 003-2013-JUS · Consentimiento informado (Art. 9° y 12°)
 * =============================================================================
 */

import { Hono } from 'hono'

import {
  AUDIT_EVENTS,
  getClientIp,
  getUserAgent,
  logSecurityEvent,
  throttleAudit
} from '../security/audit.js'
import { isEmail, sanitizeText } from '../middleware/sanitize.js'
import {
  DATA_CONTROLLER,
  DPO_CONTACT,
  INTERNATIONAL_TRANSFER,
  POLICY_EFFECTIVE_DATE,
  POLICY_PURPOSES,
  POLICY_VERSION,
  PURPOSE_IDS
} from '../security/policy.js'

const securityRouter = new Hono()
const consentRouter = new Hono()

/** Lista blanca de eventos de autenticación que el frontend puede reportar. */
const ALLOWED_AUTH_EVENTS = new Set([
  AUDIT_EVENTS.LOGIN_SUCCESS,
  AUDIT_EVENTS.LOGIN_FAILED,
  AUDIT_EVENTS.LOGOUT,
  AUDIT_EVENTS.SESSION_IDLE_TIMEOUT,
  AUDIT_EVENTS.SESSION_REVOKED,
  AUDIT_EVENTS.PASSWORD_RECOVERY
])

const ALLOWED_REASONS = new Set([
  'credenciales_invalidas',
  'usuario_no_encontrado',
  'cuenta_inhabilitada',
  'error_de_red',
  'sesion_inactividad',
  'cierre_manual'
])

/** Copia en memoria del consentimiento (respaldo cuando la BD no responde). */
const consentMemoryStore = new Map()

function policyPayload() {
  return {
    version: POLICY_VERSION,
    fecha_vigencia: POLICY_EFFECTIVE_DATE,
    responsable: DATA_CONTROLLER,
    contacto_dpd: DPO_CONTACT,
    finalidades: POLICY_PURPOSES,
    transferencia_internacional: INTERNATIONAL_TRANSFER
  }
}

/* ---------------------------------------------------------------------------
 * RF-16 · Endpoint de registro de intentos de autenticación.
 * Es la ÚNICA vía de escritura sin JWT de la plataforma: por eso aplica
 * lista blanca de eventos, saneado estricto y rate limiting agresivo (RNF-14).
 * ------------------------------------------------------------------------- */
securityRouter.post('/auth-event', async (c) => {
  let body = {}
  try {
    body = await c.req.json()
  } catch (err) {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const eventType = sanitizeText(body.event, 40)
  if (!ALLOWED_AUTH_EVENTS.has(eventType)) {
    return c.json({ error: 'Evento no reconocido', details: 'El tipo de evento no está permitido.' }, 400)
  }

  const email = body.email ? sanitizeText(String(body.email), 254).toLowerCase() : null
  if ([AUDIT_EVENTS.LOGIN_SUCCESS, AUDIT_EVENTS.LOGIN_FAILED].includes(eventType) && !isEmail(email)) {
    return c.json({ error: 'Correo inválido', details: 'Se requiere un correo electrónico válido para registrar el evento.' }, 400)
  }

  const reason = body.reason && ALLOWED_REASONS.has(sanitizeText(body.reason, 40))
    ? sanitizeText(body.reason, 40)
    : null

  // Protección anti-abuso: no se permite inundar el log desde esta ruta pública.
  const ip = getClientIp(c)
  const bucket = eventType === AUDIT_EVENTS.LOGIN_FAILED ? 'auth-fail' : 'auth-ok'
  if (!throttleAudit(`${bucket}:${ip}`, eventType === AUDIT_EVENTS.LOGIN_FAILED ? 15 : 40, 5 * 60 * 1000)) {
    return c.json({ success: true, throttled: true })
  }

  await logSecurityEvent({
    eventType,
    severity: eventType === AUDIT_EVENTS.LOGIN_FAILED ? 'warning' : 'info',
    userEmail: email,
    ip,
    userAgent: getUserAgent(c),
    method: c.req.method,
    resource: '/login',
    statusCode: eventType === AUDIT_EVENTS.LOGIN_FAILED ? 401 : 200,
    details: reason ? { motivo: reason } : {}
  })

  return c.json({ success: true })
})

/* ---------------------------------------------------------------------------
 * Consentimiento informado — consulta del estado del usuario autenticado.
 * ------------------------------------------------------------------------- */
consentRouter.get('/', async (c) => {
  const ctx = c.get('authz')
  if (!ctx?.userId) {
    return c.json({ error: 'No autorizado' }, 401)
  }

  let consent = consentMemoryStore.get(`${ctx.userId}:${POLICY_VERSION}`) || null

  try {
    const { pool } = await import('../config/db.js')
    const res = await pool.query(
      `SELECT policy_version, granted, purposes, ip_address, granted_at, revoked_at
       FROM public.user_consents
       WHERE user_id = $1 AND policy_version = $2
       ORDER BY id DESC
       LIMIT 1`,
      [ctx.userId, POLICY_VERSION]
    )
    if (res.rows.length > 0) {
      const row = res.rows[0]
      consent = {
        policy_version: row.policy_version,
        granted: row.granted === true,
        purposes: row.purposes || [],
        ip_address: row.ip_address,
        granted_at: row.granted_at,
        revoked_at: row.revoked_at
      }
      consentMemoryStore.set(`${ctx.userId}:${POLICY_VERSION}`, consent)
    }
  } catch (err) {
    // Modo respaldo: se responde con la copia en memoria.
  }

  const granted = Boolean(consent && consent.granted && !consent.revoked_at)

  return c.json({
    policy: policyPayload(),
    consent,
    pending: !granted
  })
})

/* ---------------------------------------------------------------------------
 * Consentimiento informado — registro / revocación con sello temporal e IP.
 * ------------------------------------------------------------------------- */
consentRouter.post('/', async (c) => {
  const ctx = c.get('authz')
  if (!ctx?.userId) {
    return c.json({ error: 'No autorizado' }, 401)
  }

  let body = {}
  try {
    body = await c.req.json()
  } catch (err) {
    return c.json({ error: 'JSON inválido' }, 400)
  }

  const granted = body.accepted === true
  const requestedVersion = sanitizeText(body.policyVersion, 40) || POLICY_VERSION
  const rawPurposes = Array.isArray(body.purposes) ? body.purposes.slice(0, 20) : PURPOSE_IDS
  const purposes = rawPurposes.filter(p => PURPOSE_IDS.includes(p))

  const ip = getClientIp(c)
  const userAgent = getUserAgent(c)

  const record = {
    policy_version: requestedVersion,
    granted,
    purposes,
    ip_address: ip,
    user_agent: userAgent,
    granted_at: new Date().toISOString(),
    revoked_at: granted ? null : new Date().toISOString()
  }

  consentMemoryStore.set(`${ctx.userId}:${requestedVersion}`, record)

  try {
    const { pool } = await import('../config/db.js')
    await pool.query(
      `INSERT INTO public.user_consents (
         user_id, user_email, user_role, policy_version, purposes, granted,
         consent_text, ip_address, user_agent, granted_at, revoked_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, NOW(), CASE WHEN $6 THEN NULL ELSE NOW() END)`,
      [
        ctx.userId,
        ctx.email,
        ctx.role,
        requestedVersion,
        JSON.stringify(purposes),
        granted,
        'Consentimiento informado otorgado bajo el aviso de privacidad versión ' + requestedVersion,
        ip,
        userAgent
      ]
    )
  } catch (err) {
    console.warn('[CONSENT] No se pudo persistir en PostgreSQL, se mantiene el respaldo en memoria:', err.message)
  }

  await logSecurityEvent({
    eventType: granted ? AUDIT_EVENTS.CONSENT_GRANTED : AUDIT_EVENTS.CONSENT_REVOKED,
    severity: 'info',
    userId: ctx.userId,
    userEmail: ctx.email,
    userRole: ctx.role,
    ip,
    userAgent,
    method: c.req.method,
    resource: '/api/consent',
    statusCode: 200,
    details: { politica: requestedVersion, finalidades: purposes }
  })

  return c.json({ success: true, consent: record, policy: policyPayload() })
})

export { securityRouter, consentRouter }
