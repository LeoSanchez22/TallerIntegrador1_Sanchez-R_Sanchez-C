import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import { authMiddleware, PUBLIC_PATHS } from './middleware/auth.js'
import { rbacMiddleware } from './middleware/rbac.js'
import { rateLimit } from './middleware/rateLimit.js'
import { inputSanitizer } from './middleware/sanitize.js'
import { idleSessionGuard } from './middleware/idleSession.js'
import { AUDIT_EVENTS, getClientIp, logSecurityEvent } from './security/audit.js'
import { precargarDatos } from './config/db.js'

import { dashboardRouter } from './routes/dashboard.routes.js'
import { clientsRouter } from './routes/clients.routes.js'
import { recommendationsRouter } from './routes/recommendations.routes.js'
import { productsRouter } from './routes/products.routes.js'
import { forecastingRouter } from './routes/forecasting.routes.js'
import { modelRouter } from './routes/model.routes.js'
import { usersRouter } from './routes/users.routes.js'
import { auditRouter } from './routes/audit.routes.js'
import { consentRouter, securityRouter } from './routes/security.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = new Hono()

/* ===========================================================================
 * 1. CABECERAS DE SEGURIDAD (RNF-11 · cifrado e integridad en tránsito)
 *    HSTS fuerza HTTPS/TLS 1.2+ en el navegador; las demás mitigan clickjacking,
 *    sniffing MIME y fuga de información por cabeceras.
 * ========================================================================= */
app.use('/*', secureHeaders({
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
  xFrameOptions: 'DENY',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  crossOriginResourcePolicy: 'same-site',
  crossOriginOpenerPolicy: 'same-origin',
  permissionsPolicy: {
    camera: false,
    microphone: false,
    geolocation: false,
    payment: false
  },
  contentSecurityPolicy: {
    defaultSrc: ["'none'"],
    frameAncestors: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'none'"],
    scriptSrc: ["'none'"],
    styleSrc: ["'none'"],
    imgSrc: ["'none'"],
    connectSrc: ["'none'"],
    objectSrc: ["'none'"]
  }
}))

/* ===========================================================================
 * 2. CORS RESTRINGIDO (RNF-14)
 *    Solo los orígenes institucionales declarados obtienen cabeceras CORS.
 *    Un origen desconocido NO recibe Access-Control-Allow-Origin (denegación
 *    por defecto), evitando que scripts ajenos consuman el microservicio de IA.
 * ========================================================================= */
const defaultOrigins = [
  'http://localhost:3000',
  'http://localhost:3005',
  'http://localhost:5005',
  'http://localhost:5008',
  'http://localhost:5018',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3005',
  'http://127.0.0.1:5005',
  'https://tallerintegrador1.diegoproyectos.me:5002',
  'https://taller2.diegoproyectos.me:5002',
  'https://tallerintegrador1.diegoproyectos.me',
  'https://taller2.diegoproyectos.me'
]

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : defaultOrigins

app.use('/*', cors({
  origin: (origin) => {
    // Peticiones same-origin / directas (curl, rewrites de Next.js) no envían Origin.
    if (!origin) return null
    return allowedOrigins.includes(origin) ? origin : null
  },
  allowMethods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600,
  credentials: true
}))

/* ===========================================================================
 * 3. LIMITACIÓN DE TASA (RNF-14)
 *    Bucket estricto para autenticación y carga de modelos; general para la API.
 * ========================================================================= */
const { api: apiBucket, auth: authBucket, model: modelBucket } = getBucketDefaults()

app.use('/api/security/*', rateLimit({ name: 'auth', limit: authBucket.limit, windowMs: authBucket.windowMs }))
app.use('/model/*', rateLimit({ name: 'model', limit: modelBucket.limit, windowMs: modelBucket.windowMs }))
app.use('/api/*', rateLimit({
  name: 'api',
  limit: apiBucket.limit,
  windowMs: apiBucket.windowMs,
  skip: (c) => c.req.path.startsWith('/api/security/')
}))

/* ===========================================================================
 * 4. SANITIZACIÓN Y VALIDACIÓN DE ENTRADA (RNF-13)
 * ========================================================================= */
app.use('/api/*', inputSanitizer)

/* ===========================================================================
 * 5. AUTENTICACIÓN (RNF-04) + RBAC (RF-11) + SESIÓN POR INACTIVIDAD (RF-17)
 *    Toda la superficie /api/* y /model/* exige un JWT de Supabase Auth válido,
 *    salvo la lista blanca estricta PUBLIC_PATHS (coincidencia exacta).
 * ========================================================================= */
app.use('/api/*', authMiddleware)
app.use('/api/*', rbacMiddleware)
app.use('/api/*', idleSessionGuard)

app.use('/model/*', authMiddleware)
app.use('/model/*', rbacMiddleware)
app.use('/model/*', idleSessionGuard)

/* ===========================================================================
 * 6. INICIALIZACIÓN Y PRECARGA DE DATOS EN RAM
 * ========================================================================= */
precargarDatos()

/* ===========================================================================
 * 7. ENDPOINT DE SALUD (público)
 * ========================================================================= */
app.get('/', (c) => c.text('Hono.js API Sophia XAI activa y segura'))

/* ===========================================================================
 * 8. MONTAJE MODULAR DE RUTAS
 * ========================================================================= */
app.route('/model', modelRouter)
app.route('/api', dashboardRouter)
app.route('/api', recommendationsRouter)
app.route('/api/clientes', clientsRouter)
app.route('/api/productos', productsRouter)
app.route('/api/forecasting', forecastingRouter)
app.route('/api/model', modelRouter)
app.route('/api/users', usersRouter)
app.route('/api/security', securityRouter)
app.route('/api/consent', consentRouter)
app.route('/api/audit', auditRouter)

/* ===========================================================================
 * 9. MANEJO CENTRALIZADO DE ERRORES Y 404 (RF-16)
 * ========================================================================= */
app.notFound(async (c) => {
  return c.json({ error: 'Recurso no encontrado', details: `La ruta ${c.req.method} ${c.req.path} no existe.` }, 404)
})

app.onError(async (err, c) => {
  console.error('[API] Error no controlado:', err)
  await logSecurityEvent({
    eventType: AUDIT_EVENTS.UNAUTHORIZED_ACCESS,
    severity: 'critical',
    ip: getClientIp(c),
    method: c.req.method,
    resource: c.req.path,
    statusCode: 500,
    details: { tipo_error: err?.name || 'Error', mensaje: String(err?.message || '').slice(0, 180) }
  })
  return c.json({ error: 'Error interno del servidor', details: 'Ocurrió un error inesperado. El incidente quedó registrado en el log de auditoría.' }, 500)
})

function getBucketDefaults() {
  const parse = (name, fallback) => {
    const value = Number(process.env[name])
    return Number.isFinite(value) && value > 0 ? value : fallback
  }
  return {
    api: { limit: parse('RATE_LIMIT_API_MAX', 300), windowMs: parse('RATE_LIMIT_API_WINDOW_MS', 60 * 1000) },
    auth: { limit: parse('RATE_LIMIT_AUTH_MAX', 10), windowMs: parse('RATE_LIMIT_AUTH_WINDOW_MS', 5 * 60 * 1000) },
    model: { limit: parse('RATE_LIMIT_MODEL_MAX', 20), windowMs: parse('RATE_LIMIT_MODEL_WINDOW_MS', 60 * 1000) }
  }
}

export { app, PUBLIC_PATHS }
export default app
