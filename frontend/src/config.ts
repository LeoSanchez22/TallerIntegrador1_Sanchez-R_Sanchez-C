/**
 * Configuración de la URL base para el consumo de la API.
 * En el navegador (Client-Side) siempre se utilizan rutas relativas ('') para que
 * todas las peticiones sean interceptadas y redirigidas limpiamente por Nginx
 * hacia el puerto correspondiente (5007 para Taller 1 o 5017 para Taller 2).
 */
const rawEnvUrl = process.env.NEXT_PUBLIC_API_URL || '';
const isLocalhost = rawEnvUrl.includes('localhost') || rawEnvUrl.includes('127.0.0.1');

export const API_URL = typeof window !== 'undefined'
  ? (isLocalhost ? '' : rawEnvUrl)
  : (rawEnvUrl || 'http://127.0.0.1:5007');
