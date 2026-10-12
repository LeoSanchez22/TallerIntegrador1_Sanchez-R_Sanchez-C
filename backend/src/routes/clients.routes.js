import { Hono } from 'hono'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { pool, precargarDatos, getCachedData } from '../config/db.js'
import { AUDIT_EVENTS, getClientIp, logSecurityEvent, throttleAudit } from '../security/audit.js'
import { checkResourceAccess, enforceZoneParam } from '../security/zoneScope.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const clientsRouter = new Hono()

// 1. Listado completo de clientes con agregaciones comerciales (RNF-12)
clientsRouter.get('/list', async (c) => {
  try {
    const search = (c.req.query('search') || '').trim().toUpperCase()
    // RNF-12: el filtro de zona se fuerza al alcance del usuario autenticado;
    // un representante nunca puede ampliar su alcance cambiando el parámetro.
    const zonaFiltro = enforceZoneParam(c, c.req.query('zona'))

    let rows = []
    try {
      let query = `
        SELECT 
          CAST(cliente_id AS INTEGER) as cliente_id,
          MAX(cliente) as cliente,
          MAX(zona) as zona,
          MAX(vendedor) as vendedor,
          MIN(created_at) as created_at,
          COUNT(*) as total_transacciones,
          SUM(cantidad) as total_unidades,
          SUM(monto_cancelado) as total_monto,
          ARRAY_AGG(DISTINCT producto) as productos_consumidos
        FROM ventas_detalle
        WHERE cliente_id IS NOT NULL AND cliente_id >= 0 AND cliente_id < 10000
      `
      const params = []
      if (search) {
        params.push(`%${search}%`)
        query += ` AND (cliente ILIKE $${params.length} OR CAST(cliente_id AS TEXT) ILIKE $${params.length})`
      }
      if (zonaFiltro && zonaFiltro !== 'Todas') {
        params.push(zonaFiltro)
        query += ` AND zona = $${params.length}`
      }
      query += ` GROUP BY CAST(cliente_id AS INTEGER) ORDER BY cliente_id ASC`

      const res = await pool.query(query, params)
      rows = res.rows
    } catch (err) {
      console.warn('[API CLIENTES] Usando caché en RAM para listar clientes:', err.message)
      const data = getCachedData()
      const clientMap = new Map()
      data.forEach(r => {
        const rawCid = r.cliente_id
        if (rawCid === undefined || rawCid === null || rawCid === '') return
        const cid = parseInt(rawCid, 10)
        if (isNaN(cid) || cid < 0 || cid > 10000) return

        const cName = r.cliente || r.nombre_cliente || `Cliente ${cid}`
        let cZona = r.zona || r.zona_comercial || 'LIMA'
        if (cZona.startsWith('PHARMA')) cZona = 'LIMA'
        if (search && !cName.toUpperCase().includes(search) && !String(cid).includes(search)) return
        if (zonaFiltro && zonaFiltro !== 'Todas' && cZona !== zonaFiltro) return

        if (!clientMap.has(cid)) {
          clientMap.set(cid, {
            cliente_id: cid,
            cliente: cName,
            zona: cZona,
            vendedor: `PHARMA - ${cZona}`,
            created_at: r.created_at || new Date().toISOString(),
            total_transacciones: 0,
            total_unidades: 0,
            total_monto: 0,
            productos_consumidos: []
          })
        }
        const item = clientMap.get(cid)
        item.total_transacciones++
        item.total_unidades += Number(r.cantidad || 1)
        item.total_monto += Number(r.monto_cancelado || r.venta || 0)
        if (r.producto && !item.productos_consumidos.includes(r.producto)) {
          item.productos_consumidos.push(r.producto)
        }
      })
      rows = Array.from(clientMap.values()).sort((a, b) => b.cliente_id - a.cliente_id)
    }

    return c.json({ data: rows, total: rows.length })
  } catch (err) {
    console.error('[API CLIENTES] Error listando clientes:', err)
    return c.json({ error: 'Error al listar clientes', details: err.message }, 500)
  }
})

// 2. Detalle de tablas relacionales de cliente
clientsRouter.get('/detalle/:id', async (c) => {
  const cid = Number(c.req.param('id'))
  if (isNaN(cid)) return c.json({ error: 'ID de cliente inválido' }, 400)

  try {
    let clientName = ''
    let ventasDetalle = []
    let ventasBase = []
    let secuencias = []

    try {
      const client = await pool.connect()
      const resDet = await client.query('SELECT * FROM ventas_detalle WHERE cliente_id = $1 ORDER BY mes_num ASC, id ASC', [cid])
      ventasDetalle = resDet.rows
      if (ventasDetalle.length > 0) {
        clientName = ventasDetalle[0].cliente
      }

      if (clientName) {
        const resBase = await client.query('SELECT * FROM ventas_base WHERE cliente = $1 ORDER BY mes_num ASC, id ASC', [clientName])
        ventasBase = resBase.rows

        const resSec = await client.query('SELECT * FROM cliente_secuencias WHERE cliente = $1 ORDER BY id DESC', [clientName])
        secuencias = resSec.rows
      }
      client.release()
    } catch (dbErr) {
      ventasDetalle = getCachedData().filter(r => Number(r.cliente_id) === cid)
      if (ventasDetalle.length > 0) clientName = ventasDetalle[0].cliente
    }

    // RNF-12: verificación de alcance por zona comercial antes de exponer el detalle.
    const ctx = c.get('authz') || {}
    if (ctx.role !== 'admin') {
      const zonaCliente = ventasDetalle[0]?.zona || ventasDetalle[0]?.zona_comercial || null
      const access = checkResourceAccess(c, zonaCliente)
      if (!access.allowed) {
        if (throttleAudit(`zone-denied:${ctx.userId}:${cid}`, 10, 5 * 60 * 1000)) {
          await logSecurityEvent({
            eventType: AUDIT_EVENTS.UNAUTHORIZED_ACCESS,
            severity: 'warning',
            userId: ctx.userId,
            userEmail: ctx.email,
            userRole: ctx.role,
            ip: getClientIp(c),
            method: 'GET',
            resource: `/api/clientes/detalle/${cid}`,
            statusCode: 403,
            details: { zona_usuario: access.scopeZone, zona_cliente: access.resourceZone }
          })
        }
        return c.json({
          error: 'Acceso denegado',
          details: `El cliente ${cid} pertenece a la zona comercial ${access.resourceZone}; tu perfil tiene asignada la zona ${access.scopeZone}.`
        }, 403)
      }
    }

    return c.json({
      cliente_id: cid,
      cliente: clientName,
      ventas_detalle: ventasDetalle,
      ventas_base: ventasBase,
      cliente_secuencias: secuencias
    })
  } catch (err) {
    return c.json({ error: 'Error obteniendo detalle de cliente', details: err.message }, 500)
  }
})

// 3. Registrar nuevo cliente / institución con historial de consumo
clientsRouter.post('/registrar', async (c) => {
  try {
    const body = await c.req.json()
    const {
      nombre,
      ruc,
      zona,
      categoria,
      limite_credito,
      contacto,
      telefono,
      mes1_compras,
      mes2_compras,
      mes3_compras,
      mes1_items,
      mes2_items,
      mes3_items
    } = body

    if (!nombre || !zona) {
      return c.json({ error: "El nombre y la zona son obligatorios." }, 400)
    }

    const currentData = getCachedData()
    const existingIds = currentData.map(r => Number(r.cliente_id)).filter(id => !isNaN(id))
    const nextClienteId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 100

    const zonaFinal = (zona || 'LIMA CENTRO').toUpperCase().trim()
    const nombreFinal = nombre.trim().toUpperCase()

    const parseItems = (itemsRaw, comprasStr) => {
      if (Array.isArray(itemsRaw) && itemsRaw.length > 0) {
        return itemsRaw.map(it => {
          if (typeof it === 'string') return { producto: it.trim().toUpperCase(), cantidad: 10 }
          return {
            producto: (it.producto || it.nombre || '').trim().toUpperCase(),
            cantidad: Math.max(1, Number(it.cantidad) || 10)
          }
        }).filter(it => Boolean(it.producto))
      }
      if (comprasStr && typeof comprasStr === 'string' && comprasStr.trim()) {
        return comprasStr.split(/[,;\n]+/).map(s => ({
          producto: s.trim().toUpperCase(),
          cantidad: 10
        })).filter(it => Boolean(it.producto))
      }
      return [{ producto: 'SOPHIXAL OFTENO', cantidad: 10 }]
    }

    const m1 = parseItems(mes1_items, mes1_compras)
    const m2 = parseItems(mes2_items, mes2_compras)
    const m3 = parseItems(mes3_items, mes3_compras)

    const mesesData = [
      { mes_num: 1, mes_abbr: 'MES-1', mes_nombre: 'MES 1', items: m1 },
      { mes_num: 2, mes_abbr: 'MES-2', mes_nombre: 'MES 2', items: m2 },
      { mes_num: 3, mes_abbr: 'MES-3', mes_nombre: 'MES 3', items: m3 },
    ]

    const rootPath = path.resolve(__dirname, '../../../')
    const csvPath = path.join(rootPath, 'src_py/data/intermediate/compras_ctx.csv')

    // Inserción transaccional en PostgreSQL
    try {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')

        const resVDet = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM ventas_detalle')
        let curVDetId = Number(resVDet.rows[0].max_id)

        const resVBase = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM ventas_base')
        let curVBaseId = Number(resVBase.rows[0].max_id)

        const resCSec = await client.query('SELECT COALESCE(MAX(id), 0) as max_id FROM cliente_secuencias')
        let curCSecId = Number(resCSec.rows[0].max_id)

        const allProductsSeq = []

        for (const m of mesesData) {
          for (const item of m.items) {
            curVDetId++
            curVBaseId++
            allProductsSeq.push(item.producto)
            const monto = (item.cantidad * 35.00)

            await client.query(`
              INSERT INTO ventas_detalle (
                id, vendedor, cliente, producto, mes_num, mes_abbr, monto_cancelado, cantidad,
                zona_code, zona, is_return, is_payment_only, is_purchase, is_credit_delivery,
                sku, descripcion, mes_nombre, pct, py24, tgt, venta, cliente_id, producto_id, created_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14,
                $15, $16, $17, $18, $19, $20, $21, $22, $23, NOW()
              )
            `, [
              curVDetId,
              `PHARMA - ${zonaFinal}`,
              nombreFinal,
              item.producto,
              m.mes_num,
              m.mes_abbr,
              monto,
              item.cantidad,
              'Z1',
              zonaFinal,
              false,
              false,
              true,
              false,
              41500,
              `${item.producto} SUSPENSIÓN OFTÁLMICA`,
              m.mes_nombre,
              1.0,
              50000.0,
              50000.0,
              monto,
              nextClienteId,
              10
            ])

            await client.query(`
              INSERT INTO ventas_base (
                id, vendedor, cliente, producto, mes_num, mes_abbr, monto_cancelado, cantidad,
                zona_code, zona, is_return, is_payment_only, is_purchase, is_credit_delivery, created_at
              ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8,
                $9, $10, $11, $12, $13, $14, NOW()
              )
            `, [
              curVBaseId,
              `PHARMA - ${zonaFinal}`,
              nombreFinal,
              item.producto,
              m.mes_num,
              m.mes_abbr,
              monto,
              item.cantidad,
              'Z1',
              zonaFinal,
              false,
              false,
              true,
              false
            ])
          }
        }

        if (allProductsSeq.length > 0) {
          curCSecId++
          const formattedSeq = `{${allProductsSeq.map(p => `"${p.replace(/"/g, '')}"`).join(',')}}`
          await client.query(`
            INSERT INTO cliente_secuencias (id, cliente, secuencia_productos, created_at)
            VALUES ($1, $2, $3, NOW())
          `, [curCSecId, nombreFinal, formattedSeq])
        }

        await client.query('COMMIT')
      } catch (dbErr) {
        await client.query('ROLLBACK')
        throw dbErr
      } finally {
        client.release()
      }
    } catch (dbErr) {
      console.warn(`[HONO API] Error en PostgreSQL para cliente (${dbErr.message}). Continuará con sync CSV...`)
    }

    // Append a CSV
    if (fs.existsSync(csvPath)) {
      let newRows = ''
      for (const m of mesesData) {
        for (const item of m.items) {
          const monto = (item.cantidad * 35.00)
          newRows += `\nPHARMA - ${zonaFinal},${nombreFinal},${item.producto},${m.mes_num},${m.mes_abbr},${monto},${item.cantidad},Z1,${zonaFinal},False,False,True,False,41500.0,${item.producto},${m.mes_nombre},1.0,50000.0,50000.0,${monto},${nextClienteId},10,`
        }
      }
      await fs.promises.appendFile(csvPath, newRows, 'utf-8')
    }

    await precargarDatos()

    return c.json({
      success: true,
      cliente: {
        cliente_id: nextClienteId,
        id: nextClienteId,
        nombre: nombreFinal,
        name: nombreFinal,
        cliente: nombreFinal,
        ruc: ruc || '',
        zona: zonaFinal,
        zona_comercial: zonaFinal,
        categoria: categoria || 'CLÍNICA OFTALMOLÓGICA',
        limite_credito: limite_credito || 15000,
        contacto: contacto || '',
        telefono: telefono || ''
      }
    })
  } catch (err) {
    console.error('[API CLIENTES] Error registrando cliente:', err)
    return c.json({ error: 'Error al registrar cliente', details: err.message }, 500)
  }
})

// 4. Modificar datos de cliente
clientsRouter.put('/:id', async (c) => {
  const cid = Number(c.req.param('id'))
  if (isNaN(cid)) return c.json({ error: 'ID de cliente inválido' }, 400)

  try {
    const { cliente, zona, vendedor } = await c.req.json()
    if (!cliente || !cliente.trim()) return c.json({ error: 'El nombre del cliente es obligatorio' }, 400)

    const nombreNuevo = cliente.trim().toUpperCase()
    const zonaNueva = (zona || 'LIMA CENTRO').trim().toUpperCase()
    const vendedorNuevo = (vendedor || `PHARMA - ${zonaNueva}`).trim()

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const oldRes = await client.query('SELECT cliente FROM ventas_detalle WHERE cliente_id = $1 LIMIT 1', [cid])
      const oldName = oldRes.rows[0]?.cliente

      await client.query(`
        UPDATE ventas_detalle 
        SET cliente = $1, zona = $2, vendedor = $3 
        WHERE cliente_id = $4
      `, [nombreNuevo, zonaNueva, vendedorNuevo, cid])

      if (oldName) {
        await client.query(`
          UPDATE ventas_base 
          SET cliente = $1, zona = $2, vendedor = $3 
          WHERE cliente = $4
        `, [nombreNuevo, zonaNueva, vendedorNuevo, oldName])

        await client.query(`
          UPDATE cliente_secuencias 
          SET cliente = $1 
          WHERE cliente = $2
        `, [nombreNuevo, oldName])
      }

      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    await precargarDatos()
    return c.json({ success: true, message: 'Cliente actualizado correctamente' })
  } catch (err) {
    return c.json({ error: 'Error al actualizar cliente', details: err.message }, 500)
  }
})

// 5. Eliminar un cliente
clientsRouter.delete('/:id', async (c) => {
  const cid = Number(c.req.param('id'))
  if (isNaN(cid)) return c.json({ error: 'ID de cliente inválido' }, 400)

  try {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const oldRes = await client.query('SELECT cliente FROM ventas_detalle WHERE cliente_id = $1 LIMIT 1', [cid])
      const oldName = oldRes.rows[0]?.cliente

      await client.query('DELETE FROM ventas_detalle WHERE cliente_id = $1', [cid])
      if (oldName) {
        await client.query('DELETE FROM ventas_base WHERE cliente = $1', [oldName])
        await client.query('DELETE FROM cliente_secuencias WHERE cliente = $1', [oldName])
      }
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    await precargarDatos()
    return c.json({ success: true, message: 'Cliente eliminado correctamente' })
  } catch (err) {
    return c.json({ error: 'Error al eliminar cliente', details: err.message }, 500)
  }
})

export { clientsRouter }
