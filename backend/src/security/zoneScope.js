/**
 * =============================================================================
 *  ALCANCE POR ZONA COMERCIAL (ROW LEVEL SECURITY a nivel de aplicación)
 *  (RNF-12 · ISO/IEC 27002 control 5.15 / 8.3)
 * =============================================================================
 * Cada Representante Comercial únicamente consulta los historiales de su zona
 * comercial asignada. La misma garantía se implementa en la base de datos con
 * Row Level Security sobre `ventas_detalle`, `ventas_base` y
 * `cliente_secuencias` (ver supabase/migrations/001_security_controls.sql).
 *
 * Política aplicada:
 *   • Administrador → acceso global (auditoría y visión gerencial).
 *   • Representante con zona asignada → filtrado forzoso e ineludible: el
 *     parámetro ?zona= de la petición se ignora y se impone su zona.
 *   • Representante SIN zona asignada → se permite la consulta global y se
 *     registra el evento de auditoría `scope_zone_unassigned` (ver auth.js),
 *     para que el administrador complete el alta con su zona.
 * =============================================================================
 */

/**
 * Devuelve la zona comercial que debe aplicarse a una consulta, o `null`
 * cuando el usuario tiene alcance global.
 */
export function resolveZoneScope(c) {
  const ctx = c.get('authz')
  if (!ctx) return null
  if (ctx.role === 'admin') return null
  return ctx.zone || null
}

export function isGlobalScope(c) {
  return resolveZoneScope(c) === null
}

/**
 * Fuerza el filtro de zona sobre el valor solicitado por el usuario.
 * Un representante nunca puede ampliar su alcance cambiando el query param.
 */
export function enforceZoneParam(c, requestedZone) {
  const scopeZone = resolveZoneScope(c)
  if (!scopeZone) return requestedZone
  return scopeZone
}

/**
 * Filtra en memoria las filas de historiales (modo caché offline) respetando el
 * alcance del usuario autenticado.
 */
export function filterRowsByScope(c, rows, zoneFields = ['zona_comercial', 'zona', 'zona_code', 'vendedor']) {
  const scopeZone = resolveZoneScope(c)
  if (!scopeZone || !Array.isArray(rows)) return rows

  return rows.filter(row => {
    if (!row) return false
    return zoneFields.some(field => {
      const value = row[field]
      if (value === undefined || value === null) return false
      return String(value).trim().toUpperCase() === scopeZone
    })
  })
}

/**
 * Verifica que un recurso puntual (cliente, simulación) pertenezca al alcance
 * del usuario. Devuelve `{ allowed, scopeZone, resourceZone }`.
 */
export function checkResourceAccess(c, resourceZone) {
  const scopeZone = resolveZoneScope(c)
  if (!scopeZone) return { allowed: true, scopeZone: null, resourceZone: resourceZone || null }
  if (!resourceZone) return { allowed: true, scopeZone, resourceZone: null }

  const normalized = String(resourceZone).trim().toUpperCase()
  const allowed = normalized === scopeZone
    || normalized === `PHARMA - ${scopeZone}`
    || normalized.startsWith('PHARMA') && normalized.includes(scopeZone)

  return { allowed, scopeZone, resourceZone: normalized }
}
