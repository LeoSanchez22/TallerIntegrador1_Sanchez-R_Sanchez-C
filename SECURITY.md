# SECURITY.md — Controles de Seguridad de la Información (Sophia XAI)

Documento de trazabilidad de los requerimientos de seguridad del proyecto
**Sophia XAI · Laboratorios Sophia S.A.**, alineado con **ISO/IEC 27001 · ISO/IEC 27002**
y la normativa peruana de protección de datos personales **Ley N° 29733** y
**D.S. N° 003-2013-JUS**.

Cada requerimiento se implementa en las **tres capas** del sistema:

| Capa | Tecnología | Rol en seguridad |
|------|------------|------------------|
| Frontend | Next.js 15 (App Router) | Experiencia de usuario, bloqueo de vistas, marcador de sesión, cabeceras HTTP |
| API Gateway | Hono (Node.js) | Autenticación JWT, RBAC, rate limiting, sanitización, auditoría, trazabilidad |
| Microservicio IA | FastAPI (Python) | Clave servicio-a-servicio, validación de entrada, auditoría y trazabilidad de simulaciones |
| Datos | PostgreSQL / Supabase | RLS por zona comercial, tablas inmutables, TLS 1.2+ |

---

## 1. Matriz de trazabilidad de requerimientos

| ID | Requerimiento | Control ISO/IEC 27002 | Implementación |
|----|---------------|------------------------|----------------|
| **RF-11** | RBAC (Administrador vs Representante) | 5.15 | `backend/src/middleware/rbac.js`, `backend/src/middleware/auth.js`, `frontend/src/lib/useRole.ts` |
| **RF-16** | Registro y auditoría de accesos | 8.15 | `backend/src/security/audit.js`, `backend/src/routes/audit.routes.js`, `backend/src/routes/security.routes.js`, `supabase/migrations/001_security_controls.sql` |
| **RF-17** | Cierre de sesión automático por inactividad | 5.17 | `backend/src/middleware/idleSession.js`, `frontend/src/hooks/useSessionTimeout.ts` |
| **RF-14** | Trazabilidad inmutable de simulaciones | 8.15 | `logSimulationTrace()` en `audit.js` + `src_py/security.py`, tabla `simulation_trace_log` |
| **RNF-04** | Autenticación basada en sesiones (Supabase Auth) | — | `backend/src/middleware/auth.js`, `frontend/src/middleware.ts`, `frontend/src/lib/sessionMarkers.ts` |
| **RNF-11** | Cifrado en tránsito HTTPS/TLS 1.2+ | — | `backend/src/config/db.js` (verificación de certificado), HSTS en `app.js` y `frontend/src/middleware.ts` |
| **RNF-12** | RLS: cada usuario ve solo su zona comercial | — | `supabase/migrations/001_security_controls.sql`, `backend/src/security/zoneScope.js` |
| **RNF-13** | Sanitización/validación de entrada, anti-XSS/SQLi | — | `backend/src/middleware/sanitize.js`, `src_py/security.py`, consultas parametrizadas, `execFile` |
| **RNF-14** | Rate limiting + CORS | — | `backend/src/middleware/rateLimit.js`, CORS por lista blanca en `app.js` y `src_py/servidor_front.py` |
| **Ley 29733** | Consentimiento informado / aviso de privacidad | — | `frontend/src/components/ConsentGate.tsx`, `frontend/src/app/(auth)/privacy/page.tsx`, `backend/src/security/policy.js`, tabla `user_consents` |

---

## 2. RF-11 — Control de acceso basado en roles

**Perfiles diferenciados (ISO/IEC 27002, control 5.15):**

| Perfil | Rol en Supabase Auth | Permisos |
|--------|----------------------|----------|
| Administrador | `admin` | Alta de productos, gestión de usuarios, auditoría, reentrenamiento del modelo, CRUD de clientes |
| Representante Comercial | `representante` (o cualquier otro valor) | **Solo consulta** de catálogos, clientes y recomendaciones de su zona |

**Reglas que ejerce el backend** (`backend/src/middleware/rbac.js`):

* Denegación por defecto: toda petición que **no** sea `GET`/`HEAD`/`OPTIONS` sobre `/api/*`
  requiere rol `admin`. Excepciones puntuales y justificadas:
  * `POST /api/consent` — el propio usuario registra/revoca su consentimiento.
  * `POST /api/security/auth-event` — registro público de intentos de login (RF-16).
* Lecturas reservadas al administrador (`ADMIN_READ_PREFIXES`): `/api/users` (excepto `/api/users/me`),
  `/api/audit`, `/model` (excepto `/model/upload`, que usa su propio token estático de despliegue).
* La denegación devuelve **HTTP 403** con el mensaje
  `Se requieren privilegios de Administrador para acceder a este recurso.` y genera un evento
  `unauthorized_access` en el log de auditoría.

**Refuerzo en la interfaz** (solo UX; el control efectivo es el del backend):

* `frontend/src/lib/useRole.ts` expone `{ role, zone, isAdmin }`.
* `/app/users` y `/app/audit` muestran un panel de acceso restringido a no administradores.
* Se ocultan el botón «+ Nuevo Cliente», las acciones de editar/eliminar clientes y las pestañas
  administrativas de Recomendaciones («Registrar Nuevo Cliente», «Registrar Lanzamiento»,
  «Mantenimiento & DLOps»).

---

## 3. RF-16 — Registro y auditoría de accesos

**Qué se registra** (ISO/IEC 27002, control 8.15), siempre con **dirección IP** y **marca de tiempo**:

* `login_success` / `login_failed` — intentos de inicio de sesión (reportados por el frontend
  al `POST /api/security/auth-event`, que es el **único** endpoint de escritura público y aplica
  una lista blanca de eventos + rate limiting agresivo).
* `unauthorized_access` / `invalid_token` — accesos no autorizados, tokens inválidos, violaciones RBAC.
* `privilege_change` / `user_created` / `account_disabled` — cambios de privilegios y gestión de cuentas.
* `logout`, `session_idle_timeout`, `session_revoked` — cierres de sesión manuales y automáticos (RF-17).
* `rate_limit_exceeded`, `scope_zone_unassigned`, `consent_granted`, `consent_revoked`,
  `product_created`, `model_updated`, `password_recovery_requested`.

**Persistencia tolerante a fallos** (`backend/src/security/audit.js`):

1. Ring buffer en memoria (últimos 1 000 eventos) — siempre disponible.
2. Tabla PostgreSQL `security_audit_log` — persistencia real.
3. Archivo JSONL en `backend/logs/` — respaldo si la BD no responde.

Auditar **nunca** revienta una petición: `logSecurityEvent` es *fire-and-forget*.

**Visor administrativo:** `/app/audit` (KPIs, filtro por tipo de evento, pestañas de
seguridad, trazabilidad y consentimientos) sobre `GET /api/audit`, `/api/audit/stats`,
`/api/audit/simulations` y `/api/audit/consents`.

---

## 4. RF-17 — Cierre de sesión automático por inactividad

| Elemento | Valor por defecto | Variable |
|----------|-------------------|----------|
| Umbral total de inactividad | 30 min | `SESSION_IDLE_TIMEOUT_MINUTES` / `NEXT_PUBLIC_SESSION_IDLE_TIMEOUT_MINUTES` |
| Aviso previo al usuario | 2 min | `NEXT_PUBLIC_SESSION_IDLE_WARNING_MINUTES` |

Secuencia:

1. El frontend muestra un modal de advertencia con cuenta regresiva; «Continuar con sesión»
   reinicia el temporizador.
2. Al vencer el umbral se ejecuta `supabase.auth.signOut()` (invalida el JWT de Supabase Auth),
   se reporta el evento `session_idle_timeout` al log de auditoría y se redirige a
   `/login?reason=idle_timeout`.
3. El backend lo refuerza con `idleSessionGuard`, que rechaza con **HTTP 401** cualquier petición
   realizada tras el umbral, de modo que el control no depende del navegador.

---

## 5. RF-14 — Trazabilidad de operaciones críticas

Cada simulación ejecutada queda registrada de forma **inmutable** en `simulation_trace_log`:

| Campo | Contenido |
|-------|-----------|
| `user_id`, `user_email`, `user_role` | Quién ejecutó la simulación |
| `client_id`, `client_name`, `client_zone` | Sobre qué cliente y zona |
| `recommended_product` | Producto recomendado |
| `commercial_argument` | Argumentario comercial generado por XAI |
| `source` | `gateway` (Hono) o `fastapi` (microservicio) |
| `ip_address`, `executed_at`, `payload` | IP, sello temporal y detalle |

**Inmutabilidad:** triggers `BEFORE UPDATE` y `BEFORE DELETE` sobre `simulation_trace_log` y
`security_audit_log` que lanzan una excepción, más `REVOKE` de los permisos de escritura
(definidos en `supabase/migrations/001_security_controls.sql`).

---

## 6. RNF-04 — Autenticación basada en sesiones

* Toda la superficie `/api/*` y `/model/*` exige un **JWT de Supabase Auth** verificado contra
  el secreto JWKS (`backend/src/middleware/auth.js`). `PUBLIC_PATHS` es una lista blanca de
  coincidencia exacta: `POST /api/security/auth-event` y `POST /model/upload`.
* El middleware de Next.js (`frontend/src/middleware.ts`) bloquea el acceso directo a `/app/*`
  mediante la cookie no sensible `sophia_session` (no contiene tokens ni credenciales); la
  validación criptográfica real siempre ocurre en el backend.

---

## 7. RNF-11 — Cifrado en tránsito (HTTPS / TLS 1.2+)

* **Backend → Supabase:** `backend/src/config/db.js` verifica el certificado del servidor
  (`rejectUnauthorized: true` por defecto). En entornos que interceptan el TLS define
  `PG_SSL_REJECT_UNAUTHORIZED=false` **solo para desarrollo**.
* **Microservicio IA → Supabase:** `sslmode=require` en la cadena de conexión (`src_py/security.py`).
* **Navegador ↔ API:** cabeceras `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  emitidas tanto por Hono (`secureHeaders`) como por el middleware de Next.js.

---

## 8. RNF-12 — Seguridad a nivel de fila (RLS)

* Tablas `ventas_detalle`, `ventas_base`, `cliente_secuencias` y las tablas de auditoría
  habilitan **Row Level Security**.
* Funciones PostgreSQL `current_user_role()` y `current_user_zone()` derivan el rol y la zona del
  usuario autenticado en la sesión, de modo que cada usuario consulta únicamente los historiales
  de su **zona comercial asignada**.
* El API Gateway aplica el mismo alcance en la capa de aplicación con
  `backend/src/security/zoneScope.js` (`resolveZoneParam`, `enforceZoneParam`, `filterRowsByScope`).
* **Decisión de diseño:** un representante **sin zona asignada** conserva lectura global, pero
  cada acceso queda registrado con el evento de advertencia `scope_zone_unassigned` en el log de
  auditoría para su revisión gerencial.

---

## 9. RNF-13 — Protección contra inyecciones (SQLi / XSS / command injection)

* **Sanitización central:** `backend/src/middleware/sanitize.js` sanea *query*, parámetros de ruta
  y cuerpo JSON; rechaza con HTTP 400 payloads que contengan vectores `<script>`, `javascript:`,
  `onerror=`, `UNION SELECT`, `DROP TABLE`, etc.
* **Consultas parametrizadas:** todas las consultas PostgreSQL usan placeholders (`$1`, `:param`)
  vía `pg` y SQLAlchemy. No hay interpolación de cadenas en SQL.
* **Command injection:** los subprocesos Python se lanzan con `execFile` (Node) y
  `subprocess.Popen` con lista de argumentos (Python), nunca con `shell=True` ni `exec()` con
  concatenación.
* **XSS en el visor:** el log de auditoría elimina etiquetas HTML y caracteres de control antes de
  persistir (`safeText` en `audit.js`, `sanitize_text` en `security.py`).

---

## 10. RNF-14 — Limitación de tasa y control de origen

**Rate limiting** (`backend/src/middleware/rateLimit.js`) — ventana deslizante configurable:

| Bucket | Ruta | Defecto | Variable |
|--------|------|---------|----------|
| `auth` | `/api/security/*` | 10 req / 5 min | `RATE_LIMIT_AUTH_MAX`, `RATE_LIMIT_AUTH_WINDOW_MS` |
| `model` | `/model/*` | 20 req / 60 s | `RATE_LIMIT_MODEL_MAX`, `RATE_LIMIT_MODEL_WINDOW_MS` |
| `api` | `/api/*` | 300 req / 60 s | `RATE_LIMIT_API_MAX`, `RATE_LIMIT_API_WINDOW_MS` |
| ML | FastAPI (por IP y ruta) | 60 req / 60 s | `RATE_LIMIT_ML_MAX`, `RATE_LIMIT_ML_WINDOW_MS` |

Cada exceso genera el evento `rate_limit_exceeded` en el log de auditoría.

**CORS con lista blanca y denegación por defecto:** un origen desconocido **no** recibe
`Access-Control-Allow-Origin` (Hono devuelve `null`). Se configura con `ALLOWED_ORIGINS` en
ambas capas (Hono y FastAPI).

**Microservicio IA protegido:** si se define `ML_SERVICE_KEY`, el API Gateway inyecta la cabecera
`X-Service-Key` en cada llamada (`backend/src/utils/mlClient.js`) y FastAPI responde **HTTP 401**
a cualquier petición sin la clave; además restringe los métodos de escritura al rol administrador
declarado por el gateway.

---

## 11. Consentimiento informado — Ley N° 29733 (D.S. N° 003-2013-JUS)

Implementado en las **tres capas**:

| Capa | Artefacto |
|------|-----------|
| Frontend Next.js | `frontend/src/components/ConsentGate.tsx` (modal bloqueante al primer ingreso), `frontend/src/app/(auth)/privacy/page.tsx` (aviso completo con derechos ARCO), revocación en `SecuritySettings.tsx` |
| API Gateway Hono | `backend/src/security/policy.js` (política versionada `POLICY_VERSION`), `POST /api/consent` y `GET /api/consent` en `backend/src/routes/security.routes.js` |
| Microservicio FastAPI | `POST /api/consent`, `GET /api/consent/{user_id}`, `GET /api/consent/policy` en `src_py/servidor_front.py` con `save_consent()` de `src_py/security.py` |
| Datos | Tabla inmutable `user_consents` (`supabase/migrations/001_security_controls.sql`) |

El registro incluye **sello temporal, dirección IP, user-agent, versión de la política y las
finalidades aceptadas**, además del evento `consent_granted` / `consent_revoked` en el log de
auditoría. El aviso cubre: identidad y domicilio del responsable, finalidades concretas,
transferencia internacional (Supabase · AWS us-west-2), y el ejercicio gratuito de los derechos
**ARCO** y de revocación del consentimiento en cualquier momento.

---

## 12. Despliegue y operación

1. **Ejecutar la migración de seguridad** en el editor SQL de Supabase:
   `supabase/migrations/001_security_controls.sql`
   (crea las tablas de auditoría/trazabilidad/consentimiento, los triggers de inmutabilidad y las políticas RLS).
2. **Revisar `.env.example`** y definir las variables de seguridad descritas en este documento.
3. **TLS en producción:** no definas `PG_SSL_REJECT_UNAUTHORIZED=false` ni
   `NODE_TLS_REJECT_UNAUTHORIZED=0` en el VPS.
4. **Pruebas automatizadas:**
   * Backend: `cd backend && npm test` — incluye `src/tests/security_controls.test.js`
     (RBAC, sanitización, auditoría, inactividad y consentimiento).
   * Frontend: `cd frontend && npm run test` — verificación de tipos TypeScript.

---

## 13. Reporte de incidentes

Toda denegación de acceso, error no controlado o exceso de rate limit queda registrada en
`security_audit_log`. El endpoint `GET /api/audit` (solo administrador) permite la revisión
gerencial del historial con IP, sello temporal, recurso afectado y detalle del evento.
