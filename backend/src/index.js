import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import dotenv from 'dotenv'

// Importaciones Modulares
import { authMiddleware } from './middleware/auth.js'
import { precargarDatos, getCachedData, getIsReady, pool } from './config/db.js'

import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') }) // Raíz del proyecto
dotenv.config({ path: path.resolve(__dirname, '../.env') }) // Carpeta backend

const app = new Hono()

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

// 1. Configuración de CORS Segura para Producción y Desarrollo
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:3005',
      'http://localhost:5005',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3005',
      'http://127.0.0.1:5005'
    ]

app.use('/*', cors({
  origin: (origin) => {
    // Si no hay Origin header (ej. solicitudes backend a backend locales), permitimos acceso
    if (!origin) return '*'
    if (allowedOrigins.includes(origin)) {
      return origin
    }
    // Retornamos un origen seguro por defecto
    return 'http://localhost:3000'
  },
  credentials: true
}))

// 2. Middleware JWT Modular de Autenticación
app.use('/api/*', authMiddleware)

// 3. Inicialización e inicio de precarga de datos de Base de Datos
precargarDatos()

// 4. Endpoint de Salud (Healthcheck) - Público
app.get('/', (c) => c.text('Hono.js API Sophia XAI activa y segura'))

// === ENDPOINTS DE LA API PROTEGIDOS CON JWT ===

// Endpoint para obtener todas las recomendaciones precargadas
app.get('/api/recomendaciones', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  return c.json({ data: getCachedData() })
})

// Endpoint para obtener la lista de zonas comerciales únicas
app.get('/api/zonas', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()
  const zonas = Array.from(new Set(currentData.map(r => r.zona_comercial || r.zona || r.vendedor))).filter(Boolean)
  return c.json({ zonas })
})

// Endpoint para el Dashboard Principal
app.get('/api/dashboard', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()
  const zonaFiltro = c.req.query('zona')

  let dataFiltro = currentData
  if (zonaFiltro && zonaFiltro !== 'Todas') {
    dataFiltro = currentData.filter(r => (r.zona_comercial || r.zona || r.vendedor) === zonaFiltro)
  }

  const ingresos = dataFiltro.reduce((acc, curr) => acc + (Number(curr.ingresos || curr.venta || curr.Venta || curr.total || curr.Total || curr.monto || curr.Monto || curr.importe || curr.Importe || 0)), 0)
  const totalClientes = new Set(dataFiltro.map(r => r.cliente_id)).size
  const totalProductos = new Set(dataFiltro.map(r => r.producto_id)).size

  // Obtener top 5 productos más recurrentes
  const conteoProductos = {}
  dataFiltro.forEach(r => {
    const prod = r.producto || r.Producto
    if (prod) {
      conteoProductos[prod] = (conteoProductos[prod] || 0) + 1
    }
  })
  const topProductos = Object.entries(conteoProductos).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return c.json({
    ingresos_totales: ingresos,
    clientes_activos: totalClientes,
    productos_vendidos: totalProductos,
    top_productos: topProductos.map(t => ({ producto: t[0], ventas: t[1] }))
  })
})

// Endpoint de Estadísticas y simulación de KPIs de MLOps
app.get('/api/statistics', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()
  const zonaFiltro = c.req.query('zona')

  let dataFiltro = currentData
  if (zonaFiltro && zonaFiltro !== 'Todas') {
    dataFiltro = currentData.filter(r => (r.zona_comercial || r.zona || r.vendedor) === zonaFiltro)
  }

  const hitRateNum = dataFiltro.length > 0 ? (0.65 + (Math.random() * 0.15)) : 0
  const hitRate = hitRateNum.toFixed(3)
  const precisionNum = dataFiltro.length > 0 ? (0.70 + (Math.random() * 0.10)) : 0
  const precision = precisionNum.toFixed(3)

  const chartData = [
    { month: "Semana 1", NCF: Math.round(dataFiltro.length * 0.4), GRU: Math.round(dataFiltro.length * 0.2) },
    { month: "Semana 2", NCF: Math.round(dataFiltro.length * 0.3), GRU: Math.round(dataFiltro.length * 0.1) },
    { month: "Semana 3", NCF: Math.round(dataFiltro.length * 0.2), GRU: Math.round(dataFiltro.length * 0.9) },
    { month: "Semana 4", NCF: Math.round(dataFiltro.length * 0.2), GRU: Math.round(dataFiltro.length * 0.3) },
  ]

  const efficiencyData = [
    { category: "Tiempo de Respuesta", manual: 45, ai: 12 },
    { category: "Tasa de Precisión", manual: 58, ai: Math.round(hitRateNum * 100) },
    { category: "Identificación Oportunidades", manual: 32, ai: Math.round(precisionNum * 90) },
    { category: "Satisfacción Cliente", manual: 65, ai: 84 },
  ]

  const modelSummary = {
    ncfAccuracy: (precisionNum * 100).toFixed(1),
    lstmAccuracy: (hitRateNum * 100).toFixed(1),
    dataQuality: 91.2,
    status: 'Healthy'
  }

  return c.json({
    hitRate,
    precision,
    chartData,
    efficiencyData,
    modelSummary,
    total_interacciones: dataFiltro.length
  })
})

// Endpoint para el flujo de Datos Crudos (Muestra)
app.get('/api/pipeline', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()

  const sample = currentData.slice(0, 100).map(r => ({
    id: r.id || Math.random().toString(36).substr(2, 9),
    cliente_id: r.cliente_id,
    producto: r.producto || r.Producto,
    zona: r.zona_comercial || r.zona || r.vendedor,
    ingresos: r.ingresos || r.venta || r.Venta || r.total || r.Total || r.monto || r.Monto || r.importe || r.Importe || 0
  }))

  return c.json({
    total_rows: currentData.length,
    columns: Object.keys(currentData[0] || {}),
    sample_data: sample
  })
})

// Endpoint inteligente para generar proyecciones y XAI por Cliente (Conexión a IA Service)
app.get('/api/proyeccion/:cliente_id', async (c) => {
  const clienteId = Number(c.req.param('cliente_id'))
  if (isNaN(clienteId)) {
    return c.json({ error: "ID de cliente inválido" }, 400)
  }

  // 1. Intentar llamar al servicio FastAPI (Primario)
  try {
    const response = await fetch(`${FASTAPI_URL}/api/proyeccion/${clienteId}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`[HONO API] Predicción obtenida de FastAPI para cliente ${clienteId}`)
      return c.json(data)
    }
  } catch (err) {
    console.log(`[HONO API] FastAPI no responde (${err.message}). Ejecutando fallback CLI...`)
  }

  // 2. Fallback CLI: Ejecutar predict.py
  return new Promise((resolve, reject) => {
    const pythonCmd = `.\\.venv\\Scripts\\python.exe src_py/predict.py ${clienteId}`
    const rootPath = path.resolve(__dirname, '../../')
    exec(pythonCmd, { cwd: rootPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[HONO API] Fallback CLI falló:`, stderr)
        return resolve(c.json({ error: "Error en motor predictivo de respaldo", details: stderr }, 500))
      }
      try {
        const data = JSON.parse(stdout)
        console.log(`[HONO API] Predicción exitosa mediante fallback CLI para cliente ${clienteId}`)
        return resolve(c.json(data))
      } catch (parseErr) {
        console.error(`[HONO API] Error parseando stdout del CLI:`, stdout)
        return resolve(c.json({ error: "Error parseando respuesta de IA", details: parseErr.message }, 500))
      }
    })
  })
})

// Endpoint para registrar un nuevo producto (Nuevos Lanzamientos)
app.post('/api/productos/registrar', async (c) => {
  const body = await c.req.json()
  const { nombre, sub_familia, indicacion, composicion, formato } = body

  if (!nombre || !sub_familia || !indicacion || !composicion || !formato) {
    return c.json({ error: "Faltan campos obligatorios" }, 400)
  }

  // 1. Intentar llamar a FastAPI
  try {
    const response = await fetch(`${FASTAPI_URL}/api/productos/registrar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    console.log(`[HONO API] FastAPI registrar_producto offline. Corriendo CLI fallback...`)
  }

  // 2. Fallback CLI: Ejecutar register_product.py
  return new Promise((resolve) => {
    const rootPath = path.resolve(__dirname, '../../')
    const pythonCmd = `.\\.venv\\Scripts\\python.exe src_py/register_product.py "${nombre}" "${sub_familia}" "${indicacion}" "${composicion}" "${formato}"`
    exec(pythonCmd, { cwd: rootPath }, (error, stdout, stderr) => {
      if (error) {
        console.error(`[HONO API] Fallback CLI registrar falló:`, stderr)
        return resolve(c.json({ error: "No se pudo registrar en la base de datos local", details: stderr }, 500))
      }
      return resolve(c.json({ success: true, producto: { nombre, sub_familia, indicacion, composicion, formato, es_nuevo: true } }))
    })
  })
})

// Endpoint para iniciar el entrenamiento de AttentionGRU
app.post('/api/model/train', async (c) => {
  // 1. Intentar llamar a FastAPI
  try {
    const response = await fetch(`${FASTAPI_URL}/api/train`, {
      method: 'POST'
    })
    if (response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    console.log(`[HONO API] FastAPI train offline. Corriendo CLI fallback asíncrono...`)
  }

  // 2. Fallback CLI: Lanza subprocess de train.py de forma asíncrona
  const rootPath = path.resolve(__dirname, '../../')
  exec('.\\.venv\\Scripts\\python.exe src_py/train.py', { cwd: rootPath }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[HONO API] Entrenamiento fallido en CLI:`, stderr)
    } else {
      console.log(`[HONO API] Entrenamiento completado en CLI exitosamente.`)
    }
  })

  return c.json({
    status: "started",
    message: "Entrenamiento iniciado en segundo plano (Fallback CLI)."
  })
})

// Endpoint para consultar estado del entrenamiento
app.get('/api/model/train/status', async (c) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/train/status`)
    if (response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    // Si FastAPI está caído
  }
  return c.json({
    is_training: false,
    logs: ["Microservicio FastAPI offline. Los logs en tiempo real solo están disponibles si levanta servidor_front.py."]
  })
})

// --- ENDPOINTS DE ADMINISTRACIÓN DE REPRESENTANTES (CRUD) ---

// 1. Obtener perfil en tiempo real del usuario autenticado (para sync inmediato de frontend)
app.get('/api/users/me', async (c) => {
  const payload = c.get('jwtPayload')
  if (!payload) {
    return c.json({ error: 'No autenticado' }, 401)
  }
  try {
    const res = await pool.query('SELECT raw_user_meta_data FROM auth.users WHERE id = $1', [payload.sub])
    if (res.rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }
    const meta = res.rows[0].raw_user_meta_data || {}
    return c.json({
      role: meta.role || '',
      name: meta.full_name || '',
      company: meta.company || ''
    })
  } catch (err) {
    console.error('[API USERS] Error obteniendo perfil /me:', err.message)
    return c.json({ error: 'Error del servidor', details: err.message }, 500)
  }
})

// 2. Listar representantes
app.get('/api/users', async (c) => {
  try {
    const res = await pool.query(`
      SELECT 
        id, 
        email, 
        created_at, 
        deleted_at,
        raw_user_meta_data
      FROM auth.users 
      ORDER BY created_at DESC
    `)
    const list = res.rows.map(row => ({
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      deleted_at: row.deleted_at,
      name: row.raw_user_meta_data?.full_name || '',
      role: row.raw_user_meta_data?.role || '',
      company: row.raw_user_meta_data?.company || ''
    }))
    return c.json({ data: list })
  } catch (err) {
    console.error('[API USERS] Error listando usuarios:', err.message)
    return c.json({ error: 'Error al listar usuarios', details: err.message }, 500)
  }
})

// 2. Crear representante
app.post('/api/users', async (c) => {
  try {
    const { email, password, name, role, company } = await c.req.json()
    if (!email || !password || !name || !role) {
      return c.json({ error: 'Faltan campos obligatorios (email, password, name, role)' }, 400)
    }

    // Insertar en auth.users usando pgcrypto
    const metadata = JSON.stringify({
      full_name: name,
      role: role,
      company: company || 'Laboratorios Sophia S.A.'
    })

    const query = `
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, recovery_sent_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new,
        phone, phone_confirmed_at, phone_change, phone_change_token,
        email_change_token_current, email_change_confirm_status,
        banned_until, reauthentication_token, reauthentication_sent_at,
        is_super_admin, confirmed_at, is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf', 10)),
        NOW(), NULL, NULL,
        '{"provider": "email", "providers": ["email"]}'::jsonb, $3::jsonb, NOW(), NOW(),
        '', '', '',
        NULL, NULL, '', '',
        '', 0,
        NULL, '', NULL,
        FALSE, NOW(), FALSE
      ) RETURNING id;
    `
    const res = await pool.query(query, [email.toLowerCase().trim(), password, metadata])
    return c.json({ success: true, userId: res.rows[0].id })
  } catch (err) {
    console.error('[API USERS] Error creando usuario:', err.message)
    return c.json({ error: 'Error al crear usuario (el correo podría estar ya registrado)', details: err.message }, 500)
  }
})

// 3. Editar representante
app.put('/api/users/:id', async (c) => {
  const userId = c.req.param('id')
  try {
    const { name, role, company, password } = await c.req.json()
    if (!name || !role) {
      return c.json({ error: 'Faltan campos obligatorios (name, role)' }, 400)
    }

    // Obtener metadatos actuales para combinarlos
    const userRes = await pool.query('SELECT raw_user_meta_data FROM auth.users WHERE id = $1', [userId])
    if (userRes.rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    const currentMeta = userRes.rows[0].raw_user_meta_data || {}
    const updatedMeta = JSON.stringify({
      ...currentMeta,
      full_name: name,
      role: role,
      company: company || currentMeta.company || 'Laboratorios Sophia S.A.'
    })

    if (password && password.trim() !== '') {
      // Actualizar metadatos y contraseña
      await pool.query(`
        UPDATE auth.users 
        SET 
          raw_user_meta_data = $1::jsonb,
          encrypted_password = crypt($2, gen_salt('bf', 10)),
          updated_at = NOW()
        WHERE id = $3
      `, [updatedMeta, password, userId])
    } else {
      // Solo actualizar metadatos
      await pool.query(`
        UPDATE auth.users 
        SET 
          raw_user_meta_data = $1::jsonb,
          updated_at = NOW()
        WHERE id = $2
      `, [updatedMeta, userId])
    }

    return c.json({ success: true })
  } catch (err) {
    console.error('[API USERS] Error actualizando usuario:', err.message)
    return c.json({ error: 'Error al actualizar usuario', details: err.message }, 500)
  }
})

// 4. Borrado lógico (soft delete) / Restauración
app.delete('/api/users/:id', async (c) => {
  const userId = c.req.param('id')
  const restore = c.req.query('restore') === 'true'
  try {
    if (restore) {
      // Restaurar usuario (remover deleted_at)
      await pool.query('UPDATE auth.users SET deleted_at = NULL, updated_at = NOW() WHERE id = $1', [userId])
      return c.json({ success: true, message: 'Usuario restaurado con éxito' })
    } else {
      // Borrado lógico (marcar con deleted_at)
      await pool.query('UPDATE auth.users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [userId])
      return c.json({ success: true, message: 'Usuario inhabilitado con éxito' })
    }
  } catch (err) {
    console.error('[API USERS] Error en borrado lógico de usuario:', err.message)
    return c.json({ error: 'Error al inhabilitar/restaurar usuario', details: err.message }, 500)
  }
})

// 5. Arranque del Servidor Hono
const port = Number(process.env.PORT) || 5005

serve({
  fetch: app.fetch,
  port: port
}, (info) => {
  console.log(`[INFO] Hono API iniciada de forma segura en http://localhost:${info.port}`)
})
