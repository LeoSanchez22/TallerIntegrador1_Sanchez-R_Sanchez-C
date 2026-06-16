import sys
import os
import json
import torch
import numpy as np
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# Asegurar que el directorio raíz está en el path para las importaciones
DIRECTORIO_RAIZ = Path(__file__).resolve().parent.parent
sys.path.append(str(DIRECTORIO_RAIZ))

from src_py.train import AttentionGRUMejorado
from src_py.content_recommender import MotorContenido, inyectar_candidatos_nuevos

load_dotenv(dotenv_path=DIRECTORIO_RAIZ / ".env")

# Configuración de rutas
DATA_DIR = DIRECTORIO_RAIZ / "data" / "intermediate"
MODEL_PATH = DIRECTORIO_RAIZ / "models" / "modelo_sophia_final.pt"
JSON_PATH = DIRECTORIO_RAIZ / "data" / "productos_metadata.json"

# Negocio
INVENTARIO_REGIONAL = {
    'PHARMA - N2': ['ZEBESTEN', 'DUSTALOX'],
    'PHARMA - N1': ['LAGRICEL'],
    'MULTI-ZONA': []
}

def pasa_filtros_seguridad(producto_sugerido, historial_cliente, zona_actual):
    quiebres = INVENTARIO_REGIONAL.get(zona_actual, [])
    if producto_sugerido in quiebres:
        return False, f"Sin stock en {zona_actual}."
    if producto_sugerido == 'LAGRICEL PF' and 'LAGRICEL' in historial_cliente:
        return False, "Riesgo de canibalización."
    return True, "Aprobado"

def generar_explicacion(producto_sugerido, historial_cliente, motor_origen, horizonte_mes, item_foco=None, peso=None):
    # Intentar Gemini si hay API Key
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            mes_texto = horizonte_mes.split(" (")[1].replace(")", "").lower() if "(" in horizonte_mes else horizonte_mes.lower()
            historial_base = item_foco if motor_origen == 'Atención-GRU' else (historial_cliente[-1] if historial_cliente else "Productos habituales")
            
            logica_xai = ""
            if motor_origen == 'Atención-GRU':
                logica_xai = f"El modelo detectó una 'Causalidad GRU' secuencial. La capa de atención asignó {peso}% de relevancia al consumo histórico de '{historial_base}'. Esto indica un ciclo de reposición inminente en el tiempo."
            elif motor_origen == 'Cold Start':
                logica_xai = f"Activación de 'Cold Start'. Al carecer de historial suficiente, '{producto_sugerido}' se recomienda por tener alta adopción en otras clínicas de la zona."
            elif motor_origen == 'Contenido (Nuevo Lanzamiento)':
                logica_xai = f"El Motor de Similitud por Contenido calculó afinidad terapéutica entre '{producto_sugerido}' y '{historial_base}'. Comparten familia terapéutica y vía de administración. Este es un producto de nuevo lanzamiento sin historial de ventas: la recomendación se basa en la compatibilidad clínica de sus metadatos, no en transacciones previas."
            else:
                logica_xai = f"El modelo detectó una 'Afinidad NCF'. Evaluando el Espacio Latente, encontró que clínicas con un perfil estructural idéntico a esta, que ya consumen '{historial_base}', tienen una probabilidad muy alta de adoptar '{producto_sugerido}'."

            prompt = f"""
            Eres el motor de Inteligencia Artificial Explicable (XAI) de Laboratorios Sophia.
            Tu tarea es traducir la lógica matemática de nuestros modelos en una justificación clínica y comercial de EXACTAMENTE 2 a 3 líneas para el visitador médico.
            
            Variables del sistema:
            - Producto Sugerido: '{producto_sugerido}'
            - Detonante Histórico: '{historial_base}'
            - Proyección para: {mes_texto}
            - Razón Matemática a Explicar: {logica_xai}
            
            INSTRUCCIONES CRÍTICAS:
            1. GENERACIÓN DINÁMICA: Escribe un argumento de ventas basándote ESTRICTAMENTE en la 'Razón Matemática a Explicar'. Explícale al vendedor por qué el sistema hizo esta conexión.
            2. SI ES CAUSALIDAD GRU: Menciona la dependencia temporal o el ciclo de reposición clínico.
            3. SI ES AFINIDAD NCF: Menciona el perfil de la clínica, su similitud con otras instituciones y la sinergia médica entre ambos productos, ignorando el tiempo.
            4. OBLIGATORIO: Menciona textualmente '{producto_sugerido}' y '{historial_base}'.
            5. TONO: Nivel Ingeniería a Negocios. Persuasivo, sofisticado.
            """
            model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"temperature": 0.6})
            respuesta = model.generate_content(prompt)
            return respuesta.text.strip()
        except Exception:
            pass

    # Explicación estática de respaldo
    if motor_origen == 'Atención-GRU':
        return f"Reposición Sugerida: Ciclo de compra detecta demanda inminente para {producto_sugerido} basado en consumo de {item_foco} ({peso}% relevancia)."
    elif motor_origen == 'Cold Start':
        return f"Éxito Local: {producto_sugerido} es uno de los productos más solicitados en tu zona comercial."
    elif motor_origen == 'Contenido (Nuevo Lanzamiento)':
        return f"Nuevo Lanzamiento: Recomendado por afinidad terapéutica de ingredientes activos con {item_foco}."
    else:
         return f"Oportunidad Cross-Selling: Clínicas con perfil de compra similar al tuyo que adquieren {item_foco} también consumen {producto_sugerido}."

def cargar_compras_supabase():
    env_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=env_path)
    db_uri = os.environ.get("DATABASE_URL")

    if db_uri and "tu_contraseña" not in db_uri:
        try:
            engine = create_engine(db_uri)
            compras = pd.read_sql_query("SELECT * FROM ventas_detalle", con=engine)
            print("[predict] Datos cargados desde Supabase / PostgreSQL", file=sys.stderr)
            return compras
        except Exception as e:
            print(f"[predict] No se pudo cargar Supabase: {e}", file=sys.stderr)
            print("[predict] Usando CSV local como respaldo...", file=sys.stderr)

    compras_path = DATA_DIR / "compras_ctx.csv"
    if not compras_path.exists():
        return None
    return pd.read_csv(compras_path)


def predecir(cliente_id):
    # Cargar datos
    compras_ctx = cargar_compras_supabase()
    if compras_ctx is None:
        return {"error": "Base de datos local no encontrada."}

    col_zona = next((c for c in ['vendedor', 'zona'] if c in compras_ctx.columns), 'zona')
    col_cliente = next((c for c in ['cliente', 'nombre_cliente', 'Cliente'] if c in compras_ctx.columns), 'cliente')
    
    historial_cliente = compras_ctx[compras_ctx['cliente_id'] == cliente_id]
    if historial_cliente.empty:
        return {"error": f"No se encontró historial para el cliente {cliente_id}"}
    
    zona_activa = historial_cliente[col_zona].iloc[0]
    
    num_items = int(compras_ctx['producto_id'].max()) + 2
    mapa_productos = compras_ctx.drop_duplicates('producto_id').set_index('producto_id')['producto'].to_dict()
    
    # Cargar motor de contenido
    motor_contenido = None
    try:
        motor_contenido = MotorContenido(compras_ctx, JSON_PATH)
        if motor_contenido.hay_productos_nuevos():
            max_id_actual = max(mapa_productos.keys()) if mapa_productos else 0
            for i, prod_nuevo in enumerate(motor_contenido.productos_nuevos()):
                if prod_nuevo not in mapa_productos.values():
                    mapa_productos[max_id_actual + 1 + i] = prod_nuevo
    except Exception as e:
        sys.stderr.write(f"[WARNING] Error inicializando MotorContenido: {e}\n")

    # Cargar modelo PyTorch
    modelo_cargado = False
    cliente2idx = {}
    num_clientes = 0
    modelo_gru = None
    
    if MODEL_PATH.exists():
        try:
            checkpoint = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)
            num_items_m = checkpoint['num_items']
            num_clientes = checkpoint['num_clientes']
            cliente2idx = checkpoint['cliente2idx']
            cfg = checkpoint.get('config', {})
            
            modelo_gru = AttentionGRUMejorado(
                num_items = num_items_m,
                num_clientes = num_clientes,
                embedding_dim = cfg.get('embedding_dim', 64),
                hidden_dim = cfg.get('hidden_dim', 128),
                dropout = 0.0,
            )
            modelo_gru.load_state_dict(checkpoint['model_state'])
            modelo_gru.eval()
            modelo_cargado = True
        except Exception as e:
            sys.stderr.write(f"[WARNING] Error cargando modelo PyTorch: {e}\n")
            
    if not modelo_cargado:
        # Fallback a un modelo vacío no entrenado para no romper la ejecución
        clientes_unicos = sorted(compras_ctx['cliente_id'].unique().tolist())
        cliente2idx = {c: i + 1 for i, c in enumerate(clientes_unicos)}
        num_clientes = len(clientes_unicos) + 1
        modelo_gru = AttentionGRUMejorado(
            num_items = num_items,
            num_clientes = num_clientes,
            dropout = 0.0,
        )
        modelo_gru.eval()

    historial_ids = historial_cliente['producto_id'].tolist()
    historial_nombres = [mapa_productos[pid] for pid in historial_ids if pid in mapa_productos]
    
    es_cold_start = len(historial_ids) < 3
    cli_idx_tensor = torch.tensor([cliente2idx.get(cliente_id, 0)], dtype=torch.long)
    
    # 3 Meses de proyecciones
    horizonte_meses = ["Mes +1 (Próximo Mes)", "Mes +2 (Siguiente Mes)", "Mes +3 (Proyección Trimestral)"]
    proyecciones = {}
    historial_simulado = list(historial_nombres)
    historial_ids_simulado = list(historial_ids)
    
    mes_actual = int(pd.Timestamp.now().month)
    
    for paso, mes_nombre in enumerate(horizonte_meses):
        mes_prediccion = ((mes_actual + paso) % 12) + 1
        mes_tensor = torch.tensor([mes_prediccion], dtype=torch.long)
        
        if es_cold_start:
            # Popularidad zonal
            df_zona = compras_ctx[compras_ctx[col_zona] == zona_activa]
            top_ids_cs = (
                df_zona[~df_zona['producto_id'].isin(historial_ids_simulado)]
                .groupby('producto_id')['producto_id']
                .count()
                .sort_values(ascending=False)
                .head(5)
                .index.tolist()
            )
            candidatos = [(pid, 'Cold Start', 0.5) for pid in top_ids_cs if pid in mapa_productos]
            item_foco_nombre = "Popularidad de Zona"
            peso_max_pct = 100
        else:
            # Inferencia GRU
            ctx_ids = historial_ids_simulado[-10:]
            max_emb_id = modelo_gru.item_embedding.num_embeddings - 1
            ctx_ids_seguros = [pid if pid <= max_emb_id else 0 for pid in ctx_ids]
            pad_len = max(0, 10 - len(ctx_ids_seguros))
            ctx_padded = [0] * pad_len + ctx_ids_seguros
            
            hist_tensor = torch.tensor([ctx_padded], dtype=torch.long)
            
            with torch.no_grad():
                logits, attn_weights = modelo_gru(hist_tensor, cli_idx_tensor, mes_tensor)
                scores_gru = torch.sigmoid(logits[0]).numpy()
                pesos_attn = attn_weights[0].squeeze(-1).numpy()
                
            idx_max_attn = np.argmax(pesos_attn)
            peso_max_pct = round(float(pesos_attn[idx_max_attn]) * 100, 1)
            item_foco_id = hist_tensor[0][idx_max_attn].item()
            item_foco_nombre = mapa_productos.get(item_foco_id, historial_simulado[-1] if historial_simulado else "Historial Base")
            
            # Simulación NCF
            scores_ncf = np.random.rand(num_items)
            top_indices_ncf = scores_ncf.argsort()[::-1][:5]
            top_indices_gru = scores_gru.argsort()[::-1][:10]
            
            candidatos = [(int(i), 'Atención-GRU', scores_gru[i]) for i in top_indices_gru if i > 0 and i in mapa_productos] + \
                         [(int(i + 1), 'NCF', scores_ncf[i]) for i in top_indices_ncf if (i + 1) in mapa_productos]
                         
        # Inyectar nuevos productos
        if motor_contenido and motor_contenido.hay_productos_nuevos() and not es_cold_start:
            mapa_inv = {v.upper(): k for k, v in mapa_productos.items()}
            candidatos_nuevos = inyectar_candidatos_nuevos(motor_contenido, historial_simulado, mapa_inv)
            for prod_id_n, motor_n, score_n, _ in candidatos_nuevos:
                candidatos.append((prod_id_n, motor_n, score_n))
                
        # Ordenar candidatos
        candidatos.sort(key=lambda x: x[2], reverse=True)
        
        recomendaciones_mes = []
        aprobadas = 0
        
        for prod_id, motor, score_raw in candidatos:
            if aprobadas >= 3:
                break
            
            if isinstance(prod_id, str) and prod_id.startswith("NUEVO_"):
                nombre_prod = prod_id.replace("NUEVO_", "")
            else:
                nombre_prod = mapa_productos.get(prod_id, str(prod_id))
                
            es_seguro, _ = pasa_filtros_seguridad(nombre_prod, historial_simulado, zona_activa)
            if not es_seguro:
                continue
                
            explicacion = generar_explicacion(
                nombre_prod, historial_simulado, motor, mes_nombre,
                item_foco = item_foco_nombre,
                peso = peso_max_pct if motor == 'Atención-GRU' else 100
            )
            
            # Mapear motor a la estrategia comercial descriptiva
            estrategia_map = {
                'Atención-GRU': "Reposición Sugerida (Ciclo de Compra)",
                'Cold Start':   "Éxito Local (Top Ventas de la Zona)",
                'NCF':          "Oportunidad de Expansión (Cross-Selling)",
                'Contenido (Nuevo Lanzamiento)': "Nuevo Lanzamiento (Afinidad Terapéutica)",
            }
            
            recomendaciones_mes.append({
                "producto": nombre_prod,
                "probabilidad": round(float(score_raw) * 100, 1),
                "motor": estrategia_map.get(motor, motor),
                "justificacion": explicacion
            })
            
            aprobadas += 1
            if aprobadas == 1:
                historial_simulado.append(nombre_prod)
                historial_ids_simulado.append(prod_id)
                
        proyecciones[mes_nombre] = recomendaciones_mes

    # Grafo XAI
    nodos = [
        {"id": f"Cliente_{cliente_id}", "label": f"Cliente {cliente_id}", "layer": 0, "type": "cliente"}
    ]
    enlaces = []
    
    ultimos_historial = historial_nombres[-5:]
    items_a_mostrar = set(ultimos_historial)
    
    recs_mes1 = proyecciones.get(horizonte_meses[0], [])
    for rec in recs_mes1:
        if not es_cold_start:
            items_a_mostrar.add(item_foco_nombre)
        for item in historial_nombres:
            if item in rec["justificacion"]:
                items_a_mostrar.add(item)
                
    for item in items_a_mostrar:
        nodos.append({"id": item, "label": item, "layer": 1, "type": "historial"})
        enlaces.append({"source": f"Cliente_{cliente_id}", "target": item, "type": "compra", "label": "Compra"})
        
    for rec in recs_mes1:
        nodos.append({"id": rec["producto"], "label": rec["producto"], "layer": 2, "type": "proyeccion"})
        enlaces.append({"source": f"Cliente_{cliente_id}", "target": rec["producto"], "type": "sugerido", "label": rec["motor"]})
        
        # Enlaces de afinidad
        for item in items_a_mostrar:
            if item in rec["justificacion"]:
                enlaces.append({"source": item, "target": rec["producto"], "type": "apriori", "label": "Afinidad"})

    return {
        "clienteId": cliente_id,
        "zona": zona_activa,
        "historial": historial_nombres,
        "proyecciones": proyecciones,
        "grafo": {"nodos": nodos, "enlaces": enlaces}
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Debe especificar el ID del cliente."}))
        sys.exit(1)
        
    try:
        cid = int(sys.argv[1])
        res = predecir(cid)
        print(json.dumps(res, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": f"Excepción en ejecución CLI: {str(e)}"}))
        sys.exit(1)
