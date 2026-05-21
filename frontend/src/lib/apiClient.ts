import { supabase } from './supabase'
import { API_URL } from '../config'

/**
 * Cliente de API unificado que inyecta automáticamente el token JWT
 * de la sesión activa de Supabase en cada petición HTTP al backend de Hono.
 * 
 * Implementa un mecanismo de "Auto-Healing" para renovar automáticamente la
 * sesión si se detecta un error 401 por expiración de token y reintentar la llamada.
 * 
 * @param endpoint Ruta del endpoint relativa a la API base (ej. '/api/dashboard')
 * @param options Opciones estándar de la API Fetch
 */
export async function fetchWithAuth(endpoint: string, options: RequestInit = {}) {
  // 1. Recuperar la sesión activa de Supabase de forma segura en tiempo real
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  // 2. Unificar headers e inyectar el Token Bearer si existe la sesión
  const headers = new Headers(options.headers)
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // 3. Realizar la petición inicial al backend de Hono
  let response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  })

  // 4. Mecanismo Auto-Healing: Si el token expiró (Retorna 401)
  if (response.status === 401) {
    console.warn(`[API CLIENT] Detectado 401 Unauthorized en ${endpoint}. Intentando refrescar token...`)
    try {
      // Intentar refrescar la sesión activa con Supabase Auth
      const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession()
      
      if (!error && refreshedSession) {
        const freshToken = refreshedSession.access_token
        console.log(`[API CLIENT] ¡Sesión refrescada con éxito! Reintentando petición a ${endpoint}...`)
        
        // Clonar las cabeceras originales e inyectar el nuevo token fresco
        const retryHeaders = new Headers(options.headers)
        retryHeaders.set('Authorization', `Bearer ${freshToken}`)
        
        // Reintentar la llamada una única vez
        response = await fetch(`${API_URL}${endpoint}`, {
          ...options,
          headers: retryHeaders,
        })
      } else {
        console.error("[API CLIENT] No se pudo refrescar la sesión de Supabase Auth:", error?.message || "Sin sesión activa.")
      }
    } catch (refreshErr) {
      console.error("[API CLIENT] Error crítico durante el flujo de refresco automático:", refreshErr.message)
    }
  }

  return response
}
