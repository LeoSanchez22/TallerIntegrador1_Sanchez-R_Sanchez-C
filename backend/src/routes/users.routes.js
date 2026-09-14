import { Hono } from 'hono'
import { pool } from '../config/db.js'

const usersRouter = new Hono()

// 1. Obtener perfil en tiempo real del usuario autenticado
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
      company: meta.company || ''
    })
  } catch (err) {
    return c.json({ error: 'Error del servidor', details: err.message }, 500)
  }
})

// 2. Listar usuarios / representantes
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
      company: row.raw_user_meta_data?.company || ''
    }))
    return c.json({ data: list })
  } catch (err) {
    return c.json({ error: 'Error al listar usuarios', details: err.message }, 500)
  }
})

// 3. Crear usuario / representante
usersRouter.post('/', async (c) => {
  try {
    const { email, password, name, role, company } = await c.req.json()
    if (!email || !password || !name || !role) {
      return c.json({ error: 'Faltan campos obligatorios (email, password, name, role)' }, 400)
    }

    const metadata = JSON.stringify({
      full_name: name,
      role: role,
      company: company || 'Laboratorios Sophia S.A.'
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
    const res = await pool.query(query, [email.toLowerCase().trim(), password, metadata])
    return c.json({ success: true, userId: res.rows[0].id })
  } catch (err) {
    return c.json({ error: 'Error al crear usuario (el correo podría estar ya registrado)', details: err.message }, 500)
  }
})

// 4. Editar usuario
usersRouter.put('/:id', async (c) => {
  const userId = c.req.param('id')
  try {
    const { name, role, company, password } = await c.req.json()
    if (!name || !role) {
      return c.json({ error: 'Faltan campos obligatorios (name, role)' }, 400)
    }

    const userRes = await pool.query('SELECT raw_user_meta_data FROM auth.users WHERE id = $1', [userId])
    if (userRes.rows.length === 0) {
      return c.json({ error: 'Usuario no encontrado' }, 404)
    }

    const currentMeta = userRes.rows[0].raw_user_meta_data || {}
    const updatedMeta = JSON.stringify({
      ...currentMeta,
      full_name: name,
      role: role,
      company: company || currentMeta.company || 'Laboratorios Sophia S.A.'
    })

    if (password && password.trim() !== '') {
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

    return c.json({ success: true })
  } catch (err) {
    return c.json({ error: 'Error al actualizar usuario', details: err.message }, 500)
  }
})

// 5. Inhabilitar / Restaurar usuario
usersRouter.delete('/:id', async (c) => {
  const userId = c.req.param('id')
  const restore = c.req.query('restore') === 'true'
  try {
    if (restore) {
      await pool.query('UPDATE auth.users SET deleted_at = NULL, updated_at = NOW() WHERE id = $1', [userId])
      return c.json({ success: true, message: 'Usuario restaurado con éxito' })
    } else {
      await pool.query('UPDATE auth.users SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1', [userId])
      return c.json({ success: true, message: 'Usuario inhabilitado con éxito' })
    }
  } catch (err) {
    return c.json({ error: 'Error al inhabilitar/restaurar usuario', details: err.message }, 500)
  }
})

export { usersRouter }
