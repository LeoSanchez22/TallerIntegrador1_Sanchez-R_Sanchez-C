import { Hono } from 'hono'
import path from 'path'
import { fileURLToPath } from 'url'
import { exec } from 'child_process'
import { precargarDatos, getCachedData, getIsReady } from '../config/db.js'
import { getPythonBin } from '../utils/python.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const recommendationsRouter = new Hono()
const FASTAPI_URL = process.env.FASTAPI_URL || 'http://127.0.0.1:8000'

// 1. Obtener todas las recomendaciones precargadas
recommendationsRouter.get('/recomendaciones', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  return c.json({ data: getCachedData() })
})

// 2. Proyección y Explicación XAI por Cliente
recommendationsRouter.get('/proyeccion/:cliente_id', async (c) => {
  const clienteId = Number(c.req.param('cliente_id'))
  if (isNaN(clienteId)) {
    return c.json({ error: "ID de cliente inválido" }, 400)
  }

  // 1. Llamar a microservicio FastAPI (Primario)
  try {
    const response = await fetch(`${FASTAPI_URL}/api/proyeccion/${clienteId}`)
    if (response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    console.log(`[HONO API] FastAPI offline (${err.message}). Ejecutando fallback CLI...`)
  }

  // 2. Fallback CLI: Ejecutar predict.py
  return new Promise((resolve) => {
    const pythonBin = getPythonBin()
    const pythonCmd = `${pythonBin} src_py/predict.py ${clienteId}`
    const rootPath = path.resolve(__dirname, '../../../')
    exec(pythonCmd, { cwd: rootPath }, (error, stdout, stderr) => {
      if (error) {
        return resolve(c.json({ error: "Error en motor predictivo de respaldo", details: stderr }, 500))
      }
      try {
        const data = JSON.parse(stdout)
        return resolve(c.json(data))
      } catch (parseErr) {
        return resolve(c.json({ error: "Error parseando respuesta de IA", details: parseErr.message }, 500))
      }
    })
  })
})

export { recommendationsRouter }
