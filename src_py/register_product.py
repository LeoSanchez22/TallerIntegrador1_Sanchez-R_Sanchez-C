import sys
from pathlib import Path
from content_recommender import registrar_producto_nuevo, METADATA_JSON_PATH

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

if __name__ == "__main__":
    if len(sys.argv) < 6:
        print("Error: Parámetros insuficientes")
        sys.exit(1)
        
    nombre = sys.argv[1]
    sub_familia = sys.argv[2]
    indicacion = sys.argv[3]
    composicion = sys.argv[4]
    formato = sys.argv[5]
    
    try:
        res = registrar_producto_nuevo(
            nombre=nombre,
            sub_familia=sub_familia,
            indicacion=indicacion,
            composicion=composicion,
            formato=formato,
            ruta=METADATA_JSON_PATH
        )
        print("SUCCESS")
    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
