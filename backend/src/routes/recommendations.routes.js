import { Hono } from 'hono'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFile } from 'child_process'
import { precargarDatos, getCachedData, getIsReady } from '../config/db.js'
import { getPythonBin } from '../utils/python.js'
import { callMlService } from '../utils/mlClient.js'
import {
  AUDIT_EVENTS,
  getClientIp,
  logSecurityEvent,
  logSimulationTrace,
  throttleAudit
} from '../security/audit.js'
import { checkResourceAccess, resolveZoneScope } from '../security/zoneScope.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const recommendationsRouter = new Hono()

// 1. Obtener todas las recomendaciones precargadas
recommendationsRouter.get('/recomendaciones', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  // RNF-12: un representante solo ve las transacciones de su zona comercial.
  const scopeZone = resolveZoneScope(c)
  const data = scopeZone
    ? getCachedData().filter(r => String(r.zona || r.zona_comercial || '').trim().toUpperCase() === scopeZone)
    : getCachedData()
  return c.json({ data })
})

/**
 * RF-14 · Trazabilidad inmutable de la simulación ejecutada: usuario, cliente,
 * producto recomendado y argumento comercial generado (XAI).
 */
async function trazarSimulacion(c, data, clienteId, source) {
  try {
    const ctx = c.get('authz') || {}
    const proyecciones = data?.proyecciones && typeof data.proyecciones === 'object' ? data.proyecciones : {}

    let recomendacionPrincipal = null
    for (const key of Object.keys(proyecciones)) {
      const lista = proyecciones[key]
      if (Array.isArray(lista) && lista.length > 0) {
        recomendacionPrincipal = { mes: key, ...lista[0] }
        break
      }
    }

    await logSimulationTrace({
      userId: ctx.userId,
      userEmail: ctx.email,
      userRole: ctx.role,
      clientId: clienteId,
      clientName: data?.cliente || data?.nombre_cliente || null,
      clientZone: data?.zona || data?.zona_comercial || null,
      recommendedProduct: recomendacionPrincipal?.producto || null,
      commercialArgument: recomendacionPrincipal?.justificacion || data?.argumento_comercial || null,
      source,
      ip: getClientIp(c),
      payload: {
        mes: recomendacionPrincipal?.mes || null,
        motor: recomendacionPrincipal?.motor || null,
        probabilidad: recomendacionPrincipal?.probabilidad ?? null,
        recomendaciones_totales: Object.values(proyecciones).reduce(
          (acc, lista) => acc + (Array.isArray(lista) ? lista.length : 0), 0
        )
      }
    })
  } catch (err) {
    console.error('[TRACE] No se pudo registrar la trazabilidad de la simulación:', err.message)
  }
}

/**
 * RNF-12: valida que el cliente consultado pertenezca a la zona del usuario.
 */
async function validarAlcanceCliente(c, clienteId) {
  const ctx = c.get('authz') || {}
  if (ctx.role === 'admin') return { allowed: true }

  let zonaCliente = null
  const cached = getCachedData().find(r => Number(r.cliente_id) === clienteId)
  if (cached) {
    zonaCliente = cached.zona || cached.zona_comercial || null
  } else {
    try {
      const { pool } = await import('../config/db.js')
      const res = await pool.query('SELECT zona FROM ventas_detalle WHERE cliente_id = $1 LIMIT 1', [clienteId])
      zonaCliente = res.rows[0]?.zona || null
    } catch (err) {
      // Sin base de datos no se puede determinar la zona del cliente.
    }
  }

  const access = checkResourceAccess(c, zonaCliente)
  if (!access.allowed) {
    if (throttleAudit(`zone-denied:${ctx.userId}:${clienteId}`, 10, 5 * 60 * 1000)) {
      await logSecurityEvent({
        eventType: AUDIT_EVENTS.UNAUTHORIZED_ACCESS,
        severity: 'warning',
        userId: ctx.userId,
        userEmail: ctx.email,
        userRole: ctx.role,
        ip: getClientIp(c),
        method: 'GET',
        resource: `/api/proyeccion/${clienteId}`,
        statusCode: 403,
        details: { zona_usuario: access.scopeZone, zona_cliente: access.resourceZone }
      })
    }
    return {
      allowed: false,
      response: c.json({
        error: 'Acceso denegado',
        details: `El cliente ${clienteId} pertenece a la zona comercial ${access.resourceZone} y tu perfil tiene asignada la zona ${access.scopeZone}.`
      }, 403)
    }
  }

  return { allowed: true }
}

// 2. Proyección y Explicación XAI por Cliente (RF-14 · RNF-12)
recommendationsRouter.get('/proyeccion/:cliente_id', async (c) => {
  const clienteId = Number(c.req.param('cliente_id'))
  if (isNaN(clienteId)) {
    return c.json({ error: "ID de cliente inválido" }, 400)
  }

  const alcance = await validarAlcanceCliente(c, clienteId)
  if (!alcance.allowed) {
    return alcance.response
  }

  // 1. Llamar a microservicio FastAPI (Primario) con clave de servicio y contexto
  //    de usuario para que aplique RBAC (RF-11) y trazabilidad (RF-14).
  try {
    const response = await callMlService(`/api/proyeccion/${clienteId}`, { authz: c.get('authz') })
    if (response && response.ok) {
      const data = await response.json()
      await trazarSimulacion(c, data, clienteId, 'fastapi')
      return c.json(data)
    }
  } catch (err) {
    console.log(`[HONO API] FastAPI offline (${err.message}). Ejecutando fallback CLI...`)
  }

  // 2. Fallback CLI: Ejecutar predict.py (sin shell: lista de argumentos)
  return new Promise((resolve) => {
    const pythonBin = getPythonBin()
    execFile(pythonBin, ['src_py/predict.py', String(clienteId)], { cwd: path.resolve(__dirname, '../../../') }, (error, stdout, stderr) => {
      if (error) {
        return resolve(c.json({ error: "Error en motor predictivo de respaldo", details: stderr }, 500))
      }
      try {
        const data = JSON.parse(stdout)
        trazarSimulacion(c, data, clienteId, 'cli_fallback')
        return resolve(c.json(data))
      } catch (parseErr) {
        return resolve(c.json({ error: "Error parseando respuesta de IA", details: parseErr.message }, 500))
      }
    })
  })
})

export { recommendationsRouter }
