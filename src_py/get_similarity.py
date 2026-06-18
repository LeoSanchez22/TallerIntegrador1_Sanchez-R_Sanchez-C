import sys
import json
import pandas as pd
from pathlib import Path

# Add root directory to sys.path
DIRECTORIO_RAIZ = Path(__file__).resolve().parent.parent
sys.path.append(str(DIRECTORIO_RAIZ))

from src_py.predict import cargar_compras_supabase
from src_py.content_recommender import MotorContenido

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Debe especificar el nombre del producto nuevo."}))
        sys.exit(1)
        
    nombre_nuevo = sys.argv[1]
    compras_ctx = cargar_compras_supabase()
    if compras_ctx is None:
        print(json.dumps({"error": "Base de datos local no encontrada."}))
        sys.exit(1)
        
    ruta_json = Path(__file__).resolve().parent / "data" / "productos_metadata.json"
    motor = MotorContenido(compras_ctx, ruta_json)
    
    clave = nombre_nuevo.upper().strip()
    if clave not in motor.registro:
        print(json.dumps({"error": f"Producto '{nombre_nuevo}' no registrado."}))
        sys.exit(1)
        
    df_sim = motor.tabla_similitud_producto_nuevo(clave)
    if df_sim.empty:
        print(json.dumps([]))
    else:
        print(json.dumps(df_sim.to_dict(orient="records"), ensure_ascii=False))

if __name__ == "__main__":
    main()
