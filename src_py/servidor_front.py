import os
import sys
import threading
import subprocess
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path

# Asegurar que el directorio raíz y src_py estén en el path
DIRECTORIO_SRC_PY = Path(__file__).resolve().parent
DIRECTORIO_RAIZ = DIRECTORIO_SRC_PY.parent
sys.path.append(str(DIRECTORIO_RAIZ))
sys.path.append(str(DIRECTORIO_SRC_PY))

# Cargar .env de la raíz
from dotenv import load_dotenv
load_dotenv(dotenv_path=DIRECTORIO_RAIZ / ".env")

try:
    from predict import predecir, cargar_compras_supabase
    from content_recommender import registrar_producto_nuevo, MotorContenido
except ImportError:
    from src_py.predict import predecir, cargar_compras_supabase
    from src_py.content_recommender import registrar_producto_nuevo, MotorContenido

app = FastAPI(title="Laboratorios Sophia AI Microservice") 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lock para evitar entrenamientos simultáneos
training_lock = threading.Lock()
is_training = False
training_logs = []

class ProductoNuevoSchema(BaseModel):
    nombre: str
    sub_familia: str
    indicacion: str
    composicion: str
    formato: str

def run_training_subprocess():
    global is_training, training_logs
    try:
        training_logs.append("=== INICIANDO ENTRENAMIENTO ===")
        # Ejecutar train.py en un subproceso
        cmd = [sys.executable, str(DIRECTORIO_SRC_PY / "train.py")]
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            cwd=str(DIRECTORIO_RAIZ)
        )
        
        for line in process.stdout:
            training_logs.append(line.strip())
            # Limitar tamaño de logs en memoria
            if len(training_logs) > 500:
                training_logs.pop(0)
                
        process.wait()
        if process.returncode == 0:
            training_logs.append("=== ENTRENAMIENTO COMPLETADO CON ÉXITO ===")
        else:
            training_logs.append(f"=== ENTRENAMIENTO FINALIZÓ CON ERROR (CÓDIGO {process.returncode}) ===")
    except Exception as e:
        training_logs.append(f"=== ERROR CRÍTICO EN ENTRENAMIENTO: {str(e)} ===")
    finally:
        is_training = False

@app.get("/")
def home():
    return {"status": "active", "service": "Sophia AI Service"}

@app.get("/api/proyeccion/{cliente_id}")
def obtener_proyeccion(cliente_id: int):
    try:
        result = predecir(cliente_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al realizar predicción: {str(e)}")

@app.get("/api/productos/nuevos")
def obtener_productos_nuevos():
    try:
        import json
        ruta_json = DIRECTORIO_SRC_PY / "data" / "productos_metadata.json"
        if ruta_json.exists():
            with open(ruta_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            lista = []
            for k, v in data.items():
                lista.append({
                    "nombre": k,
                    "sub_familia": v.get("sub_familia", ""),
                    "indicacion": v.get("indicacion", ""),
                    "composicion": v.get("composicion", ""),
                    "formato": v.get("formato", ""),
                })
            return lista
        return []
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener productos nuevos: {str(e)}")

@app.post("/api/productos/registrar")
def registrar_producto(prod: ProductoNuevoSchema):
    try:
        ruta_json = DIRECTORIO_SRC_PY / "data" / "productos_metadata.json"
        # Crear directorios padres si no existen
        ruta_json.parent.mkdir(parents=True, exist_ok=True)
        
        meta_guardada = registrar_producto_nuevo(
            nombre=prod.nombre.strip(),
            sub_familia=prod.sub_familia,
            indicacion=prod.indicacion.strip(),
            composicion=prod.composicion.strip(),
            formato=prod.formato,
            ruta=ruta_json
        )
        return {"success": True, "producto": meta_guardada}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al registrar producto: {str(e)}")

@app.get("/api/productos/similitud/{nombre}")
def obtener_similitud_producto_nuevo(nombre: str):
    try:
        compras_ctx = cargar_compras_supabase()
        if compras_ctx is None:
            raise HTTPException(status_code=500, detail="Base de datos local no encontrada.")
        
        ruta_json = DIRECTORIO_SRC_PY / "data" / "productos_metadata.json"
        motor = MotorContenido(compras_ctx, ruta_json)
        
        clave = nombre.upper().strip()
        if clave not in motor.registro:
            raise HTTPException(status_code=404, detail=f"Producto '{nombre}' no registrado.")
            
        df_sim = motor.tabla_similitud_producto_nuevo(clave)
        if df_sim.empty:
            return []
            
        result = df_sim.to_dict(orient="records")
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener similitud: {str(e)}")

@app.post("/api/train")
def iniciar_entrenamiento(background_tasks: BackgroundTasks):
    global is_training, training_logs
    if is_training:
        return {"status": "running", "message": "El modelo ya se está entrenando.", "logs": training_logs[-20:]}
        
    if training_lock.acquire(blocking=False):
        is_training = True
        training_logs = []
        background_tasks.add_task(run_training_subprocess)
        training_lock.release()
        return {"status": "started", "message": "Entrenamiento iniciado en segundo plano."}
    else:
        return {"status": "running", "message": "El modelo ya se está entrenando."}

@app.get("/api/train/status")
def obtener_estado_entrenamiento():
    global is_training, training_logs
    return {
        "is_training": is_training,
        "logs": training_logs
    }