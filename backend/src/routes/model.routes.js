import { Hono } from 'hono'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { exec, execFile } from 'child_process'
import { getPythonBin } from '../utils/python.js'
import { AUDIT_EVENTS, getClientIp, getUserAgent, logSecurityEvent } from '../security/audit.js'
import { callMlService } from '../utils/mlClient.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const modelRouter = new Hono()

// 1. Endpoint público seguro para subir el checkpoint del modelo .pt
modelRouter.post('/upload', async (c) => {
  const authHeader = c.req.header('Authorization')
  const uploadToken = process.env.MODEL_UPLOAD_TOKEN

  if (!uploadToken) {
    return c.json({ error: "Servidor no configurado para recibir actualizaciones de modelo" }, 500)
  }

  if (!authHeader || authHeader !== `Bearer ${uploadToken}`) {
    return c.json({ error: "No autorizado: Token de carga inválido o ausente" }, 401)
  }

  try {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!file || typeof file.arrayBuffer !== 'function') {
      return c.json({ error: "Petición inválida: Falta el archivo del modelo o formato incorrecto" }, 400)
    }

    if (file.size && file.size > 100 * 1024 * 1024) {
      return c.json({ error: "Petición inválida: El archivo supera el límite permitido de 100MB" }, 400)
    }

    const buffer = await file.arrayBuffer()
    const targetDir = path.resolve(__dirname, '../../../models')

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    const modelFilename = process.env.NODE_ENV === 'test' ? 'modelo_sophia_test.pt' : 'modelo_sophia_final.pt'
    const targetPath = path.join(targetDir, modelFilename)
    fs.writeFileSync(targetPath, Buffer.from(buffer))

    if (process.env.NODE_ENV !== 'test') {
      exec('pm2 reload sophia-fastapi', () => {})
    }

    // Trazabilidad: actualización del artefacto del modelo (RF-16)
    await logSecurityEvent({
      eventType: AUDIT_EVENTS.MODEL_UPDATED,
      severity: 'info',
      ip: getClientIp(c),
      userAgent: getUserAgent(c),
      method: 'POST',
      resource: '/model/upload',
      statusCode: 200,
      details: { archivo: modelFilename, bytes: file.size || 0, mecanismo: 'token_estatico_despliegue' }
    })

    return c.json({ success: true, message: "Modelo actualizado exitosamente en el servidor de despliegue" })
  } catch (err) {
    return c.json({ error: "Error interno al procesar el archivo en el servidor", details: err.message }, 500)
  }
})

// 2. Entrenar / Reentrenar modelo
modelRouter.post('/train', async (c) => {
  try {
    const response = await callMlService('/api/train', { method: 'POST', authz: c.get('authz') })
    if (response && response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    // Fallback CLI
  }

  const rootPath = path.resolve(__dirname, '../../../')
  const pythonBin = getPythonBin()
  // RNF-13: execFile sin shell evita cualquier vector de command injection.
  execFile(pythonBin, ['src_py/train.py'], { cwd: rootPath }, (error, stdout, stderr) => {
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

modelRouter.post('/retrain', async (c) => {
  return modelRouter.fetch(new Request(c.req.url.replace('/retrain', '/train'), c.req.raw))
})

// 3. Estado de entrenamiento
modelRouter.get('/train/status', async (c) => {
  try {
    const response = await callMlService('/api/train/status', { authz: c.get('authz') })
    if (response && response.ok) {
      const data = await response.json()
      return c.json(data)
    }
  } catch (err) {
    // Fallback
  }
  return c.json({
    is_training: false,
    logs: ["Microservicio FastAPI offline. Los logs en tiempo real están disponibles con servidor_front.py."]
  })
})

export { modelRouter }
