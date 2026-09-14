import pg from 'pg'
import dotenv from 'dotenv'

import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../../.env') }) // Raíz
dotenv.config({ path: path.resolve(__dirname, '../../.env') }) // Backend

// 1. Configuración del Pool de Conexión a PostgreSQL
// En entornos locales permitimos rejectUnauthorized en true/false según configuración,
// por defecto en desarrollo se mantiene flexible pero documentado para producción.
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Puede configurarse de forma estricta en producción
  }
})

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
    console.log("[DB CACHE] Alerta: Iniciando en modo offline. Cargando dataset de respaldo...")
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
          const headers = lines[0].split(',').map(h => h.trim())
          cachedData = lines.slice(1).map((line, idx) => {
            const values = line.split(',')
            const row = { id: idx + 1 }
            headers.forEach((h, i) => {
              row[h] = values[i]?.trim()
            })
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
