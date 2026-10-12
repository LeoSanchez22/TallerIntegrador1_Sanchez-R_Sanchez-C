import { NextResponse, type NextRequest } from 'next/server'

/**
 * =============================================================================
 *  MIDDLEWARE DE NEXT.JS — CABECERAS DE SEGURIDAD Y PROTECCIÓN DE MÓDULOS
 * =============================================================================
 *  RNF-11 · Cifrado en tránsito: HSTS obliga al navegador a usar HTTPS/TLS 1.2+.
 *  RNF-13 · Protección contra XSS: Content-Security-Policy restringe orígenes
 *           de scripts, estilos, conexiones y prohíbe el framing externo.
 *  RNF-04 · Los módulos operativos (/app/*) exigen sesión de Supabase Auth:
 *           este middleware realiza la verificación perimetral defensiva y el
 *           layout del dashboard revalida la sesión con Supabase en cada carga.
 * =============================================================================
 */

const IS_DEV = process.env.NODE_ENV !== 'production'

function buildContentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'base-uri': ["'self'"],
    'object-src': ["'none'"],
    'frame-ancestors': ["'none'"],
    'form-action': ["'self'"],
    'img-src': ["'self'", 'data:', 'blob:'],
    'font-src': ["'self'", 'data:'],
    'style-src': ["'self'", "'unsafe-inline'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'manifest-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'connect-src': [
      "'self'",
      'https://*.supabase.co',
      'wss://*.supabase.co',
      'https://*.diegoproyectos.me'
    ]
  }

  // En desarrollo, Next.js HMR necesita WebSocket y eval.
  if (IS_DEV) {
    directives['connect-src'].push('ws://localhost:*', 'ws://127.0.0.1:*', 'http://localhost:*', 'http://127.0.0.1:*')
    directives['script-src'].push("'unsafe-eval'")
  } else {
    // Los rewrites de Next proxyan /api y /model hacia el backend Hono en localhost.
    directives['connect-src'].push('http://127.0.0.1:*', 'http://localhost:*')
  }

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ')
}

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  /* ------------------------- Cabeceras de seguridad ----------------------- */
  response.headers.set('Content-Security-Policy', buildContentSecurityPolicy())
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-Permitted-Cross-Domain-Policies', 'none')
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()')
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin')
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin')

  // HSTS solo se emite cuando la llegada fue por HTTPS (evita bloquear el dev local).
  const forwardedProto = request.headers.get('x-forwarded-proto')
  if (forwardedProto === 'https' || request.nextUrl.protocol === 'https:') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  }

  /* ------------- Verificación perimetral de sesión (RNF-04) --------------- */
  // La validación criptográfica real del JWT la realiza el backend Hono y el
  // layout del dashboard. Aquí se bloquea el acceso directo a /app/* cuando no
  // existe la marca de sesión de Supabase (defensa en profundidad).
  const { pathname } = request.nextUrl
  if (pathname.startsWith('/app')) {
    const sessionMarker = request.cookies.get('sophia_session')?.value
    if (!sessionMarker) {
      // El origen se reconstruye desde Referer porque Nginx publica el sitio en
      // el puerto 5002: confiar en la URL interna de Next provocaría redirecciones
      // al puerto equivocado. Sin origen fiable se delega en el layout del dashboard.
      const referer = request.headers.get('referer')
      let externalOrigin: string | null = null
      if (referer) {
        try {
          externalOrigin = new URL(referer).origin
        } catch {
          externalOrigin = null
        }
      }
      if (externalOrigin) {
        return NextResponse.redirect(`${externalOrigin}/login?reason=session_required`)
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Se aplica a todas las rutas estáticas y dinámicas, excluyendo los
     * recursos internos de Next (_next/static, _next/image) y los favicones.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|map)$).*)'
  ]
}
