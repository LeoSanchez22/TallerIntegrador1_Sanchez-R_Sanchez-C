import { generateTestJWT } from './test_helpers.js'
import { test } from 'node:test'
import assert from 'node:assert'
import { app } from '../index.js'

test('ID-UT-02: Bloqueo de Acceso sin Encabezado Authorization', async () => {
  const res = await app.request('/api/recomendaciones')
  assert.strictEqual(res.status, 401)
  const body = await res.json()
  assert.strictEqual(body.error, 'No autorizado')
  assert.ok(body.details.includes('Falta la cabecera de autenticación'))
})

test('ID-UT-03: Rechazo de Token JWT con Firma Corrupta o Invalida', async () => {
  const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.firma_invalida'
  const res = await app.request('/api/recomendaciones', {
    headers: {
      'Authorization': `Bearer ${invalidToken}`
    }
  })
  assert.strictEqual(res.status, 401)
  const body = await res.json()
  assert.strictEqual(body.error, 'No autorizado')
  assert.ok(body.details.includes('La firma del token no es válida'))
})

test('ID-UT-04: Autenticacion Exitosa con Token JWT HS256 Valido', async () => {
  const validToken = generateTestJWT({
    user_metadata: { role: 'admin', full_name: 'Usuario Prueba' }
  })

  const res = await app.request('/api/recomendaciones', {
    headers: {
      'Authorization': `Bearer ${validToken}`
    }
  })

  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.ok('data' in body)
})

test('ID-UT-05: Denegacion de Acceso a Rutas Admin por Rol Insuficiente', async () => {
  const nonAdminToken = generateTestJWT({
    user_metadata: { role: 'representante', full_name: 'Representante Ventas' }
  })

  const res = await app.request('/api/users', {
    headers: {
      'Authorization': `Bearer ${nonAdminToken}`
    }
  })

  assert.strictEqual(res.status, 403)
  const body = await res.json()
  assert.strictEqual(body.error, 'Acceso denegado')
  assert.strictEqual(body.details, 'Se requieren privilegios de Administrador para acceder a este recurso.')
})

test('ID-UT-06: Bloqueo de Creacion de Usuarios a Roles No Administradores', async () => {
  const nonAdminToken = generateTestJWT({
    user_metadata: { role: 'representante' }
  })

  const res = await app.request('/api/users', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${nonAdminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: 'nuevo@empresa.com',
      password: 'password123',
      name: 'Nuevo Rep',
      role: 'representante'
    })
  })

  assert.strictEqual(res.status, 403)
})

test('ID-UT-07: Manejo de Falla Critica por Ausencia de Clave Secreta JWT', async () => {
  const originalSecret = process.env.SUPABASE_JWT_SECRET
  delete process.env.SUPABASE_JWT_SECRET

  const res = await app.request('/api/recomendaciones', {
    headers: {
      'Authorization': 'Bearer token-cualquiera'
    }
  })

  assert.strictEqual(res.status, 500)
  const body = await res.json()
  assert.strictEqual(body.error, 'Error de configuración')

  // Restaurar la variable de entorno
  process.env.SUPABASE_JWT_SECRET = originalSecret
})
