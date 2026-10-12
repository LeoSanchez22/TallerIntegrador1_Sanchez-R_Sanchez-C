import { Hono } from 'hono'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { execFile } from 'child_process'
import { getPythonBin } from '../utils/python.js'
import { callMlService } from '../utils/mlClient.js'
import { AUDIT_EVENTS, getClientIp, getUserAgent, logSecurityEvent } from '../security/audit.js'
import { sanitizeText } from '../middleware/sanitize.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const productsRouter = new Hono()

// 1. Obtener catálogo de nuevos lanzamientos
productsRouter.get('/nuevos', async (c) => {
  try {
    const response = await callMlService(`/api/productos/nuevos`, { authz: c.get('authz') })
    if (response && response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    // Fallback directo a JSON
  }

  try {
    const rootPath = path.resolve(__dirname, '../../../')
    const rutaJson = path.join(rootPath, 'src_py/data/productos_metadata.json')
    if (fs.existsSync(rutaJson)) {
      const content = await fs.promises.readFile(rutaJson, 'utf-8')
      const data = JSON.parse(content)
      const lista = Object.keys(data).map(nombre => ({
        nombre,
        sub_familia: data[nombre].sub_familia,
        indicacion: data[nombre].indicacion,
        composicion: data[nombre].composicion,
        formato: data[nombre].formato,
      }))
      return c.json(lista)
    }
    return c.json([])
  } catch (err) {
    return c.json({ error: "No se pudieron obtener los productos nuevos", details: err.message }, 500)
  }
})

// 2. Similitud terapéutica de nuevos lanzamientos
productsRouter.get('/similitud/:nombre', async (c) => {
  // RNF-13: el parámetro viaja como argumento de lista (execFile), nunca se
  // interpola en una cadena de shell, por lo que no existe vector de inyección.
  const nombre = sanitizeText(c.req.param('nombre'), 160).trim()
  if (!nombre) {
    return c.json({ error: "Nombre de producto inválido" }, 400)
  }

  try {
    const response = await callMlService(`/api/productos/similitud/${encodeURIComponent(nombre)}`, { authz: c.get('authz') })
    if (response && response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    // Fallback CLI
  }

  return new Promise((resolve) => {
    const rootPath = path.resolve(__dirname, '../../../')
    const pythonBin = getPythonBin()
    execFile(pythonBin, ['src_py/get_similarity.py', nombre], { cwd: rootPath }, (error, stdout, stderr) => {
      if (error) {
        return resolve(c.json({ error: "No se pudo calcular la similitud en la base local", details: stderr }, 500))
      }
      try {
        const data = JSON.parse(stdout)
        return resolve(c.json(data))
      } catch (e) {
        return resolve(c.json({ error: "Respuesta inválida del CLI", details: stdout }, 500))
      }
    })
  })
})

// 3. Registrar un nuevo producto oftálmico (RF-11: alta exclusiva de administrador)
productsRouter.post('/registrar', async (c) => {
  const body = await c.req.json()
  const nombre = sanitizeText(body.nombre, 160).trim()
  const sub_familia = sanitizeText(body.sub_familia, 160).trim()
  const indicacion = sanitizeText(body.indicacion, 300).trim()
  const composicion = sanitizeText(body.composicion, 300).trim()
  const formato = sanitizeText(body.formato, 120).trim()

  if (!nombre || !sub_familia || !indicacion || !composicion || !formato) {
    return c.json({ error: "Faltan campos obligatorios" }, 400)
  }

  const payload = { nombre, sub_familia, indicacion, composicion, formato }

  try {
    const response = await callMlService(`/api/productos/registrar`, {
      method: 'POST',
      body: payload,
      authz: c.get('authz')
    })
    if (response && response.ok) {
      const data = await response.json()
      await registrarProductoAuditado(c, payload)
      return c.json(data)
    }
  } catch (err) {
    // Fallback CLI
  }

  return new Promise((resolve) => {
    const rootPath = path.resolve(__dirname, '../../../')
    const pythonBin = getPythonBin()
    execFile(pythonBin, [
      'src_py/register_product.py',
      nombre, sub_familia, indicacion, composicion, formato
    ], { cwd: rootPath }, (error, stdout, stderr) => {
      if (error) {
        return resolve(c.json({ error: "No se pudo registrar en la base local", details: stderr }, 500))
      }
      registrarProductoAuditado(c, payload)
      return resolve(c.json({ success: true, producto: { ...payload, es_nuevo: true } }))
    })
  })
})

/** RF-11 · Deja constancia en el log de auditoría de cada alta de producto. */
async function registrarProductoAuditado(c, payload) {
  const ctx = c.get('authz') || {}
  await logSecurityEvent({
    eventType: AUDIT_EVENTS.PRODUCT_CREATED,
    severity: 'info',
    userId: ctx.userId,
    userEmail: ctx.email,
    userRole: ctx.role,
    ip: getClientIp(c),
    userAgent: getUserAgent(c),
    method: 'POST',
    resource: '/api/productos/registrar',
    statusCode: 200,
    details: {
      producto: payload.nombre,
      sub_familia: payload.sub_familia,
      formato: payload.formato
    }
  })
}

// 4. Carga masiva de catálogo (Excel/CSV Bulk) — administrador
productsRouter.post('/bulk', async (c) => {
  try {
    const body = await c.req.json()
    const lista = Array.isArray(body) ? body : (body.productos || [])
    if (!Array.isArray(lista) || lista.length === 0) {
      return c.json({ error: "La lista de productos está vacía o no es válida" }, 400)
    }
    if (lista.length > 2000) {
      return c.json({ error: "Límite excedido", details: "Se admiten un máximo de 2000 productos por importación." }, 400)
    }

    const rootPath = path.resolve(__dirname, '../../../')
    const rutaJson = path.join(rootPath, 'src_py/data/productos_metadata.json')
    
    let metadataExistente = {}
    if (fs.existsSync(rutaJson)) {
      try {
        const raw = await fs.promises.readFile(rutaJson, 'utf-8')
        metadataExistente = JSON.parse(raw)
      } catch (err) {
        metadataExistente = {}
      }
    }

    let insertCount = 0
    for (const prod of lista) {
      const nombre = sanitizeText(prod.nombre || '', 160).trim().toUpperCase()
      if (!nombre) continue

      metadataExistente[nombre] = {
        sub_familia: sanitizeText(prod.sub_familia || 'Línea Oftalmológica', 160),
        indicacion: sanitizeText(prod.indicacion || '', 300),
        composicion: sanitizeText(prod.composicion || '', 300),
        formato: sanitizeText(prod.formato || 'SUSPENSIÓN OFTÁLMICA', 120),
        es_nuevo: true,
        fecha_registro: new Date().toISOString()
      }
      insertCount++
    }

    const dataDir = path.dirname(rutaJson)
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }
    await fs.promises.writeFile(rutaJson, JSON.stringify(metadataExistente, null, 2), 'utf-8')

    const ctx = c.get('authz') || {}
    await logSecurityEvent({
      eventType: AUDIT_EVENTS.PRODUCT_CREATED,
      severity: 'info',
      userId: ctx.userId,
      userEmail: ctx.email,
      userRole: ctx.role,
      ip: getClientIp(c),
      userAgent: getUserAgent(c),
      method: 'POST',
      resource: '/api/productos/bulk',
      statusCode: 200,
      details: { productos_importados: insertCount, modo: 'carga_masiva' }
    })

    return c.json({ success: true, count: insertCount, message: `Se importaron ${insertCount} productos exitosamente.` })
  } catch (err) {
    return c.json({ error: 'Error al procesar carga masiva', details: err.message }, 500)
  }
})

export { productsRouter }
