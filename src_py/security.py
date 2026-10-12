"""
=============================================================================
 CONTROLES DE SEGURIDAD DEL MICROSERVICIO DE IA (FastAPI / Python)
=============================================================================
 Implementa en la capa de Machine Learning los mismos controles del API
 Gateway (Hono) para cumplir de forma homogénea los requerimientos:

   RF-11 · Control de acceso basado en roles (RBAC)
           Autenticación servicio-a-servicio mediante X-Service-Key y
           verificación del rol en el token JWT cuando está presente.

   RF-16 · Registro y auditoría de accesos (ISO/IEC 27002, control 8.15)
           Log de auditoría de seguridad con IP, marca de tiempo, usuario y
           detalle del evento, persistido en PostgreSQL con respaldo JSONL.

   RF-14 · Trazabilidad de operaciones críticas (ISO/IEC 27002, control 8.15)
           Registro inmutable de cada simulación ejecutada: usuario, cliente,
           producto recomendado y argumento comercial generado.

   RNF-13 · Protección contra inyecciones
           Sanitización y validación de toda entrada antes de tocar datos o
           rutas de sistema; las consultas se ejecutan con SQLAlchemy y
           parámetros posicionales (nunca interpolación de cadenas).

   RNF-14 · Limitación de tasa y control de origen (CORS)
           Ventana deslizante por IP y lista blanca de orígenes.

   Ley N° 29733 · Consentimiento informado
           Endpoints para registrar y consultar el consentimiento informado
           del titular con sello temporal, IP y versión de la política.
=============================================================================
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
import unicodedata
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

DIRECTORIO_SRC_PY = Path(__file__).resolve().parent
DIRECTORIO_RAIZ = DIRECTORIO_SRC_PY.parent
DIRECTORIO_LOGS = DIRECTORIO_RAIZ / "backend" / "logs"

# ---------------------------------------------------------------------------
# 1. LISTA BLANCA DE EVENTOS DE AUDITORÍA (RF-16)
# ---------------------------------------------------------------------------
AUDIT_EVENTS = {
    "login_success",
    "login_failed",
    "logout",
    "session_idle_timeout",
    "session_revoked",
    "unauthorized_access",
    "invalid_token",
    "account_disabled",
    "privilege_change",
    "user_created",
    "product_created",
    "rate_limit_exceeded",
    "scope_zone_unassigned",
    "consent_granted",
    "consent_revoked",
    "password_recovery_requested",
    "model_updated",
    "simulation_executed",
}

SEVERITIES = {"info", "warning", "critical"}

# ---------------------------------------------------------------------------
# 2. SANITIZACIÓN Y VALIDACIÓN DE ENTRADA (RNF-13)
# ---------------------------------------------------------------------------
_MAX_STRING_LENGTH = 2000
_DANGEROUS_PATTERNS = [
    re.compile(r"<\s*script", re.IGNORECASE),
    re.compile(r"javascript\s*:", re.IGNORECASE),
    re.compile(r"data\s*:\s*text/html", re.IGNORECASE),
    re.compile(r"on(error|load|click|mouseover|focus)\s*=", re.IGNORECASE),
    re.compile(r"(\bunion\b\s+\bselect\b|\bdrop\s+table\b|\binsert\s+into\b|\bdelete\s+from\b|--\s*$)", re.IGNORECASE),
]

_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_HTML_TAGS = re.compile(r"<[^>]*>")
_EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
_UUID = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", re.IGNORECASE)


def sanitize_text(value: Any, max_length: int = _MAX_STRING_LENGTH) -> str:
    """Elimina etiquetas HTML, protocolos peligrosos y caracteres de control."""
    if value is None:
        return ""
    text = str(value)
    text = _CONTROL_CHARS.sub("", text)
    text = _HTML_TAGS.sub("", text)
    text = re.sub(r"javascript\s*:", "", text, flags=re.IGNORECASE)
    return unicodedata.normalize("NFC", text)[:max_length].strip()


def has_dangerous_payload(value: Any) -> bool:
    """Detecta patrones de inyección SQL o XSS en una cadena de entrada."""
    if not isinstance(value, str):
        return False
    return any(pattern.search(value) for pattern in _DANGEROUS_PATTERNS)


def is_email(value: Any) -> bool:
    return isinstance(value, str) and len(value) <= 254 and bool(_EMAIL.match(value.strip()))


def is_uuid(value: Any) -> bool:
    return isinstance(value, str) and bool(_UUID.match(value.strip()))


def parse_int(value: Any, default: int | None = None) -> int | None:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def get_client_ip(request) -> str:
    """Resuelve la IP real detrás de Nginx (X-Forwarded-For / X-Real-IP)."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        first = forwarded.split(",")[0].strip()
        if first:
            return first
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    if request.client:
        return request.client.host
    return "0.0.0.0"


def get_user_agent(request) -> str:
    return sanitize_text(request.headers.get("user-agent"), 200)


# ---------------------------------------------------------------------------
# 3. AUTENTICACIÓN (RF-11 · servicio-a-servicio y JWT)
# ---------------------------------------------------------------------------
def service_key_configured() -> bool:
    return bool(os.getenv("ML_SERVICE_KEY"))


def validate_service_key(candidate: str | None) -> bool:
    """Valida la clave compartida entre el API Gateway (Hono) y este servicio."""
    expected = os.getenv("ML_SERVICE_KEY")
    if not expected:
        return True  # Sin clave configurada se mantiene el comportamiento histórico
    return bool(candidate) and candidate == expected


def extract_role_from_jwt(request) -> str | None:
    """
    Lee el rol declarado en el JWT de Supabase inyectado por el API Gateway
    (cabecera X-User-Role). Permite aplicar RBAC también en la capa de IA.
    """
    role = request.headers.get("x-user-role")
    return sanitize_text(role, 40).lower() or None


def is_admin(request) -> bool:
    return extract_role_from_jwt(request) == "admin"


# ---------------------------------------------------------------------------
# 4. CONEXIÓN A PostgreSQL Y LOG DE AUDITORÍA (RF-16 / RF-14)
# ---------------------------------------------------------------------------
_pool = None
_pool_lock = threading.Lock()


def _get_engine():
    """Conexión SQLAlchemy perezosa con parámetros posicionales (sin SQL dinámico)."""
    global _pool
    if _pool is not None:
        return _pool

    with _pool_lock:
        if _pool is not None:
            return _pool
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            return None
        try:
            from sqlalchemy import create_engine

            _pool = create_engine(
                database_url,
                pool_pre_ping=True,
                pool_size=3,
                max_overflow=2,
                connect_args={"sslmode": "require", "connect_timeout": 5},
            )
        except Exception as exc:  # pragma: no cover - depende del entorno
            print(f"[ML SECURITY] No se pudo crear el motor de base de datos: {exc}")
            _pool = None
        return _pool


def _append_fallback_log(tabla: str, registro: dict) -> None:
    """Respaldo JSONL cuando PostgreSQL no está disponible o no existe la tabla."""
    try:
        if not DIRECTORIO_LOGS.exists():
            DIRECTORIO_LOGS.mkdir(parents=True, exist_ok=True)
        dia = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        ruta = DIRECTORIO_LOGS / f"{tabla}-{dia}.log"
        with open(ruta, "a", encoding="utf-8") as handle:
            handle.write(json.dumps(registro, ensure_ascii=False, default=str) + "\n")
    except Exception as exc:  # pragma: no cover - disco local
        print(f"[ML SECURITY] No se pudo escribir el respaldo en disco: {exc}")


def log_security_event(
    *,
    event_type: str,
    severity: str = "info",
    user_id: str | None = None,
    user_email: str | None = None,
    user_role: str | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None,
    http_method: str | None = None,
    resource: str | None = None,
    status_code: int | None = None,
    details: dict | None = None,
) -> dict:
    """RF-16: registra un evento de seguridad. Nunca lanza excepciones."""
    ahora = datetime.now(timezone.utc)
    registro = {
        "event_time": ahora.isoformat(),
        "event_type": event_type if event_type in AUDIT_EVENTS else "unauthorized_access",
        "severity": severity if severity in SEVERITIES else "info",
        "user_id": str(user_id) if user_id else None,
        "user_email": sanitize_text(user_email, 160),
        "user_role": sanitize_text(user_role, 40),
        "ip_address": sanitize_text(ip_address, 64),
        "user_agent": sanitize_text(user_agent, 200),
        "http_method": sanitize_text(http_method, 10),
        "resource": sanitize_text(resource, 300),
        "status_code": parse_int(status_code),
        "details": details or {},
    }

    engine = _get_engine()
    if engine is not None and os.getenv("NODE_ENV") != "test":
        try:
            from sqlalchemy import text

            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        INSERT INTO public.security_audit_log (
                            event_time, event_type, severity, user_id, user_email, user_role,
                            ip_address, user_agent, http_method, resource, status_code, details
                        ) VALUES (
                            CAST(:event_time AS timestamptz), :event_type, :severity,
                            CAST(NULLIF(:user_id, '') AS uuid), :user_email, :user_role,
                            :ip_address, :user_agent, :http_method, :resource, :status_code,
                            CAST(:details AS jsonb)
                        )
                        """
                    ),
                    {
                        "event_time": registro["event_time"],
                        "event_type": registro["event_type"],
                        "severity": registro["severity"],
                        "user_id": registro["user_id"] or "",
                        "user_email": registro["user_email"],
                        "user_role": registro["user_role"],
                        "ip_address": registro["ip_address"],
                        "user_agent": registro["user_agent"],
                        "http_method": registro["http_method"],
                        "resource": registro["resource"],
                        "status_code": registro["status_code"],
                        "details": json.dumps(registro["details"], ensure_ascii=False),
                    },
                )
            return registro
        except Exception as exc:
            print(f"[ML SECURITY] PostgreSQL no disponible para auditoría ({exc}). Respaldo en disco.")
            if os.getenv("NODE_ENV") != "test":
                _append_fallback_log("security-audit", registro)
    elif os.getenv("NODE_ENV") != "test":
        _append_fallback_log("security-audit", registro)

    return registro


def log_simulation_trace(
    *,
    user_id: str | None = None,
    user_email: str | None = None,
    user_role: str | None = None,
    client_id: int | None = None,
    client_name: str | None = None,
    client_zone: str | None = None,
    recommended_product: str | None = None,
    commercial_argument: str | None = None,
    source: str = "fastapi",
    ip_address: str | None = None,
    payload: dict | None = None,
) -> dict:
    """RF-14: registro inmutable de una simulación ejecutada."""
    ahora = datetime.now(timezone.utc)
    registro = {
        "executed_at": ahora.isoformat(),
        "user_id": str(user_id) if user_id else None,
        "user_email": sanitize_text(user_email, 160),
        "user_role": sanitize_text(user_role, 40),
        "client_id": parse_int(client_id),
        "client_name": sanitize_text(client_name, 200),
        "client_zone": sanitize_text(client_zone, 120),
        "recommended_product": sanitize_text(recommended_product, 200),
        "commercial_argument": sanitize_text(commercial_argument, 1200),
        "source": sanitize_text(source, 40),
        "ip_address": sanitize_text(ip_address, 64),
        "payload": payload or {},
    }

    engine = _get_engine()
    if engine is not None:
        try:
            from sqlalchemy import text

            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        INSERT INTO public.simulation_trace_log (
                            executed_at, user_id, user_email, user_role, client_id, client_name,
                            client_zone, recommended_product, commercial_argument, source,
                            ip_address, payload
                        ) VALUES (
                            CAST(:executed_at AS timestamptz),
                            CAST(NULLIF(:user_id, '') AS uuid), :user_email, :user_role,
                            :client_id, :client_name, :client_zone, :recommended_product,
                            :commercial_argument, :source, :ip_address, CAST(:payload AS jsonb)
                        )
                        """
                    ),
                    {
                        "executed_at": registro["executed_at"],
                        "user_id": registro["user_id"] or "",
                        "user_email": registro["user_email"],
                        "user_role": registro["user_role"],
                        "client_id": registro["client_id"],
                        "client_name": registro["client_name"],
                        "client_zone": registro["client_zone"],
                        "recommended_product": registro["recommended_product"],
                        "commercial_argument": registro["commercial_argument"],
                        "source": registro["source"],
                        "ip_address": registro["ip_address"],
                        "payload": json.dumps(registro["payload"], ensure_ascii=False),
                    },
                )
            return registro
        except Exception as exc:
            print(f"[ML SECURITY] PostgreSQL no disponible para trazas ({exc}). Respaldo en disco.")
            if os.getenv("NODE_ENV") != "test":
                _append_fallback_log("simulation-trace", registro)
    elif os.getenv("NODE_ENV") != "test":
        _append_fallback_log("simulation-trace", registro)

    return registro


# ---------------------------------------------------------------------------
# 5. CONSENTIMIENTO INFORMADO — LEY N° 29733 (Art. 9° y 12°)
# ---------------------------------------------------------------------------
POLICY_VERSION = "v1.0-2026"
POLICY_EFFECTIVE_DATE = "2026-10-11"
DATA_CONTROLLER = "Laboratorios Sophia S.A."
DPO_CONTACT = "protecciondedatos@laboratoriossophia.com"

POLICY_PURPOSES = [
    {"id": "gestion_comercial", "label": "Gestión de la cartera de clientes, zonas y vendedores de la red comercial."},
    {"id": "analitica_predictiva", "label": "Modelado predictivo de demanda farmacéutica y recomendaciones terapéuticas."},
    {"id": "argumentario_xai", "label": "Generación del argumentario comercial explicable (XAI) de cada recomendación."},
    {"id": "auditoria_seguridad", "label": "Auditoría de seguridad y trazabilidad de operaciones críticas (ISO/IEC 27001)."},
    {"id": "soporte_y_mantenimiento", "label": "Soporte técnico, mantenimiento del modelo y notificaciones operativas."},
]

PURPOSE_IDS = [purpose["id"] for purpose in POLICY_PURPOSES]

INTERNATIONAL_TRANSFER = {
    "destinatario": "Supabase, Inc. (AWS us-west-2)",
    "pais": "Estados Unidos de América",
    "garantia": "Cifrado en tránsito TLS 1.2+ y en reposo AES-256; encargado de tratamiento bajo cláusulas contractuales estándar.",
}


def policy_payload() -> dict:
    """Texto del aviso de privacidad versionado para el consentimiento informado."""
    return {
        "version": POLICY_VERSION,
        "fecha_vigencia": POLICY_EFFECTIVE_DATE,
        "responsable": DATA_CONTROLLER,
        "contacto_dpd": DPO_CONTACT,
        "finalidades": POLICY_PURPOSES,
        "transferencia_internacional": INTERNATIONAL_TRANSFER,
        "derechos_arco": [
            "Acceso",
            "Rectificación",
            "Cancelación",
            "Oposición",
            "Limitación del uso",
            "Revocación del consentimiento",
        ],
    }


def save_consent(
    *,
    user_id: str,
    user_email: str | None,
    user_role: str | None,
    accepted: bool,
    purposes: Iterable[str] | None,
    ip_address: str | None,
    user_agent: str | None,
    policy_version: str = POLICY_VERSION,
) -> dict:
    """Registra el consentimiento informado en `user_consents` (Ley N° 29733)."""
    limpias = [p for p in (purposes or PURPOSE_IDS) if p in PURPOSE_IDS]
    ahora = datetime.now(timezone.utc)
    registro = {
        "user_id": str(user_id),
        "user_email": sanitize_text(user_email, 160),
        "user_role": sanitize_text(user_role, 40),
        "policy_version": sanitize_text(policy_version, 40) or POLICY_VERSION,
        "purposes": limpias,
        "granted": bool(accepted),
        "ip_address": sanitize_text(ip_address, 64),
        "user_agent": sanitize_text(user_agent, 200),
        "granted_at": ahora.isoformat(),
    }

    engine = _get_engine()
    if engine is not None:
        try:
            from sqlalchemy import text

            with engine.begin() as conn:
                conn.execute(
                    text(
                        """
                        INSERT INTO public.user_consents (
                            user_id, user_email, user_role, policy_version, purposes, granted,
                            consent_text, ip_address, user_agent, granted_at, revoked_at
                        ) VALUES (
                            CAST(:user_id AS uuid), :user_email, :user_role, :policy_version,
                            CAST(:purposes AS jsonb), :granted, :consent_text, :ip_address,
                            :user_agent, CAST(:granted_at AS timestamptz),
                            CASE WHEN :granted THEN NULL ELSE CAST(:granted_at AS timestamptz) END
                        )
                        """
                    ),
                    {
                        "user_id": registro["user_id"],
                        "user_email": registro["user_email"],
                        "user_role": registro["user_role"],
                        "policy_version": registro["policy_version"],
                        "purposes": json.dumps(registro["purposes"], ensure_ascii=False),
                        "granted": registro["granted"],
                        "consent_text": f"Consentimiento informado otorgado bajo el aviso de privacidad versión {registro['policy_version']}",
                        "ip_address": registro["ip_address"],
                        "user_agent": registro["user_agent"],
                        "granted_at": registro["granted_at"],
                    },
                )
            registro["source"] = "postgres"
            return registro
        except Exception as exc:
            print(f"[ML SECURITY] PostgreSQL no disponible para consentimiento ({exc}). Respaldo en disco.")

    if os.getenv("NODE_ENV") != "test":
        _append_fallback_log("user-consents", registro)
    registro["source"] = "fallback"
    return registro


# ---------------------------------------------------------------------------
# 6. LIMITACIÓN DE TASA POR IP (RNF-14)
# ---------------------------------------------------------------------------
_rate_windows: dict[str, deque] = defaultdict(deque)
_rate_lock = threading.Lock()


def rate_limit_exceeded(key: str, limit: int, window_seconds: int) -> bool:
    """Ventana deslizante en memoria. Devuelve True si se superó el límite."""
    if os.getenv("NODE_ENV") == "test" or os.getenv("ML_DISABLE_RATE_LIMIT") == "true":
        return False
    ahora = time.monotonic()
    with _rate_lock:
        ventana = _rate_windows[key]
        while ventana and ahora - ventana[0] > window_seconds:
            ventana.popleft()
        if len(ventana) >= limit:
            return True
        ventana.append(ahora)
        return False


def allowed_origins() -> list[str]:
    """Lista blanca de orígenes para el control CORS (RNF-14)."""
    configurado = os.getenv("ALLOWED_ORIGINS")
    if configurado:
        return [o.strip() for o in configurado.split(",") if o.strip()]
    return [
        "http://localhost:3000",
        "http://localhost:5005",
        "http://127.0.0.1:3000",
        "https://tallerintegrador1.diegoproyectos.me:5002",
        "https://taller2.diegoproyectos.me:5002",
    ]
