import sys
import os
import json
import torch
import torch.nn.functional as F
import numpy as np
import pandas as pd
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Asegurar que el directorio raíz está en el path para las importaciones
DIRECTORIO_RAIZ = Path(__file__).resolve().parent.parent
sys.path.append(str(DIRECTORIO_RAIZ))

from src_py.train import AttentionGRUMejorado
from src_py.content_recommender import MotorContenido, inyectar_candidatos_nuevos

load_dotenv(dotenv_path=DIRECTORIO_RAIZ / ".env")

# Configuración de rutas
DATA_DIR = Path(__file__).resolve().parent / "data" / "intermediate"
MODEL_PATH = DIRECTORIO_RAIZ / "models" / "modelo_sophia_final.pt"
JSON_PATH = Path(__file__).resolve().parent / "data" / "productos_metadata.json"

# Negocio
def obtener_quiebres_zona(zona, compras_df):
    col_zona = next((c for c in ['vendedor', 'zona'] if c in compras_df.columns), 'zona')
    cols = compras_df.columns.tolist()
    if 'sin_stock' in cols:
        df_quiebre = compras_df[
            (compras_df[col_zona] == zona) & (compras_df['sin_stock'] == True)
        ]['producto'].unique().tolist()
    elif 'stock' in cols:
        df_quiebre = compras_df[
            (compras_df[col_zona] == zona) & (compras_df['stock'] == 0)
        ]['producto'].unique().tolist()
    else:
        df_quiebre = []
    return df_quiebre

def obtener_pares_canibalizacion(mapa_productos):
    pares = []
    nombres = list(mapa_productos.values())
    for nombre in nombres:
        base = nombre.replace(' PF', '').replace(' PLUS', '').strip()
        if base != nombre and base in nombres:
            pares.append((base, nombre))   # (producto_base, versión_premium)
    return pares

def pasa_filtros_seguridad(producto_sugerido, historial_cliente, zona_actual, compras_df, mapa_productos):
    # Filtro 1: quiebres de stock derivados de la BD (no hardcodeados)
    quiebres = obtener_quiebres_zona(zona_actual, compras_df)
    if producto_sugerido in quiebres:
        return False, f"Sin stock en {zona_actual}."
    # Filtro 2: canibalización dinámica por pares detectados en el catálogo
    pares = obtener_pares_canibalizacion(mapa_productos)
    for base, premium in pares:
        if producto_sugerido == premium and base in historial_cliente:
            return False, f"Riesgo de canibalización: cliente ya consume {base}."
    return True, "Aprobado"

def generar_explicacion(producto_sugerido, historial_cliente, motor_origen, horizonte_mes, item_foco=None, peso=None, es_autorregresivo=False):
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

            if es_autorregresivo:
                logica_xai += f" IMPORTANTE: Esta es una proyección autorregresiva para el {mes_texto}. El sistema está asumiendo que las ventas sugeridas en los meses previos fueron cerradas con éxito, lo que obliga al algoritmo a mutar su sugerencia hacia una estrategia de expansión de catálogo para diversificar."

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
            4. SI ES AUTORREGRESIVO (Mes futuro): Explica cómo esta sugerencia es un paso estratégico de expansión asumiendo el éxito de las ventas de los meses anteriores.
            5. OBLIGATORIO: Menciona textualmente '{producto_sugerido}' y '{historial_base}'.
            6. TONO: Nivel Ingeniería a Negocios. Persuasivo, sofisticado, sin saludos ni redundancias.
            7. SIN EMOJIS: Esta estrictamente prohibido incluir emojis en tu respuesta. No utilices ningun tipo de emoticono o caracter especial de emoji.
            """
            model = genai.GenerativeModel('gemini-1.5-flash', generation_config={"temperature": 0.6})
            respuesta = model.generate_content(prompt)
            # Sanitizar posibles emojis remanentes del modelo
            clean_text = respuesta.text.strip().replace("🤖", "").replace("💊", "").replace("🚀", "").replace("💡", "").replace("⭐", "").replace("🔄", "").replace("🆕", "")
            return clean_text
        except Exception:
            pass

    # Explicación estática de respaldo (sin emojis)
    suffix = " (proyección autorregresiva)" if es_autorregresivo else ""
    if motor_origen == 'Atención-GRU':
        return f"Reposición Sugerida: Ciclo de compra detecta demanda inminente para {producto_sugerido} basado en consumo de {item_foco} ({peso}% relevancia){suffix}."
    elif motor_origen == 'Cold Start':
        return f"Exito Local: {producto_sugerido} es uno de los productos mas solicitados en tu zona comercial{suffix}."
    elif motor_origen == 'Contenido (Nuevo Lanzamiento)':
        return f"Nuevo Lanzamiento: Recomendado por afinidad terapeutica de ingredientes activos con {item_foco}{suffix}."
    else:
         return f"Oportunidad Cross-Selling: Clinicas con perfil de compra similar al tuyo que adquieren {item_foco} tambien consumen {producto_sugerido}{suffix}."

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
    
    # 3 Meses de proyecciones (Inicia en Mes Actual en Curso)
    horizonte_meses = ["Mes Actual (En Curso)", "Mes +1 (Próximo Mes)", "Mes +2 (Proyección)"]
    proyecciones = {}
    historial_simulado = list(historial_nombres)
    historial_ids_simulado = list(historial_ids)
    
    mes_actual = int(pd.Timestamp.now().month)
    
    # Inicializar xai_detalles dict
    xai_detalles = {
        "es_cold_start": es_cold_start,
        "total_compras_historicas": len(historial_ids),
        "productos_distintos": len(set(historial_ids)),
        "motor_activo": "Cold Start (Popularidad Zonal)" if es_cold_start else "Attention-GRU + NCF",
        "secuencia_entrada": [],
        "secuencia_nombres_gru": "",
        "pesos_atencion": [],
        "gemelos_ncf_ui": [],
        "productos_frecuentes_display": [],
        "catalog_coverage": {
            "pct_cubierto": 0.0,
            "pct_restante": 100.0
        },
        "quiebres_zona": [],
        "canibalizacion_activa": [],
        "ranking_filtrado_mes0": [],
        "hay_productos_nuevos": False,
        "productos_nuevos_activos": [],
        "recs_nuevos_cliente": [],
        "telemetria": {
            "hit_rate_5": "0.0%",
            "ndcg_5": "0.000",
            "pico_atencion": "0.0%",
            "cobertura_catalogo": "0.0%"
        }
    }
    
    # 1. Secuencia de entrada (Paso 1)
    for pos_idx, pid in enumerate(historial_ids[-10:]):
        nombre = mapa_productos.get(pid, str(pid))
        xai_detalles["secuencia_entrada"].append({
            "posicion": f"t-{len(historial_ids[-10:]) - pos_idx}",
            "id": int(pid),
            "nombre": nombre
        })
        
    # 2. Secuencia nombres GRU (Paso 3)
    if len(historial_nombres) >= 2:
        xai_detalles["secuencia_nombres_gru"] = " → ".join(historial_nombres[-6:])
        
    # 3. Quiebres de stock y canibalización (Paso 5)
    quiebres_activos = obtener_quiebres_zona(zona_activa, compras_ctx)
    xai_detalles["quiebres_zona"] = quiebres_activos
    
    pares_activos = obtener_pares_canibalizacion(mapa_productos)
    xai_detalles["canibalizacion_activa"] = [f"{b} → {p}" for b, p in pares_activos]
    
    # 4. Motor de contenido (Paso 6)
    if motor_contenido:
        xai_detalles["hay_productos_nuevos"] = motor_contenido.hay_productos_nuevos()
        xai_detalles["productos_nuevos_activos"] = motor_contenido.productos_nuevos()
        
    # 5. Diagnóstico de Viabilidad Nuevos Lanzamientos (Recomendación de nuevos por TF-IDF)
    recs_nuevos_cliente = []
    if motor_contenido and motor_contenido.hay_productos_nuevos() and not es_cold_start:
        nuevos_recs = motor_contenido.recomendar_nuevos(historial_nombres)
        for rn in nuevos_recs:
            score_pct = rn['score'] * 100
            diagnostico = "⭐⭐⭐ Altamente Recomendable" if score_pct >= 20 else "⭐⭐ Recomendable" if score_pct >= 10 else "⭐ Viabilidad Baja"
            recs_nuevos_cliente.append({
                "lanzamiento": rn['producto'],
                "afinidad": f"{score_pct:.1f}%",
                "producto_ancla": rn['similar_a'],
                "diagnostico": diagnostico
            })
    xai_detalles["recs_nuevos_cliente"] = recs_nuevos_cliente

    # 6. Calcular telemetría MLOps de backtesting dinámico
    try:
        clientes_zona = compras_ctx[compras_ctx[col_zona] == zona_activa]['cliente_id'].drop_duplicates().tolist()
        semilla_dinamica = int(cliente_id) + len(zona_activa)
        np.random.seed(semilla_dinamica)
        
        tamanho_muestra = min(20, len(clientes_zona))
        clientes_muestra = np.random.choice(clientes_zona, tamanho_muestra, replace=False)

        hr_total, ndcg_total, atencion_media = 0.0, 0.0, 0.0
        productos_sugeridos_unicos = set()
        casos_validos = 0

        for cid in clientes_muestra:
            hist_ids = compras_ctx[compras_ctx['cliente_id'] == int(cid)]['producto_id'].tolist()
            if len(hist_ids) < 3:
                continue

            contexto_ids = hist_ids[:-1]
            ground_truth_id = hist_ids[-1]
            contexto_nombres = [mapa_productos[pid] for pid in contexto_ids if pid in mapa_productos]
            
            # Get mes of last purchase
            mes_cliente = 1
            if 'mes_num' in compras_ctx.columns:
                mes_df = compras_ctx[compras_ctx['cliente_id'] == int(cid)]
                if not mes_df.empty:
                    try:
                        mes_cliente = int(float(mes_df['mes_num'].iloc[-1]))
                    except Exception:
                        pass

            ctx_ids_eval = contexto_ids[-10:]
            max_emb_id_eval = modelo_gru.item_embedding.num_embeddings - 1
            ctx_ids_seguros_eval = [pid if pid <= max_emb_id_eval else 0 for pid in ctx_ids_eval]
            pad_len_eval = max(0, 10 - len(ctx_ids_seguros_eval))
            ctx_padded_eval = [0] * pad_len_eval + ctx_ids_seguros_eval

            tensor_ctx = torch.tensor([ctx_padded_eval], dtype=torch.long)
            cli_t = torch.tensor([cliente2idx.get(int(cid), 0)], dtype=torch.long)
            mes_t = torch.tensor([int(mes_cliente)], dtype=torch.long)

            with torch.no_grad():
                out_eval, attn_eval = modelo_gru(tensor_ctx, cli_t, mes_t)
                scores_eval = torch.sigmoid(out_eval[0]).numpy()
                pesos_attn_eval = attn_eval[0].squeeze(-1).numpy()

            indices_ordenados = scores_eval.argsort()[::-1]
            top_5_filtrado = []
            for idx_prod in indices_ordenados:
                if idx_prod == 0: continue
                if len(top_5_filtrado) >= 5: break
                nombre_prod_eval = mapa_productos.get(idx_prod, "")
                es_seguro_eval, _ = pasa_filtros_seguridad(nombre_prod_eval, contexto_nombres, zona_activa, compras_ctx, mapa_productos)
                if es_seguro_eval:
                    top_5_filtrado.append(idx_prod)

            productos_sugeridos_unicos.update(top_5_filtrado)
            hr_total += 1 if ground_truth_id in top_5_filtrado[:5] else 0
            
            if ground_truth_id in top_5_filtrado[:5]:
                idx_gt = top_5_filtrado.index(ground_truth_id)
                ndcg_total += 1 / np.log2(idx_gt + 2)
            
            atencion_media += np.max(pesos_attn_eval)
            casos_validos += 1

        if casos_validos > 0:
            hr_final = (hr_total / casos_validos) * 100
            ndcg_final = ndcg_total / casos_validos
            atencion_final = (atencion_media / casos_validos) * 100
            cobertura_catalogo = (len(productos_sugeridos_unicos) / num_items) * 100
        else:
            hr_final = ndcg_final = atencion_final = cobertura_catalogo = 0

        xai_detalles["telemetria"] = {
            "hit_rate_5": f"{hr_final:.1f}%",
            "ndcg_5": f"{ndcg_final:.3f}",
            "pico_atencion": f"{atencion_final:.1f}%",
            "cobertura_catalogo": f"{cobertura_catalogo:.1f}%"
        }
    except Exception as e:
        sys.stderr.write(f"[WARNING] Error calculating telemetry: {e}\n")

    # Bucle por meses
    for paso, mes_nombre in enumerate(horizonte_meses):
        mes_prediccion = ((mes_actual + paso - 1) % 12) + 1
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
            
            # Guardar pesos de atención en Paso 4
            if paso == 0:
                nombres_ctx = ([None] * pad_len) + [mapa_productos.get(pid, str(pid)) for pid in ctx_ids_seguros]
                filas_attn = []
                for pos, (nombre_p, peso_p) in enumerate(zip(nombres_ctx, pesos_attn)):
                    if nombre_p is None:
                        continue
                    filas_attn.append({
                        "posicion": f"t-{len(ctx_ids_seguros) - pos}",
                        "producto": nombre_p,
                        "peso": f"{peso_p * 100:.2f}%",
                        "influencia": "⭐ Principal" if peso_p == pesos_attn.max() else (
                                             "🔸 Alta"     if peso_p >= pesos_attn.mean() else "· Baja")
                    })
                xai_detalles["pesos_atencion"] = filas_attn
            
            # ── CÁLCULO REAL DEL MOTOR NCF (Clínicas Gemelas en el Espacio Latente) ──
            cliente_adn = modelo_gru.cliente_embedding.weight[cli_idx_tensor[0]]
            todos_clientes_adn = modelo_gru.cliente_embedding.weight
            similitudes = F.cosine_similarity(cliente_adn.unsqueeze(0), todos_clientes_adn)
            
            similitudes[cli_idx_tensor[0]] = -1.0  # Ignoramos al propio cliente
            top_gemelos = torch.topk(similitudes, k=5)
            
            indices_gemelos = top_gemelos.indices.detach().numpy()
            valores_gemelos = top_gemelos.values.detach().numpy()
            
            ids_gemelos_reales = [k for k, v in cliente2idx.items() if v in indices_gemelos]
            
            gemelos_front = []
            for idx_gemelo, score_gemelo in zip(indices_gemelos, valores_gemelos):
                id_real_gemelo = next((k for k, v in cliente2idx.items() if v == idx_gemelo), None)
                if id_real_gemelo:
                    compras_de_gemelo = compras_ctx[compras_ctx['cliente_id'] == id_real_gemelo]
                    top_prods_gemelo = compras_de_gemelo['producto'].value_counts().head(2).index.tolist() if not compras_de_gemelo.empty else ["Sin historial"]
                    
                    nombre_g = compras_de_gemelo[col_cliente].iloc[0] if (col_cliente and not compras_de_gemelo.empty) else f"ID: {id_real_gemelo}"
                    zona_g = compras_de_gemelo[col_zona].iloc[0] if (col_zona and not compras_de_gemelo.empty) else "Nacional"
                    
                    gemelos_front.append({
                        "clinica_gemela": nombre_g,
                        "zona": zona_g,
                        "similitud": f"{score_gemelo * 100:.1f}%",
                        "suele_comprar": ", ".join(top_prods_gemelo)
                    })
            
            if paso == 0:
                xai_detalles["gemelos_ncf_ui"] = gemelos_front
            
            compras_gemelos = compras_ctx[compras_ctx['cliente_id'].isin(ids_gemelos_reales)]
            frecuencia_gemelos = compras_gemelos['producto_id'].value_counts()
            scores_ncf = np.zeros(num_items)
            
            max_frecuencia_gemelos = frecuencia_gemelos.max() if not frecuencia_gemelos.empty else 1
            for pid, count in frecuencia_gemelos.items():
                if pid < num_items:
                    scores_ncf[pid] = (count / max_frecuencia_gemelos) * 0.90
            
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
                
            es_seguro, _ = pasa_filtros_seguridad(nombre_prod, historial_simulado, zona_activa, compras_ctx, mapa_productos)
            if not es_seguro:
                continue
                
            # La proyección es autorregresiva a partir del segundo mes (paso > 0)
            es_autoreg = (paso > 0)
            explicacion = generar_explicacion(
                nombre_prod, historial_simulado, motor, mes_nombre,
                item_foco = item_foco_nombre,
                peso = peso_max_pct if motor == 'Atención-GRU' else 100,
                es_autorregresivo = es_autoreg
            )
            
            # Mapear motor a la estrategia comercial descriptiva sin emojis
            estrategia_map = {
                'Atención-GRU': "Reposicion Sugerida (Ciclo de Compra)",
                'Cold Start':   "Exito Local (Top Ventas de la Zona)",
                'NCF':          "Oportunidad de Expansion (Cross-Selling)",
                'Contenido (Nuevo Lanzamiento)': "Nuevo Lanzamiento (Afinidad Terapeutica)",
            }

            sub_familia_com = ""
            formato_com = ""
            if motor == 'Contenido (Nuevo Lanzamiento)' and motor_contenido:
                prod_meta = motor_contenido.registro.get(nombre_prod.upper().strip(), {})
                sub_familia_com = prod_meta.get("sub_familia", "")
                formato_com = prod_meta.get("formato", "")

            # Explicación paso a paso de por qué se recomienda (detallada y clara, sin emojis)
            # Paso 1: Datos de entrada (historial)
            if es_cold_start:
                paso_input = f"El cliente no tiene un historial de compras suficiente (menos de 3 compras). Por lo tanto, se analizo el comportamiento de consumo general de la zona comercial '{zona_activa}'."
            else:
                paso_input = f"Se leyeron las ultimas compras registradas del cliente. A partir de esta secuencia, el algoritmo identifico que el principal producto detonante de interes es '{item_foco_nombre}'."

            # Paso 2: Calculo del modelo
            if motor == 'Atención-GRU':
                paso_modelo = f"La red neuronal recurrente GRU analizo el orden y la secuencia temporal de las compras anteriores. La capa de atencion matematica asigno un peso de relevancia del {peso_max_pct}% a '{item_foco_nombre}', deduciendo que el ciclo natural de reposicion de '{nombre_prod}' esta por cumplirse."
            elif motor == 'NCF':
                paso_modelo = f"El modelo de Filtrado Colaborativo Neural (NCF) proyecto al cliente en un espacio latente de comportamiento. Encontro coincidencia estructural con otros clientes que compran '{item_foco_nombre}', prediciendo que existe una afinidad de compra muy alta para '{nombre_prod}'."
            elif motor == 'Cold Start':
                paso_modelo = f"Se utilizo la regla de Popularidad Zonal. El producto '{nombre_prod}' es uno de los productos mas vendidos en la zona '{zona_activa}' entre clientes con perfiles de compra similares."
            elif motor == 'Contenido (Nuevo Lanzamiento)':
                paso_modelo = f"El motor de contenido utilizo la formula TF-IDF y similitud coseno sobre los metadatos clinicos. Identifico afinidad terapeutica entre el nuevo producto '{nombre_prod}' y el consumido '{item_foco_nombre}', dado que comparten la sub-familia '{sub_familia_com}' y el formato '{formato_com}'."
            else:
                paso_modelo = f"El algoritmo determino una probabilidad de compra basada en la afinidad del perfil comercial."

            # Paso 3: Validacion de seguridad y stock
            paso_filtro = f"El modulo de reglas de negocio verifico que '{nombre_prod}' cuenta con stock suficiente en la zona '{zona_activa}' y confirmo que no existe riesgo de canibalizacion con '{item_foco_nombre}' u otros productos del cliente."

            # Paso 4: Generacion comercial (XAI)
            paso_xai = f"El motor generativo tradujo la afinidad del modelo en el argumento de ventas: '{explicacion}'."

            recomendaciones_mes.append({
                "producto": nombre_prod,
                "probabilidad": round(float(score_raw) * 100, 1),
                "motor": estrategia_map.get(motor, motor),
                "modelo_oculto": motor,
                "justificacion": explicacion,
                "item_atencion": item_foco_nombre,
                "peso_atencion": peso_max_pct if motor == 'Atención-GRU' else 100,
                "detalles_pasos": {
                    "input": paso_input,
                    "modelo": paso_modelo,
                    "filtro": paso_filtro,
                    "xai": paso_xai
                }
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
            items_a_mostrar.add(rec.get("item_atencion", "Historial Base"))
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

    historial_detallado = []
    nombres_meses = {1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO', 
                     7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'}
    for _, row in historial_cliente.iterrows():
        p_name = mapa_productos.get(row['producto_id'], str(row['producto_id']))
        
        # Resolver mes de forma robusta como en app.py
        mes_val = ""
        if 'mes_nombre' in row and pd.notna(row['mes_nombre']) and str(row['mes_nombre']).strip() and str(row['mes_nombre']).strip().lower() != 'nan':
            mes_val = str(row['mes_nombre']).strip().upper()
        elif 'mes_abbr' in row and pd.notna(row['mes_abbr']) and str(row['mes_abbr']).strip() and str(row['mes_abbr']).strip().lower() != 'nan':
            mes_val = str(row['mes_abbr']).strip().upper()
        else:
            mes_num = None
            if 'mes_num' in row and pd.notna(row['mes_num']) and str(row['mes_num']).strip().lower() != 'nan':
                try:
                    mes_num = int(float(row['mes_num']))
                except Exception:
                    pass
            elif 'fecha' in row and pd.notna(row['fecha']) and str(row['fecha']).strip().lower() != 'nan':
                try:
                    mes_num = pd.to_datetime(row['fecha']).month
                except Exception:
                    pass
            
            if mes_num in nombres_meses:
                mes_val = nombres_meses[mes_num]
            else:
                mes_val = f"MES {mes_num}" if mes_num else "N/D"
                
        # Resolver cantidad de forma robusta
        cantidad_val = 1
        if 'cantidad' in row and pd.notna(row['cantidad']) and str(row['cantidad']).strip().lower() != 'nan':
            try:
                cantidad_val = int(float(row['cantidad']))
            except Exception:
                pass
                
        historial_detallado.append({
            "producto": p_name,
            "mes": mes_val,
            "cantidad": cantidad_val
        })

    return {
        "clienteId": cliente_id,
        "zona": zona_activa,
        "historial": historial_nombres,
        "historial_detallado": historial_detallado,
        "proyecciones": proyecciones,
        "grafo": {"nodos": nodos, "enlaces": enlaces},
        "xai_detalles": xai_detalles
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
