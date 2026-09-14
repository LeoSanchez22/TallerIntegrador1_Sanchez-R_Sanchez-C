import { Hono } from 'hono'
import { cors } from 'hono/cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

import { authMiddleware } from './middleware/auth.js'
import { precargarDatos } from './config/db.js'

import { dashboardRouter } from './routes/dashboard.routes.js'
import { clientsRouter } from './routes/clients.routes.js'
import { recommendationsRouter } from './routes/recommendations.routes.js'
import { productsRouter } from './routes/products.routes.js'
import { forecastingRouter } from './routes/forecasting.routes.js'
import { modelRouter } from './routes/model.routes.js'
import { usersRouter } from './routes/users.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = new Hono()

// 1. Configuración de CORS Segura
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      'http://localhost:3000',
      'http://localhost:3005',
      'http://localhost:5005',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3005',
      'http://127.0.0.1:5005'
    ]

app.use('/*', cors({
  origin: (origin) => {
    if (!origin) return '*'
    if (allowedOrigins.includes(origin)) {
      return origin
    }
    return 'http://localhost:3000'
  },
  credentials: true
}))

// 2. Middleware JWT de Autenticación para Rutas Protegidas
app.use('/api/*', authMiddleware)

// 3. Inicialización y Precarga de Datos en RAM
precargarDatos()

// 4. Endpoint de Salud
app.get('/', (c) => c.text('Hono.js API Sophia XAI activa y segura'))

// 5. Montaje Modular de Rutas
app.route('/model', modelRouter)
app.route('/api', dashboardRouter)
app.route('/api', recommendationsRouter)
app.route('/api/clientes', clientsRouter)
app.route('/api/productos', productsRouter)
app.route('/api/forecasting', forecastingRouter)
app.route('/api/model', modelRouter)
app.route('/api/users', usersRouter)

export { app }
export default app
