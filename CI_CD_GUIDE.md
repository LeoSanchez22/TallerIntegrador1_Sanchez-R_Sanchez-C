# Guía de Entorno CI/CD y Despliegue Automatizado a VPS (`/var/www/g2-diegoleo`)

Esta guía detalla el funcionamiento de la Integración y Despliegue Continuo (CI/CD) implementado para **Laboratorios Sophia**, operando directamente en el directorio central `/var/www/g2-diegoleo` y gestionando los servicios en PM2 y Nginx de forma automatizada:
* **Directorio en VPS**: `/var/www/g2-diegoleo`
* **Dominio**: `tallerintegrador1.diegoproyectos.me` (y `taller2.diegoproyectos.me`)
* **Puerto Proxy Nginx**: Puerto `5002` SSL

---

## ⚙️ Arquitectura de Servicios y Puertos en PM2

| Servicio | Nombre en PM2 | Puerto | Descripción |
| :--- | :--- | :--- | :--- |
| **Backend API (Hono)** | `sophia-backend` | **5007** | API REST, conexión Supabase PostgreSQL, autenticación y CRUD |
| **Frontend (Next.js)** | `sophia-frontend` | **5008** | Interfaz React 19 / Next.js 15 compilada |
| **Microservicio ML (FastAPI)** | `sophia-fastapi` | **8000** | Motor analítico XAI y modelos predictivos |
| **Jupyter Notebook** | `sophia-jupyter` | **8888** | Cuaderno de investigación y experimentación |

---

## 🚀 Flujo del Pipeline GitHub Actions

```
[ Git Push desde Local ]
         │
         ▼
┌────────────────────────────────────────┐
│         ETAPA 1: INTEGRACIÓN (CI)      │
│  - Pruebas del Backend (Node --test)   │
│  - Chequeo de Tipos (TypeScript tsc)   │
│  - Compilación Next.js (next build)    │
└───────────────────┬────────────────────┘
                    │
           ¿Pruebas Exitosas?
                    │
         ┌──────────┴──────────┐
        SÍ                    NO
         │                     │
         ▼                     ▼
┌────────────────────────┐  ┌────────────────────────┐
│   ETAPA 2: CD (VPS)    │  │       Pipeline         │
│  - Conexión SSH a VPS  │  │      🛑 FALLIDO        │
│  - cd /var/www/g2-...  │  │ (No se altera el VPS)  │
│  - git pull origin     │  └────────────────────────┘
│  - npm install (Back)  │
│  - pm2 reload back     │
│  - pm2 reload fastapi  │
│  - npm run build (Fr)  │
│  - pm2 reload front    │
│  - nginx-reload-g2     │
└────────────────────────┘
```

---

## 🌐 Configuración Unificada de Nginx (`/etc/nginx/sites-available/g2-diegoleo`)

Todo se encuentra centralizado en un único archivo de configuración para Nginx que atiende a ambos dominios (`tallerintegrador1.diegoproyectos.me` y `taller2.diegoproyectos.me`):

```nginx
# ==============================================================================
# BLOQUE 1: TALLER INTEGRADOR 1 (PRODUCCIÓN / DESARROLLO)
# Dominio: tallerintegrador1.diegoproyectos.me | Backend: 5007 | Frontend: 5008
# ==============================================================================
server {
    listen 5002 ssl;
    listen [::]:5002 ssl;

    server_name tallerintegrador1.diegoproyectos.me;

    # Certificados SSL de Diego (Taller 1)
    ssl_certificate /etc/letsencrypt/live/tallerintegrador1.diegoproyectos.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tallerintegrador1.diegoproyectos.me/privkey.pem;

    location = /api/proyeccion/explicacion {
        proxy_pass http://[::1]:5008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API de Diego (Hono Puerto 5007)
    location /api/ {
        proxy_pass http://[::1]:5007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /jupyter/ {
        proxy_pass http://[::1]:8888;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Soporte obligatorio para WebSockets de Jupyter
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # Redireccionar subida de modelo directamente a Hono
    location /model/upload {
        proxy_pass http://[::1]:5007/model/upload;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    
        client_max_body_size 100M;
    }

    # Frontend Next.js de Diego (Puerto 5008)
    location / {
        proxy_pass http://[::1]:5008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# ==============================================================================
# BLOQUE 2: TALLER 2 (PRESENTACIÓN / EVALUACIÓN)
# Dominio: taller2.diegoproyectos.me | Backend: 5017 | Frontend: 5018
# ==============================================================================
server {
    listen 5002 ssl;
    listen [::]:5002 ssl;

    server_name taller2.diegoproyectos.me;

    # Certificados SSL para Taller 2 (o comodín de diegoproyectos.me)
    ssl_certificate /etc/letsencrypt/live/tallerintegrador1.diegoproyectos.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tallerintegrador1.diegoproyectos.me/privkey.pem;

    location = /api/proyeccion/explicacion {
        proxy_pass http://[::1]:5018;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API de Taller 2 (Hono Puerto 5017)
    location /api/ {
        proxy_pass http://[::1]:5017;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Redireccionar subida de modelo directamente a Hono Taller 2
    location /model/upload {
        proxy_pass http://[::1]:5017/model/upload;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    
        client_max_body_size 100M;
    }

    # Frontend Next.js de Taller 2 (Puerto 5018)
    location / {
        proxy_pass http://[::1]:5018;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

> **Recargar Nginx:**
> ```bash
> nginx-reload-g2
> ```

---

## 🛠️ Comandos de Inicialización Rápida en el VPS (Primera Vez)

Si vas a levantar **Taller 2** por primera vez en el VPS, puedes ejecutar:

```bash
# 1. Crear directorio y clonar rama de Taller 2
cd /var/www
git clone https://github.com/LeoSanchez22/TallerIntegrador1_Sanchez-R_Sanchez-C.git g2-taller2
cd /var/www/g2-taller2
git checkout feature/presentación-taller2

# 2. Copiar archivos de entorno
cp /var/www/g2-diegoleo/.env /var/www/g2-taller2/.env
cp /var/www/g2-diegoleo/backend/.env /var/www/g2-taller2/backend/.env
cp /var/www/g2-diegoleo/frontend/.env.local /var/www/g2-taller2/frontend/.env.local

# 3. Iniciar Backend Taller 2 en PM2 (Puerto 5017)
cd /var/www/g2-taller2/backend
npm install --omit=dev
PORT=5017 FASTAPI_URL=http://127.0.0.1:8001 pm2 start src/index.js --name "taller2-backend"

# 4. Iniciar Frontend Taller 2 en PM2 (Puerto 5018)
cd /var/www/g2-taller2/frontend
npm install
npm run build
PORT=5018 pm2 start "npm run start -- -p 5018" --name "taller2-frontend"

# 5. Guardar estado de PM2
pm2 save
```

---

## 📊 Monitoreo y Comandos de PM2

```bash
# Ver lista de todas las aplicaciones activas (Taller 1 + Taller 2)
pm2 list

# Ver logs de Taller 2
pm2 logs taller2-frontend
pm2 logs taller2-backend

# Ver logs de Taller 1
pm2 logs sophia-frontend
pm2 logs sophia-backend
```

