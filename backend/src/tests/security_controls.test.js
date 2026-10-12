import { generateTestJWT } from './test_helpers.js'
import { test } from 'node:test'
import assert from 'node:assert'
import { app } from '../index.js'

const adminToken = `Bearer ${generateTestJWT({ user_metadata: { role: 'admin', full_name: 'Admin Test' } })}`
const repToken = `Bearer ${generateTestJWT({
  user_metadata: { role: 'representante', full_name: 'Representante Ventas', zona_comercial: 'LIMA NORTE' }
})}`

/* =========================== RF-11 · RBAC ================================= */

test('RF-11: El Representante Comercial no puede registrar productos (solo consulta)', async () => {
  const res = await app.request('/api/productos/registrar', {
    method: 'POST',
    headers: { 'Authorization': repToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'SOPHIXAL FORTE',
      sub_familia: 'Oftálmico',
      indicacion: 'Glaucoma',
      composicion: 'Latanoprost',
      formato: 'Gotas'
    })
  })

  assert.strictEqual(res.status, 403)
  const body = await res.json()
  assert.strictEqual(body.error, 'Acceso denegado')
})

test('RF-11: El Representante Comercial puede consultar catálogos (GET permitido)', async () => {
  const res = await app.request('/api/recomendaciones', {
    headers: { 'Authorization': repToken }
  })
  assert.strictEqual(res.status, 200)
})

test('RF-11: El Representante Comercial no accede al visor de auditoría', async () => {
  const res = await app.request('/api/audit', { headers: { 'Authorization': repToken } })
  assert.strictEqual(res.status, 403)
})

test('RF-11: El Administrador sí accede al visor de auditoría', async () => {
  const res = await app.request('/api/audit?limit=5', { headers: { 'Authorization': adminToken } })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.ok(Array.isArray(body.data))
  assert.ok('source' in body)
})

/* ============================ RNF-13 · XSS =============================== */

test('RNF-13: Se rechaza una petición con payload de XSS en los parámetros de query', async () => {
  const res = await app.request('/api/clientes/list?search=%3Cscript%3Ealert(1)%3C/script%3E', {
    headers: { 'Authorization': adminToken }
  })
  assert.strictEqual(res.status, 400)
  const body = await res.json()
  assert.strictEqual(body.error, 'Entrada no válida')
})

test('RNF-13: Se rechaza un cuerpo JSON malformado', async () => {
  const res = await app.request('/api/clientes/registrar', {
    method: 'POST',
    headers: { 'Authorization': adminToken, 'Content-Type': 'application/json' },
    body: '{ esto no es json'
  })
  assert.strictEqual(res.status, 400)
})

/* ========================== RF-16 · Auditoría ============================= */

test('RF-16: Un intento de inicio de sesión fallido queda registrado en el log', async () => {
  const res = await app.request('/api/security/auth-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'login_failed', email: 'invitado@laboratoriossophia.com', reason: 'credenciales_invalidas' })
  })
  assert.strictEqual(res.status, 200)

  const logRes = await app.request('/api/audit?event_type=login_failed', {
    headers: { 'Authorization': adminToken }
  })
  const logBody = await logRes.json()
  assert.ok(logBody.data.length >= 1)

  const entry = logBody.data[0]
  assert.strictEqual(entry.event_type, 'login_failed')
  assert.ok(entry.event_time)
  assert.ok(entry.ip_address)
})

test('RF-16: Se rechazan eventos de autenticación fuera de la lista blanca', async () => {
  const res = await app.request('/api/security/auth-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event: 'borrar_todo', email: 'x@y.com' })
  })
  assert.strictEqual(res.status, 400)
})

/* ========================= RF-17 · Sesión inactiva ======================== */

test('RF-17: El umbral de cierre de sesión por inactividad es configurable', async () => {
  const original = process.env.SESSION_IDLE_TIMEOUT_MINUTES
  process.env.SESSION_IDLE_TIMEOUT_MINUTES = '15'
  const { getSessionIdleTimeoutMinutes } = await import('../middleware/idleSession.js')
  assert.strictEqual(getSessionIdleTimeoutMinutes(), 15)

  delete process.env.SESSION_IDLE_TIMEOUT_MINUTES
  assert.strictEqual(getSessionIdleTimeoutMinutes(), 30)
  if (original !== undefined) process.env.SESSION_IDLE_TIMEOUT_MINUTES = original
})

/* ================== Consentimiento informado · Ley 29733 ================= */

test('Ley 29733: El usuario autenticado consulta su estado de consentimiento', async () => {
  const res = await app.request('/api/consent', { headers: { 'Authorization': adminToken } })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.ok(body.policy)
  assert.ok(body.policy.version)
  assert.ok(Array.isArray(body.policy.finalidades))
  assert.strictEqual(typeof body.pending, 'boolean')
})

test('Ley 29733: Se registra el consentimiento informado con sello temporal e IP', async () => {
  const res = await app.request('/api/consent', {
    method: 'POST',
    headers: { 'Authorization': repToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ accepted: true, policyVersion: 'v1.0-2026' })
  })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.strictEqual(body.success, true)
  assert.strictEqual(body.consent.granted, true)
  assert.ok(body.consent.granted_at)
})
