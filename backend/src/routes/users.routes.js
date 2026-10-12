import { Hono } from 'hono'
import { pool } from '../config/db.js'
import { AUDIT_EVENTS, getClientIp, getUserAgent, logSecurityEvent } from '../security/audit.js'
import { isEmail, isUuid, sanitizeText } from '../middleware/sanitize.js'

const usersRouter = new Hono()

const ALLOWED_ROLES = new Set(['admin', 'representante'])

/** Recupera el contexto de autorización construido por el authMiddleware. */
function getAuthContext(c) {
  const ctx = c.get('authz')
  return {
    userId: ctx?.userId || c.get('jwtPayload')?.sub || null,
    email: ctx?.email || c.get('jwtPayload')?.email || null,
    role: ctx?.role || 'representante'
  }
}

async function fetchUserById(userId) {
  const res = await pool.query(
    'SELECT id, email, deleted_at, raw_user_meta_data FROM auth.users WHERE id = $1',
    [userId]
  )
  return res.rows[0] || null
}

// 1. Obtener perfil en tiempo real del usuario autenticado (incluye zona comercial)
usersRouter.get('/me', async (c) => {
  const payload = c.get('jwtPayload')
  if (!payload) {
    return c.json({ error: 'No autenticado' }, 401)
  }
  try {
    const res = await pool.query('SELECT raw_user_meta_data FROM auth.users WHERE id = $1', [payload.sub])
    if (res.rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }
    const meta = res.rows[0].raw_user_meta_data || {}
    return c.json({
      role: meta.role || '',
      name: meta.full_name || '',
      company: meta.company || '',
      zone: meta.zona_comercial || meta.zone || ''
    })
  } catch (err) {
    return c.json({ error: 'Error del servidor', details: err.message }, 500)
  }
})

// 2. Listar usuarios / representantes (RF-11: lectura exclusiva de administrador)
usersRouter.get('/', async (c) => {
  try {
    const res = await pool.query(`
      SELECT 
        id, 
        email, 
        created_at, 
        deleted_at,
        raw_user_meta_data
      FROM auth.users 
      ORDER BY created_at DESC
    `)
    const list = res.rows.map(row => ({
      id: row.id,
      email: row.email,
      created_at: row.created_at,
      deleted_at: row.deleted_at,
      name: row.raw_user_meta_data?.full_name || '',
      role: row.raw_user_meta_data?.role || '',
      company: row.raw_user_meta_data?.company || '',
      zone: row.raw_user_meta_data?.zona_comercial || row.raw_user_meta_data?.zone || ''
    }))
    return c.json({ data: list })
  } catch (err) {
    return c.json({ error: 'Error al listar usuarios', details: err.message }, 500)
  }
})

// 3. Crear usuario / representante (alta de privilegios → auditoría RF-16)
usersRouter.post('/', async (c) => {
  const actor = getAuthContext(c)
  const ip = getClientIp(c)

  try {
    const body = await c.req.json()
    const email = sanitizeText(body.email, 254).toLowerCase().trim()
    const password = typeof body.password === 'string' ? body.password : ''
    const name = sanitizeText(body.name, 120).trim()
    const role = sanitizeText(body.role, 40).trim()
    const company = sanitizeText(body.company, 160).trim()
    const zone = sanitizeText(body.zone, 120).trim().toUpperCase()

    if (!email || !password || !name || !role) {
      return c.json({ error: 'Faltan campos obligatorios (email, password, name, role)' }, 400)
    }
    if (!isEmail(email)) {
      return c.json({ error: 'El correo electrónico no tiene un formato válido' }, 400)
    }
    if (!ALLOWED_ROLES.has(role)) {
      return c.json({ error: 'Rol no permitido', details: 'Los roles válidos son: admin, representante' }, 400)
    }
    if (password.length < 8) {
      return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
    }

    const metadata = JSON.stringify({
      full_name: name,
      role: role,
      company: company || 'Laboratorios Sophia S.A.',
      zona_comercial: zone || null
    })

    const query = `
      INSERT INTO auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, recovery_sent_at, last_sign_in_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new,
        phone, phone_confirmed_at, phone_change, phone_change_token,
        email_change_token_current, email_change_confirm_status,
        banned_until, reauthentication_token, reauthentication_sent_at,
        is_super_admin, confirmed_at, is_anonymous
      ) VALUES (
        '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1, crypt($2, gen_salt('bf', 10)),
        NOW(), NULL, NULL,
        '{"provider": "email", "providers": ["email"]}'::jsonb, $3::jsonb, NOW(), NOW(),
        '', '', '',
        NULL, NULL, '', '',
        '', 0,
        NULL, '', NULL,
        FALSE, NOW(), FALSE
      ) RETURNING id;
    `
    const res = await pool.query(query, [email, password, metadata])

    await logSecurityEvent({
      eventType: AUDIT_EVENTS.USER_CREATED,
      severity: 'info',
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role,
      ip,
      userAgent: getUserAgent(c),
      method: 'POST',
      resource: '/api/users',
      statusCode: 201,
      details: { usuario_creado: email, rol_asignado: role, zona_asignada: zone || null }
    })

    return c.json({ success: true, userId: res.rows[0].id })
  } catch (err) {
    return c.json({ error: 'Error al crear usuario (el correo podría estar ya registrado)', details: err.message }, 500)
  }
})

// 4. Editar usuario (cambio de rol = cambio de privilegios → auditoría RF-16)
usersRouter.put('/:id', async (c) => {
  const actor = getAuthContext(c)
  const ip = getClientIp(c)
  const userId = c.req.param('id')

  if (!isUuid(userId)) {
    return c.json({ error: 'Identificador de usuario inválido' }, 400)
  }

  try {
    const body = await c.req.json()
    const name = sanitizeText(body.name, 120).trim()
    const role = sanitizeText(body.role, 40).trim()
    const company = sanitizeText(body.company, 160).trim()
    const zone = sanitizeText(body.zone, 120).trim().toUpperCase()
    const password = typeof body.password === 'string' ? body.password : ''

    if (!name || !role) {
      return c.json({ error: 'Faltan campos obligatorios (name, role)' }, 400)
    }
    if (!ALLOWED_ROLES.has(role)) {
      return c.json({ error: 'Rol no permitido', details: 'Los roles válidos son: admin, representante' }, 400)
    }

    const existing = await fetchUserById(userId)
    if (!existing) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    const currentMeta = existing.raw_user_meta_data || {}
    const updatedMeta = JSON.stringify({
      ...currentMeta,
      full_name: name,
      role: role,
      company: company || currentMeta.company || 'Laboratorios Sophia S.A.',
      zona_comercial: zone || currentMeta.zona_comercial || null
    })

    if (password && password.trim() !== '') {
      if (password.length < 8) {
        return c.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
      }
      await pool.query(`
        UPDATE auth.users 
        SET 
          raw_user_meta_data = $1::jsonb,
          encrypted_password = crypt($2, gen_salt('bf', 10)),
          updated_at = NOW()
        WHERE id = $3
      `, [updatedMeta, password, userId])
    } else {
      await pool.query(`
        UPDATE auth.users 
        SET 
          raw_user_meta_data = $1::jsonb,
          updated_at = NOW()
        WHERE id = $2
      `, [updatedMeta, userId])
    }

    const previousRole = currentMeta.role || 'sin_rol'
    const roleChanged = previousRole !== role
    const zoneChanged = (currentMeta.zona_comercial || null) !== (zone || null)

    if (roleChanged || zoneChanged) {
      await logSecurityEvent({
        eventType: AUDIT_EVENTS.PRIVILEGE_CHANGE,
        severity: roleChanged ? 'critical' : 'warning',
        userId: actor.userId,
        userEmail: actor.email,
        userRole: actor.role,
        ip,
        userAgent: getUserAgent(c),
        method: 'PUT',
        resource: `/api/users/${userId}`,
        statusCode: 200,
        details: {
          usuario_modificado: existing.email,
          rol_anterior: previousRole,
          rol_nuevo: role,
          zona_anterior: currentMeta.zona_comercial || null,
          zona_nueva: zone || null,
          clave_restablecida: Boolean(password && password.trim())
        }
      })
    }

    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Error al actualizar usuario', details: err.message }, 500)
  }
})

// 5. Inhabilitar / Restaurar usuario (bloqueo de acceso → auditoría RF-16)
usersRouter.delete('/:id', async (c) => {
  const actor = getAuthContext(c)
  const ip = getClientIp(c)
  const userId = c.req.param('id')
  const restore = c.req.query('restore') === 'true'

  if (!isUuid(userId)) {
    return c.json({ error: 'Identificador de usuario inválido' }, 400)
  }

  try {
    const existing = await fetchUserById(userId)

    if (restore) {
      await pool.query('UPDATE auth.users SET deleted_at = NULL, updated_at = NOW() WHERE id = $1', [userId])
    } else {
      await pool.query('UPDATE auth.users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [userId])
    }

    await logSecurityEvent({
      eventType: restore ? AUDIT_EVENTS.USER_CREATED : AUDIT_EVENTS.ACCOUNT_DISABLED,
      severity: restore ? 'info' : 'critical',
      userId: actor.userId,
      userEmail: actor.email,
      userRole: actor.role,
      ip,
      userAgent: getUserAgent(c),
      method: 'DELETE',
      resource: `/api/users/${userId}`,
      statusCode: 200,
      details: {
        usuario_afectado: existing?.email || null,
        accion: restore ? 'restauracion_de_cuenta' : 'inhabilitacion_de_cuenta'
      }
    })

    return c.json({
      success: true,
      message: restore ? 'Usuario restaurado con éxito' : 'Usuario inhabilitado con éxito'
    })
  } catch (err) {
    return c.json({ error: 'Error al inhabilitar/restaurar usuario', details: err.message }, 500)
  }
})

export { usersRouter }
