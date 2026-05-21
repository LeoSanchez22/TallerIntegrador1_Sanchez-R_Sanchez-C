import { verify, decode, verifyWithJwks } from 'hono/jwt'
import crypto from 'crypto'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' })

// Caché y referencias en memoria para rendimiento óptimo
let cryptoKeyBase64 = null
let cryptoKeyPlain = null
let cachedJwksKeys = null

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
 * Middleware Modular de Autenticación JWT para proteger la API
 */
export async function authMiddleware(c, next) {
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
    return c.json({ 
      error: "No autorizado", 
      details: `La firma del token no es válida o ha expirado. (${errDetails})` 
    }, 401);
  }

  // Injectar el payload de usuario en el contexto del endpoint para consumo interno
  c.set('jwtPayload', payload)
  return await next()
}
