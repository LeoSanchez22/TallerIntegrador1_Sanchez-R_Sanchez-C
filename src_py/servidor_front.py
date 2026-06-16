from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI() 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

RUTA_PARQUET = "produccion/recomendaciones_sprint1.parquet"

@app.get("/api/clientes")
def obtener_lista_clientes():
    df = pd.read_parquet(RUTA_PARQUET)
    clientes_unicos = df['cliente_id'].unique().tolist()
    return {"clientes_disponibles": clientes_unicos}

@app.get("/api/recomendaciones/{cliente_id}")
def obtener_recomendacion(cliente_id: int):
    df = pd.read_parquet(RUTA_PARQUET)
    df_cliente = df[df['cliente_id'] == cliente_id]
    
    if df_cliente.empty:
        return {"mensaje": "No hay recomendaciones para este cliente"}
    
    resultados = df_cliente.to_dict(orient="records")
    return {"cliente_id": cliente_id, "datos": resultados}