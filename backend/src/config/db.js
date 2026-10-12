import pg from 'pg'
import dotenv from 'dotenv'

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../../.env') }) // Raíz
dotenv.config({ path: path.resolve(__dirname, '../../.env') }) // Backend

// 1. Configuración del Pool de Conexión a PostgreSQL (RNF-11 · cifrado en tránsito)
// La cadena de conexión de Supabase viaja siempre por TLS. La verificación del
// certificado del servidor está ACTIVADA por defecto (rechazo de cadenas no
// confiables / MITM). Solo puede desactivarse explícitamente para depuración
// local mediante PG_SSL_REJECT_UNAUTHORIZED=false.
const rejectUnauthorized = process.env.PG_SSL_REJECT_UNAUTHORIZED
  ? process.env.PG_SSL_REJECT_UNAUTHORIZED === 'true'
  : true

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: rejectUnauthorized
    ? { rejectUnauthorized: true, ca: process.env.PG_SSL_CA || undefined }
    : { rejectUnauthorized: false }
})

if (!rejectUnauthorized) {
  console.warn('[DB TLS] ADVERTENCIA: PG_SSL_REJECT_UNAUTHORIZED=false desactiva la verificación del certificado TLS. Usa esto únicamente en desarrollo local.')
}

let cachedData = []
let isReady = false

import fs from 'fs'

// 2. Cargador de datos en caché de RAM para altísimo rendimiento de la API
export async function precargarDatos() {
  console.log("[DB CACHE] Precargando datos de Supabase PostgreSQL a la RAM...")
  try {
    if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("tu_contraseña")) {
      const client = await pool.connect()
      const resCompras = await client.query("SELECT * FROM ventas_detalle")
      cachedData = resCompras.rows
      client.release()
      isReady = true
      console.log(`[DB CACHE] ¡Carga exitosa! ${cachedData.length} registros cargados en memoria RAM desde PostgreSQL.`)
      return true
    }
  } catch (err) {
    console.error("[DB CACHE] Error conectando con Supabase PostgreSQL:", err.message)
    if (/certificate|self-signed|ssl/i.test(err.message || '')) {
      console.error("[DB CACHE] PISTA TLS: la verificación del certificado está activa (RNF-11). Si tu entorno local intercepta el TLS, define PG_SSL_REJECT_UNAUTHORIZED=false en el .env SOLO para desarrollo.")
    }
    console.log("[DB CACHE] Alerta: Iniciando en modo offline. Cargando dataset de respaldo...")
  }

function parseCsvLine(text) {
  const result = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(cur.trim().replace(/^"|"$/g, ''))
      cur = ''
    } else {
      cur += char
    }
  }
  result.push(cur.trim().replace(/^"|"$/g, ''))
  return result
}

  // Fallback a CSV local
  try {
    const csvCandidates = [
      path.resolve(__dirname, '../../../src_py/data/intermediate/compras_ctx.csv'),
      path.resolve(__dirname, '../../src_py/data/intermediate/compras_ctx.csv'),
      path.resolve(__dirname, '../../../src_py/data/compras_ctx.csv'),
      path.resolve(__dirname, '../../data/intermediate/compras_ctx.csv')
    ]
    for (const csvPath of csvCandidates) {
      if (fs.existsSync(csvPath)) {
        const content = fs.readFileSync(csvPath, 'utf-8')
        const lines = content.split('\n').filter(l => l.trim().length > 0)
        if (lines.length > 1) {
          const headers = parseCsvLine(lines[0])
          cachedData = lines.slice(1).map((line, idx) => {
            const values = parseCsvLine(line)
            const row = { id: idx + 1 }
            headers.forEach((h, i) => {
              row[h] = values[i] ?? ''
            })
            // Asegurar cliente_id numérico entero
            if (row.cliente_id !== undefined) {
              const parsedId = parseInt(row.cliente_id, 10)
              row.cliente_id = isNaN(parsedId) ? idx : parsedId
            }
            return row
          })
          isReady = true
          console.log(`[DB CACHE] ¡Carga offline exitosa! ${cachedData.length} registros cargados desde CSV.`)
          return true
        }
      }
    }
  } catch (csvErr) {
    console.error("[DB CACHE] Error cargando fallback CSV:", csvErr.message)
  }
  return false
}

// 3. Getters para acceder al estado y datos de forma segura
export function getCachedData() {
  return cachedData
}

export function getIsReady() {
  return isReady
}

export { pool }
