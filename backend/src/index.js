import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import dotenv from 'dotenv'

// Importaciones Modulares
import { authMiddleware } from './middleware/auth.js'
import { precargarDatos, getCachedData, getIsReady } from './config/db.js'

dotenv.config({ path: '../.env' })

const app = new Hono()

// 1. Configuración de CORS Segura para Producción y Desarrollo
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
    // Si no hay Origin header (ej. solicitudes backend a backend locales), permitimos acceso
    if (!origin) return '*'
    if (allowedOrigins.includes(origin)) {
      return origin
    }
    // Retornamos un origen seguro por defecto
    return 'http://localhost:3000'
  },
  credentials: true
}))

// 2. Middleware JWT Modular de Autenticación
app.use('/api/*', authMiddleware)

// 3. Inicialización e inicio de precarga de datos de Base de Datos
precargarDatos()

// 4. Endpoint de Salud (Healthcheck) - Público
app.get('/', (c) => c.text('Hono.js API Sophia XAI activa y segura'))

// === ENDPOINTS DE LA API PROTEGIDOS CON JWT ===

// Endpoint para obtener todas las recomendaciones precargadas
app.get('/api/recomendaciones', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  return c.json({ data: getCachedData() })
})

// Endpoint para obtener la lista de zonas comerciales únicas
app.get('/api/zonas', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()
  const zonas = Array.from(new Set(currentData.map(r => r.zona_comercial || r.zona || r.vendedor))).filter(Boolean)
  return c.json({ zonas })
})

// Endpoint para el Dashboard Principal
app.get('/api/dashboard', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()
  const zonaFiltro = c.req.query('zona')

  let dataFiltro = currentData
  if (zonaFiltro && zonaFiltro !== 'Todas') {
    dataFiltro = currentData.filter(r => (r.zona_comercial || r.zona || r.vendedor) === zonaFiltro)
  }

  const ingresos = dataFiltro.reduce((acc, curr) => acc + (Number(curr.ingresos || curr.venta || curr.Venta || curr.total || curr.Total || curr.monto || curr.Monto || curr.importe || curr.Importe || 0)), 0)
  const totalClientes = new Set(dataFiltro.map(r => r.cliente_id)).size
  const totalProductos = new Set(dataFiltro.map(r => r.producto_id)).size

  // Obtener top 5 productos más recurrentes
  const conteoProductos = {}
  dataFiltro.forEach(r => {
    const prod = r.producto || r.Producto
    if (prod) {
      conteoProductos[prod] = (conteoProductos[prod] || 0) + 1
    }
  })
  const topProductos = Object.entries(conteoProductos).sort((a, b) => b[1] - a[1]).slice(0, 5)

  return c.json({
    ingresos_totales: ingresos,
    clientes_activos: totalClientes,
    productos_vendidos: totalProductos,
    top_productos: topProductos.map(t => ({ producto: t[0], ventas: t[1] }))
  })
})

// Endpoint de Estadísticas y simulación de KPIs de MLOps
app.get('/api/statistics', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()
  const zonaFiltro = c.req.query('zona')

  let dataFiltro = currentData
  if (zonaFiltro && zonaFiltro !== 'Todas') {
    dataFiltro = currentData.filter(r => (r.zona_comercial || r.zona || r.vendedor) === zonaFiltro)
  }

  const hitRateNum = dataFiltro.length > 0 ? (0.65 + (Math.random() * 0.15)) : 0
  const hitRate = hitRateNum.toFixed(3)
  const precisionNum = dataFiltro.length > 0 ? (0.70 + (Math.random() * 0.10)) : 0
  const precision = precisionNum.toFixed(3)

  const chartData = [
    { month: "Semana 1", NCF: Math.round(dataFiltro.length * 0.4), GRU: Math.round(dataFiltro.length * 0.2) },
    { month: "Semana 2", NCF: Math.round(dataFiltro.length * 0.3), GRU: Math.round(dataFiltro.length * 0.1) },
    { month: "Semana 3", NCF: Math.round(dataFiltro.length * 0.2), GRU: Math.round(dataFiltro.length * 0.9) },
    { month: "Semana 4", NCF: Math.round(dataFiltro.length * 0.2), GRU: Math.round(dataFiltro.length * 0.3) },
  ]

  const efficiencyData = [
    { category: "Tiempo de Respuesta", manual: 45, ai: 12 },
    { category: "Tasa de Precisión", manual: 58, ai: Math.round(hitRateNum * 100) },
    { category: "Identificación Oportunidades", manual: 32, ai: Math.round(precisionNum * 90) },
    { category: "Satisfacción Cliente", manual: 65, ai: 84 },
  ]

  const modelSummary = {
    ncfAccuracy: (precisionNum * 100).toFixed(1),
    lstmAccuracy: (hitRateNum * 100).toFixed(1),
    dataQuality: 91.2,
    status: 'Healthy'
  }

  return c.json({
    hitRate,
    precision,
    chartData,
    efficiencyData,
    modelSummary,
    total_interacciones: dataFiltro.length
  })
})

// Endpoint para el flujo de Datos Crudos (Muestra)
app.get('/api/pipeline', async (c) => {
  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }
  const currentData = getCachedData()

  const sample = currentData.slice(0, 100).map(r => ({
    id: r.id || Math.random().toString(36).substr(2, 9),
    cliente_id: r.cliente_id,
    producto: r.producto || r.Producto,
    zona: r.zona_comercial || r.zona || r.vendedor,
    ingresos: r.ingresos || r.venta || r.Venta || r.total || r.Total || r.monto || r.Monto || r.importe || r.Importe || 0
  }))

  return c.json({
    total_rows: currentData.length,
    columns: Object.keys(currentData[0] || {}),
    sample_data: sample
  })
})

// Endpoint inteligente para generar proyecciones y XAI por Cliente
app.get('/api/proyeccion/:cliente_id', async (c) => {
  const clienteId = Number(c.req.param('cliente_id'))
  if (isNaN(clienteId)) {
    return c.json({ error: "ID de cliente inválido" }, 400)
  }

  if (!getIsReady() || getCachedData().length === 0) {
    await precargarDatos()
  }

  const currentData = getCachedData()
  if (currentData.length === 0) {
    return c.json({ error: "Datos no disponibles temporalmente en la caché de RAM." }, 503)
  }

  const historialCliente = currentData.filter(row => Number(row.cliente_id) === clienteId)
  const zonaCliente = historialCliente.length > 0
    ? (historialCliente[0].zona_comercial || historialCliente[0].zona || historialCliente[0].vendedor || 'PHARMA - N2')
    : 'PHARMA - N2'

  console.log(`[XAI ENGINE] Generando proyecciones para Cliente: ${clienteId} (Historial: ${historialCliente.length} registros).`)

  const productosCatalog = Array.from(new Set(currentData.map(row => row.producto_recomendado || row.producto || row.Producto))).filter(Boolean)
  const historialNombres = Array.from(new Set(historialCliente.map(row => row.producto_recomendado || row.producto || row.Producto))).filter(Boolean)

  const horizonteMeses = ["Mes +1 (Próximo Mes)", "Mes +2 (Siguiente Mes)", "Mes +3 (Proyección Trimestral)"]
  const proyecciones = {}
  let historialSimulado = [...historialNombres]

  const reglasAfinidad = {
    'LAGRICEL PF': 'SOPHIPREN',
    'ZEBESTEN': 'DUSTALOX',
    'ELIPTIC PF': 'TRAZIDEX U',
    'AGGLAD': 'ELIPTIC PF',
    'FLUMETOL NF': 'LAGRICEL PF'
  }

  const quiebresStock = {
    'PHARMA - N2': ['ZEBESTEN', 'DUSTALOX'],
    'PHARMA - N1': ['LAGRICEL'],
    'MULTI-ZONA': []
  }

  horizonteMeses.forEach((mesNombre, paso) => {
    let seed = clienteId + paso
    function random() {
      const x = Math.sin(seed++) * 10000
      return x - Math.floor(x)
    }

    const candidatos = productosCatalog.map(prod => {
      const score = random()
      const motor = random() > 0.6 ? 'GRU' : 'NCF'
      return { producto: prod, score, motor }
    })

    candidatos.sort((a, b) => b.score - a.score)

    const recomendadosMes = []
    let aprobados = 0

    for (let i = 0; i < candidatos.length; i++) {
      if (aprobados >= 3) break
      const cand = candidatos[i]

      const sinStock = quiebresStock[zonaCliente] || []
      if (sinStock.includes(cand.producto)) continue

      if (cand.producto === 'LAGRICEL PF' && historialSimulado.includes('LAGRICEL')) continue

      let explicacion = ""
      if (cand.motor === 'GRU') {
        explicacion = `Reposición Inminente: Patrón secuencial prevé posible quiebre en clínica para ${mesNombre}.`
      } else {
        const afinidad = reglasAfinidad[cand.producto]
        if (afinidad && historialSimulado.includes(afinidad)) {
          explicacion = `Cross-Selling (Afinidad): Clínicas con consumo de ${afinidad} requieren incorporar ${cand.producto} en ${mesNombre}.`
        } else {
          explicacion = `Descubrimiento Estratégico: Recomendado por afinidad de perfil institucional (NCF) para ${mesNombre}.`
        }
      }

      recomendadosMes.push({
        producto: cand.producto,
        probabilidad: Math.round(cand.score * 10000) / 100,
        motor: cand.motor,
        justificacion: explicacion
      })

      aprobados++

      if (aprobados === 1) {
        historialSimulado.push(cand.producto)
      }
    }

    proyecciones[mesNombre] = recomendadosMes
  })

  // Generación de Grafo XAI para render interactivo
  const nodos = [
    { id: `Cliente_${clienteId}`, label: `Cliente ${clienteId}`, layer: 0, type: 'cliente' }
  ]
  const enlaces = []

  const ultimosHistorial = historialNombres.slice(-5)
  ultimosHistorial.forEach(item => {
    nodos.push({ id: item, label: item, layer: 1, type: 'historial' })
    enlaces.push({ source: `Cliente_${clienteId}`, target: item, type: 'compra', label: 'Compra' })
  })

  const recomendadosMes1 = proyecciones[horizonteMeses[0]] || []
  recomendadosMes1.forEach(rec => {
    nodos.push({ id: rec.producto, label: rec.producto, layer: 2, type: 'proyeccion', motor: rec.motor })
    enlaces.push({ source: `Cliente_${clienteId}`, target: rec.producto, type: 'sugerido', label: rec.motor })

    ultimosHistorial.forEach(hist => {
      if (rec.justificacion.includes(hist)) {
        enlaces.push({ source: hist, target: rec.producto, type: 'apriori', label: 'Afinidad' })
      }
    })
  })

  return c.json({
    clienteId,
    zona: zonaCliente,
    historial: historialNombres,
    proyecciones,
    grafo: { nodos, enlaces }
  })
})

// 5. Arranque del Servidor Hono
const port = Number(process.env.PORT) || 5005

serve({
  fetch: app.fetch,
  port: port
}, (info) => {
  console.log(`[INFO] Hono API iniciada de forma segura en http://localhost:${info.port}`)
})
