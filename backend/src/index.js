import { serve } from '@hono/node-server'
import { app } from './app.js'

const port = Number(process.env.PORT) || 5005

if (process.env.NODE_ENV !== 'test') {
  serve({
    fetch: app.fetch,
    port: port
  }, (info) => {
    console.log(`[INFO] Hono API iniciada de forma segura en http://localhost:${info.port}`)
  })
}

export { app }
export default app
