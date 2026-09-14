/**
 * Configuración de la URL base para el consumo de la API.
 * - Usamos rutas relativas ('') en el cliente para que Next.js (mediante rewrites en next.config.mjs)
 *   o Nginx enruten transparentemente hacia el backend correspondiente
 *   (5005 en local, 5017 en Taller 2, 5007 en Taller 1).
 *   Esto elimina problemas de CORS, 404s y puertos bloqueados por firewall.
 */
export const API_URL = '';


