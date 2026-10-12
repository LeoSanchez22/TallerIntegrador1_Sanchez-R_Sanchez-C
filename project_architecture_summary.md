# Resumen Arquitectónico del Proyecto: Sophia XAI

Plataforma inteligente de soporte a la decisión comercial (DSS / XAI) desarrollada para **Laboratorios Sophia**, orientada a pronósticos de demanda farmacéutica y recomendaciones clínicas para productos oftalmológicos.

---

## 1. Visión General de la Arquitectura

El proyecto está diseñado bajo un modelo de **microservicios desacoplados**, permitiendo escalabilidad independiente entre la interfaz de usuario, la lógica de negocio y los motores predictivos de Machine Learning.

```mermaid
flowchart TD
    Client(["Clientes: Ventas & Administradores"]) -->|HTTPS :5002| Nginx["Nginx Reverse Proxy\n(SNI + SSL Let's Encrypt)"]

    subgraph VPS ["VPS Ubuntu 24.04 (PM2 Runtime)"]
        Nginx -->|/ (HTML/RSC)| Frontend["Frontend (Next.js 15)\nTaller 1: :5008 | Taller 2: :5018"]
        Nginx -->|/api/* & /model/*| Backend["Backend (Hono.js / Node.js)\nTaller 1: :5007 | Taller 2: :5017"]
        Backend -->|REST / HTTP| FastAPI["Microservicio ML (Python / FastAPI)\nTaller 1: :8000 | Taller 2: :8001"]
        Backend -.->|Fallback CLI| PredictCLI["src_py/predict.py"]
    end

    subgraph Cloud ["Servicios Externos Cloud"]
        Backend -->|PostgreSQL Pool :5432| SupabaseDB[("Supabase PostgreSQL\n(ventas_detalle, ventas_base)")]
        Frontend -->|Auth API :443| SupabaseAuth["Supabase Auth (JWKS)"]
        Backend -->|Verificación JWKS ES256/HS256| SupabaseAuth
    end
```

---

## 2. Componentes del Sistema

### A. Frontend (`frontend/`)
* **Framework:** Next.js 15 (React 19, App Router, TypeScript).
* **Diseño:** TailwindCSS, paleta institucional Sophia (`#113f9c` y `#131f36`), iconos Lucide React.
* **Autenticación:** Supabase Auth SDK (`@supabase/supabase-js`) con persistencia de sesiones seguras y middleware de protección de rutas `/app`.
* **Consumo de API:** Arquitectura de rutas relativas (`API_URL = ''`), permitiendo que Nginx o los rewrites de Next.js enruten el tráfico hacia el backend sin problemas de CORS ni bloqueo de puertos locales.
* **Vistas principales:**
  * `/login`: Portal de inicio de sesión con branding farmacéutico.
  * `/app`: Dashboard comercial y KPI ejecutivos (colirios más prescritos, recurrencia, valor del portafolio).
  * `/app/recommendations`: Motor interactivo de recomendaciones terapéuticas por cliente.
  * `/app/forecasting`: Proyección de demanda estacional.
  * `/app/clients`: Gestión y análisis de cartera de clientes.

### B. Backend API (`backend/`)
* **Framework:** Hono.js sobre Node.js runtime.
* **Seguridad & JWT:** Middleware de validación dual (tokens ES256 asimétricos con caché JWKS de Supabase y tokens simétricos HS256).
* **Rendimiento de Base de Datos:**
  * Conexión directa a Supabase PostgreSQL mediante `pg.Pool`.
  * **Caché en RAM:** Precarga 4,725 registros de transacciones comerciales al inicio (`db.js`) para respuestas sub-milisegundo.
  * **Tolerancia a fallos:** Si la base de datos externa no responde, activa automáticamente el modo offline respaldado en CSV intermedios.
* **Endpoints principales:**
  * `/api/users/me`: Perfil y rol del usuario autenticado.
  * `/api/dashboard`: Métricas de negocio y gráficos de tendencias.
  * `/api/clientes`: Listado paginado y filtrado de cartera de clientes.
  * `/api/proyeccion/:cliente_id`: Orquestador que consulta al microservicio FastAPI o ejecuta el fallback CLI en Python.

### C. Motor Predictivo & XAI (`src_py/`)
* **Framework:** FastAPI + Uvicorn / scripts CLI ejecutables.
* **Modelos y Algoritmos:**
  * **Redes Neuronales (Deep Learning):** Arquitectura Attention-GRU (`modelo_sophia_final.pt` con PyTorch) para modelado de secuencias de compra.
  * **Reglas de Asociación:** Algoritmo Apriori (`mlxtend`) para identificar combinaciones y sinergias entre fármacos oftalmológicos.
  * **Segmentación:** K-Means clustering (`scikit-learn`) para perfilar patrones de consumo de farmacias e instituciones.
  * **Tendencias Polinomiales:** Ajuste de curvas para estimar límites superiores e inferiores de demanda.
  * **Filtros de Seguridad Clínica:** Validación de reglas médicas para evitar recomendaciones contraindicadas.
  * **Explicabilidad (XAI):** Generación de justificaciones textuales claras para el equipo de ventas explicando el "por qué" de cada recomendación.

---

## 3. Topología de Despliegue en VPS

La infraestructura corre en paralelo para dos entornos aislados:

| Componente | Taller Integrador 1 (develop) | Taller 2 (feature/presentación-taller2) |
| :--- | :--- | :--- |
| **Directorio** | `/var/www/g2-diegoleo` | `/var/www/g2-diegoleo/taller2` |
| **Dominio** | `tallerintegrador1.diegoproyectos.me` | `taller2.diegoproyectos.me` |
| **Puerto Frontend** | `5008` (PM2: `sophia-frontend`) | `5018` (PM2: `taller2-frontend`) |
| **Puerto Backend** | `5007` (PM2: `sophia-backend`) | `5017` (PM2: `taller2-backend`) |
| **Puerto FastAPI** | `8000` (PM2: `sophia-fastapi`) | `8001` (PM2: `taller2-fastapi`) |
| **Entrada Pública** | HTTPS puerto `5002` (Nginx SNI) | HTTPS puerto `5002` (Nginx SNI) |
