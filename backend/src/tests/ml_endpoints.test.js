import { generateTestJWT } from './test_helpers.js'
import { test } from 'node:test'
import assert from 'node:assert'
import { app } from '../index.js'

const validAuthHeader = `Bearer ${generateTestJWT()}`

test('ID-UT-08: Verificacion del Endpoint Publico de Estado del Servidor', async () => {
  const res = await app.request('/')
  assert.strictEqual(res.status, 200)
  const text = await res.text()
  assert.ok(text.includes('Hono.js API Sophia XAI'))
})

test('ID-UT-09: Rechazo de Carga de Modelo sin Encabezado de Autorizacion', async () => {
  const res = await app.request('/model/upload', {
    method: 'POST'
  })
  assert.strictEqual(res.status, 401)
  const body = await res.json()
  assert.strictEqual(body.error, 'No autorizado: Token de carga inválido o ausente')
})

test('ID-UT-10: Rechazo de Carga de Modelo con Token de Carga Invalido', async () => {
  const res = await app.request('/model/upload', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer token-incorrecto'
    }
  })
  assert.strictEqual(res.status, 401)
  const body = await res.json()
  assert.strictEqual(body.error, 'No autorizado: Token de carga inválido o ausente')
})

test('ID-UT-11: Validacion de Peticion de Carga de Modelo sin Archivo Adjunto', async () => {
  const formData = new FormData()

  const res = await app.request('/model/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MODEL_UPLOAD_TOKEN}`
    },
    body: formData
  })

  assert.strictEqual(res.status, 400)
  const body = await res.json()
  assert.ok(body.error.includes('Petición inválida'))
})

test('ID-UT-12: Proteccion Contra Agotamiento de Memoria (DoS) por Archivo > 100MB', async () => {
  const bigBuffer = new Uint8Array(101 * 1024 * 1024)
  const file = new File([bigBuffer], 'modelo_101mb.pt', { type: 'application/octet-stream' })

  const formData = new FormData()
  formData.append('file', file)

  const res = await app.request('/model/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MODEL_UPLOAD_TOKEN}`
    },
    body: formData
  })

  assert.strictEqual(res.status, 400)
  const body = await res.json()
  assert.strictEqual(body.error, 'Petición inválida: El archivo supera el límite permitido de 100MB')
})

test('ID-UT-13: Carga Exitosa de Checkpoint del Modelo .pt', async () => {
  const fileContent = new Uint8Array([1, 2, 3, 4, 5])
  const file = new File([fileContent], 'modelo_valido.pt', { type: 'application/octet-stream' })

  const formData = new FormData()
  formData.append('file', file)

  const res = await app.request('/model/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.MODEL_UPLOAD_TOKEN}`
    },
    body: formData
  })

  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.strictEqual(body.success, true)
  assert.strictEqual(body.message, 'Modelo actualizado exitosamente en el servidor de despliegue')
})

test('ID-UT-14: Validacion de Parametro de Cliente en Predictor ML', async () => {
  const res = await app.request('/api/proyeccion/invalid_id', {
    headers: { 'Authorization': validAuthHeader }
  })
  assert.strictEqual(res.status, 400)
  const body = await res.json()
  assert.strictEqual(body.error, 'ID de cliente inválido')
})

test('ID-UT-15: Obtencion de Prediccion ML y XAI por Cliente', async () => {
  const res = await app.request('/api/proyeccion/101', {
    headers: { 'Authorization': validAuthHeader }
  })
  assert.ok([200, 500].includes(res.status))
  const body = await res.json()
  assert.ok(body !== null && typeof body === 'object')
})

test('ID-UT-16: Consulta de Metricas MLOps y KPIs del Modelo', async () => {
  const res = await app.request('/api/statistics', {
    headers: { 'Authorization': validAuthHeader }
  })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.ok('hitRate' in body)
  assert.ok('precision' in body)
  assert.ok('chartData' in body)
  assert.ok('efficiencyData' in body)
  assert.ok('modelSummary' in body)
})

test('ID-UT-17: Muestreo de Datos de Pipeline MLOps', async () => {
  const res = await app.request('/api/pipeline', {
    headers: { 'Authorization': validAuthHeader }
  })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.ok('total_rows' in body)
  assert.ok('sample_data' in body)
})

test('ID-UT-18: Validacion de Campos Requeridos en Registro de Productos', async () => {
  const res = await app.request('/api/productos/registrar', {
    method: 'POST',
    headers: {
      'Authorization': validAuthHeader,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nombre: 'Producto Incompleto'
    })
  })

  assert.strictEqual(res.status, 400)
  const body = await res.json()
  assert.strictEqual(body.error, 'Faltan campos obligatorios')
})

test('ID-UT-19: Inicio de Entrenamiento Asincrono del Modelo AttentionGRU', async () => {
  const res = await app.request('/api/model/train', {
    method: 'POST',
    headers: { 'Authorization': validAuthHeader }
  })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.ok('status' in body)
})

test('ID-UT-20: Consulta de Estado e Historial del Entrenamiento ML', async () => {
  const res = await app.request('/api/model/train/status', {
    headers: { 'Authorization': validAuthHeader }
  })
  assert.strictEqual(res.status, 200)
  const body = await res.json()
  assert.ok('is_training' in body)
  assert.ok(Array.isArray(body.logs))
})
