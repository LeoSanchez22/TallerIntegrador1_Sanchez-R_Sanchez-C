import { verify, decode, verifyWithJwks } from 'hono/jwt'
import crypto from 'crypto'
import dotenv from 'dotenv'

import path from 'path'
import { fileURLToPath } from 'url'

import { AUDIT_EVENTS, getClientIp, getUserAgent, logSecurityEvent, throttleAudit } from '../security/audit.js'
import { isAdminRole } from './rbac.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../../.env') }) // Raíz
dotenv.config({ path: path.resolve(__dirname, '../../.env') }) // Backend

/**
 * Rutas que operan SIN JWT (lista blanca estricta, coincidencia exacta).
 * • /api/security/auth-event → permite registrar intentos de login fallidos
 *   cuando aún no existe una sesión válida (RF-16).
 * • /model/upload → autenticado con el token estático de despliegue del propio handler.
 */
export const PUBLIC_PATHS = new Set([
  '/api/security/auth-event',
  '/model/upload'
])

// Caché y referencias en memoria para rendimiento óptimo
let cryptoKeyBase64 = null
let cryptoKeyPlain = null
let cachedJwksKeys = null

// Usuarios a los que ya se les dejó constancia de que no tienen zona asignada.
const zoneWarningIssued = new Set()

/**
 * Inicializa las claves criptográficas simétricas para validación HS256
 */
async function initCryptoKeys() {
  const secretStr = process.env.SUPABASE_JWT_SECRET
  if (!secretStr) return
  
  // 1. Clave decodificada de Base64 (Estándar de Supabase Cloud)
  try {
    const rawKey = Buffer.from(secretStr, 'base64')
    cryptoKeyBase64 = await crypto.webcrypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    console.log("[JWT AUTH] Clave simétrica Base64 importada con éxito.")
  } catch (e) {
    console.error("[JWT AUTH] Error importando clave Base64:", e.message)
  }

  // 2. Clave como String Plano (Soporte legacy y pruebas locales)
  try {
    const rawKey = new TextEncoder().encode(secretStr)
    cryptoKeyPlain = await crypto.webcrypto.subtle.importKey(
      "raw",
      rawKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    )
    console.log("[JWT AUTH] Clave simétrica de respaldo importada con éxito.")
  } catch (e) {
    console.error("[JWT AUTH] Error importando clave plana:", e.message)
  }
}

/**
 * Recupera y cachea las llaves JWKS públicas de tu instancia de Supabase
 */
async function getSupabaseJwksKeys(jwksUri) {
  if (cachedJwksKeys) return cachedJwksKeys
  try {
    const response = await fetch(jwksUri)
    if (response.ok) {
      const data = await response.json()
      if (data && data.keys) {
        cachedJwksKeys = data.keys
        console.log("[JWT AUTH] Llaves JWKS públicas de Supabase cacheadas en memoria.")
        return cachedJwksKeys
      }
    }
  } catch (e) {
    console.error("[JWT AUTH] Error obteniendo llaves JWKS de Supabase:", e.message)
  }
  return null
}

/**
 * Middleware Modular de Autenticación JWT para proteger la API (RNF-04).
 * Además construye el contexto de autorización (`authz`) usado por RBAC (RF-11)
 * y por el alcance por zona comercial (RNF-12).
 */
export async function authMiddleware(c, next) {
  // Rutas de la lista blanca: continúan sin token (validan en su propio handler).
  if (PUBLIC_PATHS.has(c.req.path)) {
    return await next()
  }

  const secretStr = process.env.SUPABASE_JWT_SECRET
  if (!secretStr) {
    console.error("[JWT AUTH] CRÍTICO: SUPABASE_JWT_SECRET no definido en el archivo .env.");
    return c.json({ 
      error: "Error de configuración", 
      details: "Configuración del servidor incompleta (falta JWT Secret en el Backend)" 
    }, 500);
  }

  // Asegurar que las llaves simétricas estén listas
  if (!cryptoKeyBase64 && !cryptoKeyPlain) {
    await initCryptoKeys()
  }

  // Extraer token de la cabecera Authorization
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ 
      error: "No autorizado", 
      details: "Acceso denegado: Falta la cabecera de autenticación 'Authorization: Bearer <TOKEN>'" 
    }, 401);
  }
  const token = authHeader.split(' ')[1]

  let payload = null
  let errDetails = ""

  try {
    // 1. Decodificar la cabecera del token para determinar el algoritmo
    const decodedToken = decode(token)
    const alg = decodedToken?.header?.alg

    if (alg === 'ES256') {
      // Flujo Asimétrico (Sesiones de usuario activas de Supabase Auth)
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://azpwovaiicrkjxxvdjeq.supabase.co'
      const jwksUri = `${supabaseUrl}/auth/v1/.well-known/jwks.json`
      
      const keys = await getSupabaseJwksKeys(jwksUri)
      try {
        if (keys) {
          payload = await verifyWithJwks(token, {
            keys,
            allowedAlgorithms: ['ES256']
          })
        } else {
          // Fallback a descarga directa de JWKS si falló la caché
          payload = await verifyWithJwks(token, {
            jwks_uri: jwksUri,
            allowedAlgorithms: ['ES256']
          })
        }
        console.log("[JWT AUTH] Token ES256 verificado exitosamente mediante JWKS.")
      } catch (err) {
        errDetails = `ES256 Asimétrico: ${err.message || 'Firma no coincide'}`
      }
    } else {
      // Flujo Simétrico (HS256 - Anon, Service Role, Legacy keys)
      if (cryptoKeyBase64) {
        try {
          payload = await verify(token, cryptoKeyBase64, 'HS256')
          console.log("[JWT AUTH] Token HS256 verificado con clave Base64.")
        } catch (err) {
          errDetails = `HS256 Base64: ${err.message || 'Firma no coincide'}`
        }
      }

      if (!payload && cryptoKeyPlain) {
        try {
          payload = await verify(token, secretStr, 'HS256')
          console.log("[JWT AUTH] Token HS256 verificado con clave string plano.")
        } catch (err) {
          errDetails = errDetails ? `${errDetails} | HS256 Plain: ${err.message}` : `HS256 Plain: ${err.message}`
        }
      }
    }
  } catch (decodeErr) {
    errDetails = `Error decodificando estructura JWT: ${decodeErr.message || 'Token mal formado'}`
  }

  if (!payload) {
    console.error(`[JWT AUTH] Acceso denegado: ${errDetails}`)
    // RF-16: todo token con firma inválida queda registrado con IP y sello temporal.
    if (throttleAudit(`invalid-token:${getClientIp(c)}`, 20, 5 * 60 * 1000)) {
      await logSecurityEvent({
        eventType: AUDIT_EVENTS.INVALID_TOKEN,
        severity: 'warning',
        userEmail: payload?.email,
        ip: getClientIp(c),
        userAgent: getUserAgent(c),
        method: c.req.method,
        resource: c.req.path,
        statusCode: 401,
        details: { motivo: errDetails.slice(0, 180) }
      })
    }
    return c.json({ 
      error: "No autorizado", 
      details: `La firma del token no es válida o ha expirado. (${errDetails})` 
    }, 401);
  }

  // 2. Verificar en la base de datos si el usuario ha sido eliminado lógicamente (deleted_at no nulo)
  let realTimeRole = null
  let realTimeZone = null
  try {
    const { pool } = await import('../config/db.js')
    const userRes = await pool.query('SELECT deleted_at, raw_user_meta_data FROM auth.users WHERE id = $1', [payload.sub])
    if (userRes.rows.length > 0) {
      const dbUser = userRes.rows[0]
      if (dbUser.deleted_at !== null) {
        console.warn(`[JWT AUTH] Intento de acceso de usuario bloqueado/eliminado lógicamente: ${payload.email}`)
        await logSecurityEvent({
          eventType: AUDIT_EVENTS.UNAUTHORIZED_ACCESS,
          severity: 'critical',
          userId: payload.sub,
          userEmail: payload.email,
          ip: getClientIp(c),
          userAgent: getUserAgent(c),
          method: c.req.method,
          resource: c.req.path,
          statusCode: 401,
          details: { motivo: 'cuenta_inhabilitada_o_eliminada_logicamente' }
        })
        return c.json({
          error: "No autorizado",
          details: "Tu cuenta ha sido inhabilitada o eliminada lógicamente."
        }, 401)
      }
      realTimeRole = dbUser.raw_user_meta_data?.role || null
      realTimeZone = dbUser.raw_user_meta_data?.zona_comercial || dbUser.raw_user_meta_data?.zone || null
    }
  } catch (dbErr) {
    console.error(`[JWT AUTH] Error verificando soft delete en base de datos:`, dbErr.message)
  }

  // 3. Contexto de autorización (RF-11 RBAC + RNF-12 alcance por zona)
  const metaRole = payload.user_metadata?.role || payload.raw_user_meta_data?.role || payload.role
  const role = isAdminRole(realTimeRole) ? 'admin' : (isAdminRole(metaRole) ? 'admin' : 'representante')
  const zone = realTimeZone || payload.user_metadata?.zona_comercial || payload.raw_user_meta_data?.zona_comercial || null

  c.set('authz', {
    userId: payload.sub,
    email: payload.email || null,
    role,
    zone: zone ? String(zone).trim().toUpperCase() : null
  })

  // RNF-12: un representante sin zona asignada no tiene restricción de alcance.
  // Se deja constancia del evento (una sola vez por sesión) para su remediación.
  if (role !== 'admin' && !zone && throttleAudit(`scope-unassigned:${payload.sub}`, 1, 60 * 60 * 1000)) {
    await logSecurityEvent({
      eventType: AUDIT_EVENTS.ZONE_SCOPE_UNASSIGNED,
      severity: 'warning',
      userId: payload.sub,
      userEmail: payload.email,
      userRole: role,
      ip: getClientIp(c),
      resource: c.req.path,
      details: {
        impacto: 'sin_zona_comercial_asignada',
        accion: 'el representante consulta historiales de todas las zonas hasta que un administrador asigne zona_comercial'
      }
    })
  }

  // 4. Inyectar el payload de usuario en el contexto del endpoint para consumo interno
  c.set('jwtPayload', payload)
  return await next()
}

export { isAdminRole }
