import pg from 'pg'
import dotenv from 'dotenv'

dotenv.config({ path: '../.env' }) // Intenta cargar desde la raíz del proyecto
dotenv.config() // Si no lo encuentra, intenta desde la carpeta backend/

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

// 2. Cargador de datos en caché de RAM para altísimo rendimiento de la API
export async function precargarDatos() {
  console.log("[DB CACHE] Precargando datos de Supabase PostgreSQL a la RAM...")
  try {
    const client = await pool.connect()
    const resCompras = await client.query("SELECT * FROM ventas_detalle")
    cachedData = resCompras.rows
    client.release()
    isReady = true
    console.log(`[DB CACHE] ¡Carga exitosa! ${cachedData.length} registros cargados en memoria RAM.`)
    return true
  } catch (err) {
    console.error("[DB CACHE] Error conectando con Supabase PostgreSQL:", err.message)
    console.log("[DB CACHE] Alerta: Iniciando en modo offline. Se reintentará la conexión bajo demanda.")
    return false
  }
}

// 3. Getters para acceder al estado y datos de forma segura
export function getCachedData() {
  return cachedData
}

export function getIsReady() {
  return isReady
}

export { pool }
