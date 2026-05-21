# Guía de Entorno CI/CD y Despliegue Automatizado a VPS

Esta guía detalla el funcionamiento de la Integración y Despliegue Continuo (CI/CD) implementado para **Laboratorios Sophia**. El pipeline automatiza la ejecución de pruebas unitarias y de tipado al realizar commits en la rama de desarrollo (`develop`/`develo`/`main`), y despliega de manera inmediata los cambios en su VPS utilizando **PM2** y **Nginx**.

---

## ⚙️ Arquitectura del Pipeline

El pipeline de GitHub Actions se compone de dos etapas principales:

```
[ Commit / Push a rama de desarrollo ]
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
│  - git pull en VPS     │  │      🛑 FALLIDO        │
│  - npm install         │  │ (No se altera el VPS)  │
│  - npm run build (Front)│  └────────────────────────┘
│  - pm2 reload [Apps]   │
│  - nginx-reload-g2     │
└────────────────────────┘
```

---

## 🔑 Configuración de Secretos en GitHub

Para que el despliegue automático funcione de forma segura, debe agregar las siguientes variables en la sección de secretos de su repositorio de GitHub:

1. Ingrese a su repositorio en GitHub.
2. Vaya a **Settings** (Configuración) -> **Secrets and variables** (Secretos y variables) -> **Actions** (Acciones).
3. Haga clic en **New repository secret** (Nuevo secreto de repositorio) para agregar cada uno de los siguientes:

| Nombre del Secreto | Descripción | Valor Ejemplo |
| :--- | :--- | :--- |
| **`SSH_HOST`** | La dirección IP pública o subdominio de su VPS. | `tallerintegrador1.diegoproyectos.me` |
| **`SSH_USERNAME`** | El usuario del VPS con el que se conecta vía SSH. | `ubuntu` o `diegosanchez` |
| **`SSH_PRIVATE_KEY`** | El contenido completo de su clave SSH privada (generalmente en `~/.ssh/id_rsa` de su máquina local autorizada). | `-----BEGIN OPENSSH PRIVATE KEY----- ...` |
| **`SSH_PORT`** | *(Opcional)* Puerto SSH si no utiliza el puerto estándar 22. | `22` |

---

## 🚀 Procesos Administrados en el VPS por PM2

En su VPS, las aplicaciones ya se encuentran iniciadas y registradas con nombres específicos en PM2:

* **Backend Hono:** `sophia-backend` (ejecutándose en el puerto **5007**)
* **Frontend Next.js:** `sophia-frontend` (ejecutándose en el puerto **5008**)

El pipeline de CD utiliza el comando `pm2 reload` que recarga el código "en caliente" (zero-downtime) sin detener el servicio. En caso de fallar, realiza un fallback automático a `pm2 restart`.

### Comandos Útiles de PM2 en el VPS:

Para monitorear o gestionar manualmente los servicios en su VPS, conéctese vía SSH y ejecute:

```bash
# Ver el estado y consumo de todos los servicios
pm2 list

# Monitorear logs en tiempo real del Backend
pm2 logs sophia-backend

# Monitorear logs en tiempo real del Frontend
pm2 logs sophia-frontend

# Reiniciar manualmente el Backend
pm2 restart sophia-backend

# Reiniciar manualmente el Frontend
pm2 restart sophia-frontend
```

---

## 🌐 Configuración de Nginx y Recarga (`nginx-reload-g2`)

El servidor web **Nginx** actúa como proxy inverso en el puerto **5002** (HTTPS con SSL configurado). Su bloque de servidor está configurado exactamente así:

```nginx
server {
    listen 5002 ssl;
    listen [::]:5002 ssl;
    server_name tallerintegrador1.diegoproyectos.me;

    # Certificados SSL
    ssl_certificate /etc/letsencrypt/live/tallerintegrador1.diegoproyectos.me/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/tallerintegrador1.diegoproyectos.me/privkey.pem;

    # Backend API de Diego (Redirección al puerto 5007 de PM2)
    location /api/ {
        proxy_pass http://[::1]:5007;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Frontend Next.js de Diego (Redirección al puerto 5008 de PM2)
    location / {
        proxy_pass http://[::1]:5008;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Dado que su usuario no posee privilegios sudo totales, al final del despliegue automático el pipeline ejecuta:
```bash
nginx-reload-g2
```
Este script local refresca la caché de Nginx de manera segura y sin interrupciones.

---

## 📓 Integración y Administración de Jupyter Notebooks en el Despliegue

Para hacer que **Jupyter Notebook** funcione perfectamente con este flujo de despliegue y se mantenga actualizado, el sistema opera bajo los siguientes pilares:

### 1. Sincronización Automática de Notebooks y Scripts (.ipynb, .py)
Dado que el pipeline de GitHub Actions ejecuta `git pull` en la raíz `/var/www/g2-diegoleo` del VPS, **todos sus cuadernos de Jupyter (`.ipynb`), datasets (`.csv`) y scripts de Python (`app.py`, `pipeline_recomendaciones_mvp.py`) se actualizan automáticamente** en el VPS cada vez que hace push a su rama de desarrollo. 
Al recargar o abrir su Jupyter en el navegador, verá la última versión de sus archivos sincronizada de inmediato.

### 2. Cómo mantener Jupyter siempre corriendo en el VPS (usando PM2)
Al igual que sus servicios Node, la mejor práctica para ejecutar Jupyter en un entorno VPS sin depender de `sudo` ni de sesiones de terminal abiertas (que se cierran al desconectarse) es **ejecutarlo mediante PM2**. Esto garantiza que Jupyter se inicie automáticamente en el arranque del servidor y se recupere ante cualquier fallo.

Para registrar Jupyter en PM2, ejecute el siguiente comando una sola vez en su terminal del VPS:

```bash
# Si utiliza el entorno de Python global
pm2 start "jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser" --name "sophia-jupyter"

# Si utiliza un entorno virtual (recomendado, ej. carpeta venv en su proyecto)
pm2 start "/var/www/g2-diegoleo/venv/bin/jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser" --name "sophia-jupyter"
```

A partir de ese momento, Jupyter estará bajo el control de PM2. Puede verificarlo, ver logs y reiniciarlo con:
```bash
pm2 list
pm2 logs sophia-jupyter
pm2 restart sophia-jupyter
```

### 3. Actualización Automática de Librerías de Python en el Despliegue
Si su proyecto de Python requiere instalar dependencias adicionales de forma automática en cada despliegue, puede añadir este bloque al script del pipeline en `.github/workflows/ci.yml` (sección del script del VPS):

```bash
# Opcional: Si cuenta con un entorno virtual venv y un archivo requirements.txt
if [ -f "/var/www/g2-diegoleo/requirements.txt" ]; then
    echo "🐍 Actualizando dependencias de Python (Pip)..."
    /var/www/g2-diegoleo/venv/bin/pip install -r /var/www/g2-diegoleo/requirements.txt
fi
```
*(Esto es ideal para que las actualizaciones de paquetes de PyTorch, Streamlit o Pandas ocurran de forma autónoma sin intervención manual).*

---

## 🛠️ Resolución de Problemas Comunes

### 1. El pipeline de GitHub Actions se detiene en la etapa de Test
* **Causa:** Falló alguna prueba de tipos de TypeScript en el Frontend (`tsc --noEmit`) o falló la prueba inicial del Backend (`node --test`).
* **Solución:** Revise el log del error de GitHub Actions. Corrija los errores en local ejecutando `npm run test` dentro del respectivo componente y haga push con la solución.

### 2. El pipeline se detiene en la etapa de Deploy con error SSH
* **Causa:** El VPS bloqueó la conexión o la clave privada SSH no está guardada correctamente en los secretos de GitHub.
* **Solución:** Verifique que el secreto `SSH_PRIVATE_KEY` contenga la llave privada completa (incluyendo las líneas de inicio y fin). Asegúrese de que el VPS acepte conexiones del rango de IPs de GitHub Actions o que no haya reglas de firewall estrictas bloqueándolo.

### 3. Cambios no se reflejan
* **Causa:** Los procesos de PM2 no pudieron recargarse o Next.js no compiló adecuadamente en el VPS.
* **Solución:** Conéctese al VPS y revise los logs usando `pm2 logs sophia-frontend`. También compruebe el comando `git status` en la carpeta `/var/www/g2-diegoleo` para asegurar que el repositorio local está sincronizado.
