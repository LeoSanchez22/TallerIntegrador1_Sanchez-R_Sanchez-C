/**
 * Configuración de la URL base para el consumo de la API.
 * - En Local (localhost:3000): Se conecta directamente al puerto del Backend Hono (5005).
 * - En Producción / VPS (tallerintegrador1.diegoproyectos.me / taller2.diegoproyectos.me):
 *   Usa rutas relativas ('') para que Nginx enrute transparentemente al puerto 5007 o 5017.
 */
export const API_URL = (() => {
  if (typeof window !== 'undefined') {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return 'http://127.0.0.1:5005';
    }
    return '';
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5005';
})();

