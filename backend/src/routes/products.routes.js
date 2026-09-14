import { Hono } from 'hono'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { exec } from 'child_process'
import { getPythonBin } from '../utils/python.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const productsRouter = new Hono()
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

// 1. Obtener catálogo de nuevos lanzamientos
productsRouter.get('/nuevos', async (c) => {
  try {
    const response = await fetch(`${FASTAPI_URL}/api/productos/nuevos`)
    if (response.ok) {
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
  const nombre = c.req.param('nombre')
  
  try {
    const response = await fetch(`${FASTAPI_URL}/api/productos/similitud/${encodeURIComponent(nombre)}`)
    if (response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    // Fallback CLI
  }

  return new Promise((resolve) => {
    const rootPath = path.resolve(__dirname, '../../../')
    const pythonBin = getPythonBin()
    const pythonCmd = `${pythonBin} src_py/get_similarity.py "${nombre}"`
    exec(pythonCmd, { cwd: rootPath }, (error, stdout, stderr) => {
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

// 3. Registrar un nuevo producto oftálmico
productsRouter.post('/registrar', async (c) => {
  const body = await c.req.json()
  const { nombre, sub_familia, indicacion, composicion, formato } = body

  if (!nombre || !sub_familia || !indicacion || !composicion || !formato) {
    return c.json({ error: "Faltan campos obligatorios" }, 400)
  }

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
    // Fallback CLI
  }

  return new Promise((resolve) => {
    const rootPath = path.resolve(__dirname, '../../../')
    const pythonBin = getPythonBin()
    const pythonCmd = `${pythonBin} src_py/register_product.py "${nombre}" "${sub_familia}" "${indicacion}" "${composicion}" "${formato}"`
    exec(pythonCmd, { cwd: rootPath }, (error, stdout, stderr) => {
      if (error) {
        return resolve(c.json({ error: "No se pudo registrar en la base local", details: stderr }, 500))
      }
      return resolve(c.json({ success: true, producto: { nombre, sub_familia, indicacion, composicion, formato, es_nuevo: true } }))
    })
  })
})

// 4. Carga masiva de catálogo (Excel/CSV Bulk)
productsRouter.post('/bulk', async (c) => {
  try {
    const body = await c.req.json()
    const lista = Array.isArray(body) ? body : (body.productos || [])
    if (!Array.isArray(lista) || lista.length === 0) {
      return c.json({ error: "La lista de productos está vacía o no es válida" }, 400)
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
      const nombre = (prod.nombre || '').trim().toUpperCase()
      if (!nombre) continue

      metadataExistente[nombre] = {
        sub_familia: prod.sub_familia || 'Línea Oftalmológica',
        indicacion: prod.indicacion || '',
        composicion: prod.composicion || '',
        formato: prod.formato || 'SUSPENSIÓN OFTÁLMICA',
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

    return c.json({ success: true, count: insertCount, message: `Se importaron ${insertCount} productos exitosamente.` })
  } catch (err) {
    return c.json({ error: 'Error al procesar carga masiva', details: err.message }, 500)
  }
})

export { productsRouter }
