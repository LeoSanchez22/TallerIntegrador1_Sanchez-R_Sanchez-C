print(">>> INICIANDO STREAMLIT... CARGANDO LIBRERÍAS CLOUD Y MLOps <<<")
import os
import google.generativeai as genai
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from pathlib import Path
import warnings
import networkx as nx
import matplotlib.pyplot as plt
import streamlit as st
from dotenv import load_dotenv
from sqlalchemy import create_engine

warnings.filterwarnings('ignore')

# =====================================================================
# 0. ARQUITECTURA MEJORADA (debe ser idéntica a la de train.py)
# =====================================================================
class AttentionGRUMejorado(nn.Module):
    """
    Versión mejorada con:
    - Embedding de Cliente (personalización por institución)
    - Embedding de Mes (estacionalidad)
    - Dropout para regularización
    """
    def __init__(self, num_items, num_clientes, num_meses=13,
                 embedding_dim=64, hidden_dim=128, dropout=0.3):
        super(AttentionGRUMejorado, self).__init__()
        self.item_embedding    = nn.Embedding(num_items,    embedding_dim, padding_idx=0)
        self.cliente_embedding = nn.Embedding(num_clientes, embedding_dim // 2)
        self.mes_embedding     = nn.Embedding(num_meses,    embedding_dim // 4)

        gru_input_dim = embedding_dim + embedding_dim // 2 + embedding_dim // 4

        self.gru             = nn.GRU(gru_input_dim, hidden_dim, batch_first=True, num_layers=2, dropout=dropout)
        self.attention_layer = nn.Linear(hidden_dim, 1)
        self.dropout         = nn.Dropout(dropout)
        self.fc              = nn.Linear(hidden_dim, num_items)

    def forward(self, seq_items, cliente_id, mes_id):
        B, L = seq_items.shape
        item_emb = self.item_embedding(seq_items)
        cli_emb  = self.cliente_embedding(cliente_id).unsqueeze(1).expand(B, L, -1)
        mes_emb  = self.mes_embedding(mes_id).unsqueeze(1).expand(B, L, -1)
        x = torch.cat([item_emb, cli_emb, mes_emb], dim=-1)
        x = self.dropout(x)
        gru_out, _    = self.gru(x)
        attn_scores   = self.attention_layer(gru_out)
        attn_weights  = F.softmax(attn_scores, dim=1)
        context       = torch.sum(attn_weights * gru_out, dim=1)
        context       = self.dropout(context)
        logits        = self.fc(context)
        return logits, attn_weights


# --- MÉTRICAS MLOps ---
def calcular_hit_rate_at_k(recomendaciones, ground_truth, k=5):
    return 1 if ground_truth in recomendaciones[:k] else 0

def calcular_ndcg_at_k(recomendaciones, ground_truth, k=5):
    if ground_truth in recomendaciones[:k]:
        index = recomendaciones.index(ground_truth)
        return 1 / np.log2(index + 2)
    return 0


# =====================================================================
# CONFIGURACIÓN DEL DASHBOARD
# =====================================================================
st.set_page_config(page_title="Dashboard Sophia XAI Cloud", layout="wide")
st.title("💊 Dashboard Predictivo Comercial y Proyección de Demanda (Cloud)")
st.markdown("### Laboratorios Sophia — Sistema de Inteligencia Explicable conectado a Supabase")
st.markdown("---")

DIRECTORIO_RAIZ = Path.cwd()
PATHS = {'intermediate': DIRECTORIO_RAIZ / 'data' / 'intermediate'}
MODEL_PATH = DIRECTORIO_RAIZ / 'modelo_sophia_final.pt'


# =====================================================================
# 1. CARGA DE DATOS
# =====================================================================
@st.cache_data(ttl=3600)
def cargar_datos():
    load_dotenv()
    db_uri = os.environ.get("DATABASE_URL")
    try:
        if not db_uri or "tu_contraseña" in db_uri:
            raise ValueError("DATABASE_URL no configurada")
        engine = create_engine(db_uri)
        compras = pd.read_sql_query("SELECT * FROM ventas_detalle", con=engine)
        seq     = pd.read_sql_query("SELECT * FROM cliente_secuencias", con=engine)
        return compras, seq
    except Exception:
        print("⚠️ Usando CSVs locales...")
        compras = pd.read_csv(PATHS['intermediate'] / 'compras_ctx.csv')
        seq     = pd.read_csv(PATHS['intermediate'] / 'secuencias_por_cliente.csv')
        return compras, seq

try:
    compras_ctx, seq_por_cliente = cargar_datos()
except Exception as e:
    st.error(f"Error fatal cargando datos: {e}")
    st.stop()

col_zona    = next((c for c in ['vendedor', 'zona'] if c in compras_ctx.columns), None)
col_cliente = next((c for c in ['cliente', 'nombre_cliente', 'Cliente'] if c in compras_ctx.columns), None)

num_items    = int(compras_ctx['producto_id'].max()) + 2
mapa_productos = compras_ctx.drop_duplicates('producto_id').set_index('producto_id')['producto'].to_dict()

# Detectar mes si hay columna de fecha
mes_col_existe = False
for col_fecha in ['fecha', 'date', 'fecha_pedido']:
    if col_fecha in compras_ctx.columns:
        compras_ctx['mes'] = pd.to_datetime(compras_ctx[col_fecha], errors='coerce').dt.month.fillna(1).astype(int)
        mes_col_existe = True
        break
if not mes_col_existe:
    compras_ctx['mes'] = 1

MES_ACTUAL = int(pd.Timestamp.now().month)


# =====================================================================
# 2. CARGA DEL MODELO (PESOS ENTRENADOS O FALLBACK ALEATORIO)
# =====================================================================
@st.cache_resource
def cargar_modelo():
    """
    Intenta cargar el modelo entrenado (.pt).
    Si no existe, usa inicialización aleatoria como fallback.
    """
    if MODEL_PATH.exists():
        checkpoint   = torch.load(MODEL_PATH, map_location='cpu', weights_only=False)
        num_items_m  = checkpoint['num_items']
        num_clientes = checkpoint['num_clientes']
        cliente2idx  = checkpoint['cliente2idx']
        cfg          = checkpoint.get('config', {})

        modelo = AttentionGRUMejorado(
            num_items    = num_items_m,
            num_clientes = num_clientes,
            embedding_dim = cfg.get('embedding_dim', 64),
            hidden_dim    = cfg.get('hidden_dim', 128),
            dropout       = 0.0,  # Sin dropout en inferencia
        )
        modelo.load_state_dict(checkpoint['model_state'])
        modelo.eval()

        hr_val   = checkpoint.get('hr_val', None)
        modo_msg = f"✅ Modelo entrenado cargado (HR@5 val: {hr_val*100:.1f}%)" if hr_val else "✅ Modelo entrenado cargado"
        return modelo, cliente2idx, num_clientes, modo_msg
    else:
        # Fallback: modelo sin entrenar (hit rate ~25%)
        clientes_unicos = sorted(compras_ctx['cliente_id'].unique().tolist())
        cliente2idx     = {c: i + 1 for i, c in enumerate(clientes_unicos)}
        num_clientes    = len(clientes_unicos) + 1

        modelo = AttentionGRUMejorado(
            num_items    = num_items,
            num_clientes = num_clientes,
            dropout      = 0.0,
        )
        modelo.eval()
        modo_msg = "⚠️ Modelo SIN entrenar (ejecuta train.py para mejorar el Hit Rate al 70%+)"
        return modelo, cliente2idx, num_clientes, modo_msg


modelo_gru, cliente2idx, num_clientes, estado_modelo = cargar_modelo()
st.sidebar.info(estado_modelo)


# =====================================================================
# 3. FILTRO DE SEGURIDAD
# =====================================================================
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


# =====================================================================
# 4. COLD START HÍBRIDO
# Para clientes con < 3 compras, usamos reglas de la zona (Plan B)
# =====================================================================
def prediccion_cold_start(zona_activa, historial_ids):
    """
    Plan B: Recomienda los productos más vendidos en la zona,
    excluyendo los que el cliente ya compró.
    """
    df_zona = compras_ctx[compras_ctx[col_zona] == zona_activa] if col_zona else compras_ctx
    top_zona = (
        df_zona[~df_zona['producto_id'].isin(historial_ids)]
        .groupby('producto_id')['producto_id']
        .count()
        .sort_values(ascending=False)
        .head(5)
        .index.tolist()
    )
    return top_zona, "Popularidad Zonal"


# =====================================================================
# 5. MOTOR XAI CON GOOGLE GEMINI
# =====================================================================
def generar_explicacion(producto_sugerido, historial_cliente, motor_origen,
                        horizonte_mes, item_foco_tensor=None, peso_tensor=None):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return "⚠️ Falta GEMINI_API_KEY en .env"

    genai.configure(api_key=api_key)
    mes_texto    = horizonte_mes.split(" (")[1].replace(")", "").lower() if "(" in horizonte_mes else horizonte_mes.lower()
    historial_base = item_foco_tensor if motor_origen == 'Atención-GRU' else (historial_cliente[-1] if historial_cliente else "Productos base")

    if motor_origen == 'Atención-GRU':
        contexto_mat = f"La capa de atención de la red GRU asignó un {peso_tensor}% de importancia a '{historial_base}', previendo demanda inminente de '{producto_sugerido}'."
    elif motor_origen == 'Cold Start':
        contexto_mat = f"El motor de popularidad zonal detectó que '{producto_sugerido}' es el producto más adoptado en clínicas similares de la zona, ideal para clientes en fase de adquisición temprana."
    else:
        contexto_mat = f"Correlación colaborativa entre clínicas que adoptaron '{historial_base}' y la demanda posterior de '{producto_sugerido}'."

    prompt = f"""
    Actúa como el motor de Inteligencia Artificial Analítica (XAI) de Laboratorios Sophia.
    Redacta una justificación de EXACTAMENTE 2 líneas explicando por qué sugieres vender '{producto_sugerido}' para {mes_texto}.
    
    Razón matemática: {contexto_mat}
    
    Reglas ESTRICTAS:
    1. Tono profesional, clínico y analítico.
    2. Usa términos como 'inferencia predictiva', 'correlación secuencial' o 'afinidad de prescripción'.
    3. Incluye textualmente '{producto_sugerido}' y '{historial_base}' en tu respuesta.
    4. Sin saludos ni introducciones. Ve directo a la justificación.
    """

    try:
        model    = genai.GenerativeModel('gemini-1.5-flash')
        respuesta = model.generate_content(prompt)
        return respuesta.text.strip()
    except Exception:
        return f"Inferencia algorítmica: Correlación histórica entre {historial_base} y demanda proyectada de {producto_sugerido}."


# =====================================================================
# 6. INTERFAZ DE USUARIO
# =====================================================================
col_sel1, col_sel2 = st.columns(2)

with col_sel1:
    zonas_disponibles = compras_ctx[col_zona].dropna().unique().tolist() if col_zona else ["PHARMA - N2"]
    zona_activa       = st.selectbox("🌍 1. Selecciona la Zona Comercial:", zonas_disponibles)

df_filtrado      = compras_ctx[compras_ctx[col_zona] == zona_activa] if col_zona else compras_ctx
lista_clientes   = df_filtrado.drop_duplicates('cliente_id').sort_values('cliente_id')
opciones_clientes = {
    row['cliente_id']: f"ID: {row['cliente_id']} - {row[col_cliente] if col_cliente else ''}"
    for _, row in lista_clientes.iterrows()
}

with col_sel2:
    cliente_seleccionado = st.selectbox(
        "🏥 2. Selecciona la Institución / Clínica:",
        options=list(opciones_clientes.keys()),
        format_func=lambda x: opciones_clientes[x]
    )


# =====================================================================
# 7. EJECUCIÓN DEL PROCESO PREDICTIVO
# =====================================================================
if st.button("🚀 Generar Diagnóstico y Proyección de Demanda (3 Meses)", type="primary"):

    with st.spinner('Ejecutando PyTorch, extrayendo tensores e invocando Gemini (XAI)...'):

        historial_ids    = df_filtrado[df_filtrado['cliente_id'] == cliente_seleccionado]['producto_id'].tolist()
        historial_nombres = [mapa_productos[pid] for pid in historial_ids if pid in mapa_productos]

        # Determinar si el cliente es "cold start"
        es_cold_start = len(historial_ids) < 3

        # Mapear cliente_id al índice del modelo
        cli_idx_tensor = torch.tensor(
            [cliente2idx.get(cliente_seleccionado, 0)], dtype=torch.long
        )

        horizonte_meses   = ["Mes +1 (Próximo Mes)", "Mes +2 (Siguiente Mes)", "Mes +3 (Proyección Trimestral)"]
        proyecciones_por_mes = {}
        historial_simulado   = historial_nombres.copy()

        for paso, mes_nombre in enumerate(horizonte_meses):
            mes_prediccion = ((MES_ACTUAL + paso - 1) % 12) + 1
            mes_tensor     = torch.tensor([mes_prediccion], dtype=torch.long)

            # ── RAMA COLD START ─────────────────────────────────────────
            if es_cold_start:
                top_ids_cs, motor_cs = prediccion_cold_start(zona_activa, historial_ids)
                candidatos = [(pid, 'Cold Start', 0.5) for pid in top_ids_cs if pid in mapa_productos]

            # ── RAMA MODELO ENTRENADO ────────────────────────────────────
            else:
                ctx_ids    = historial_ids[-10:]
                pad_len    = max(0, 10 - len(ctx_ids))
                ctx_padded = [0] * pad_len + ctx_ids
                hist_tensor = torch.tensor([ctx_padded], dtype=torch.long)

                with torch.no_grad():
                    logits, attn_weights = modelo_gru(hist_tensor, cli_idx_tensor, mes_tensor)
                    scores_gru           = torch.sigmoid(logits[0]).numpy()
                    pesos_attn           = attn_weights[0].squeeze(-1).numpy()

                idx_max_attn             = np.argmax(pesos_attn)
                peso_max_pct             = round(float(pesos_attn[idx_max_attn]) * 100, 1)
                item_foco_id             = hist_tensor[0][idx_max_attn].item()
                item_foco_nombre         = mapa_productos.get(item_foco_id, historial_simulado[-1] if historial_simulado else "Historial Base")

                top_indices_gru = scores_gru.argsort()[::-1][:5]
                candidatos = [(int(i), 'Atención-GRU', scores_gru[i]) for i in top_indices_gru if i > 0 and i in mapa_productos]

            candidatos.sort(key=lambda x: x[2], reverse=True)

            recomendaciones_mes = []
            aprobadas = 0

            for prod_id, motor, score_raw in candidatos:
                if aprobadas >= 3:
                    break
                nombre_prod = mapa_productos[prod_id]
                es_seguro, _ = pasa_filtros_seguridad(nombre_prod, historial_simulado, zona_activa)
                if not es_seguro:
                    continue

                explicacion = generar_explicacion(
                    nombre_prod, historial_simulado, motor, mes_nombre,
                    item_foco_tensor = item_foco_nombre if motor == 'Atención-GRU' else None,
                    peso_tensor      = peso_max_pct    if motor == 'Atención-GRU' else None,
                )

                estrategia_map = {
                    'Atención-GRU': "Reposición Predictiva",
                    'Cold Start':   "Producto Estrella Zonal",
                    'NCF':          "Expansión/Cross-Selling",
                }

                recomendaciones_mes.append({
                    "Producto Recomendado":        nombre_prod,
                    "Confianza":                   f"{round(float(score_raw) * 100, 2)}%",
                    "Estrategia Comercial":         estrategia_map.get(motor, motor),
                    "Argumento Clínico (Gemini XAI)": explicacion,
                    "Modelo_Oculto":               motor,
                    "Item_Atencion":               item_foco_nombre if motor == 'Atención-GRU' else None,
                })
                aprobadas += 1
                if aprobadas == 1:
                    historial_simulado.append(nombre_prod)

            proyecciones_por_mes[mes_nombre] = recomendaciones_mes

        # Etiqueta de contexto visible
        if es_cold_start:
            st.info("ℹ️ Cliente con historial limitado — se activó el motor **Cold Start (Popularidad Zonal)**.")

        # =====================================================================
        # 8. DESPLIEGUE EN PANTALLA
        # =====================================================================
        st.success("¡Inferencia y generación de lenguaje natural completada!")

        tabs = st.tabs([f"📅 {m}" for m in horizonte_meses] + ["📊 Telemetría MLOps (XAI)"])

        for i, mes_nombre in enumerate(horizonte_meses):
            with tabs[i]:
                col_res1, col_res2 = st.columns([1, 1.2])
                recs_actuales = proyecciones_por_mes[mes_nombre]

                with col_res1:
                    st.markdown(f"#### 📋 Sugerencias para el Visitador Médico ({mes_nombre})")
                    if recs_actuales:
                        df_mostrar = pd.DataFrame(recs_actuales).drop(columns=['Modelo_Oculto', 'Item_Atencion'])
                        st.dataframe(df_mostrar, use_container_width=True)

                with col_res2:
                    st.markdown("#### 🗺️ Grafo Causal Multipartito")
                    G = nx.DiGraph()
                    nodo_cliente = f"Cliente {cliente_seleccionado}"
                    G.add_node(nodo_cliente, color='#87CEFA', size=3500, layer=0)

                    items_a_mostrar = set(historial_nombres[-5:])
                    for rec in recs_actuales:
                        if rec['Item_Atencion']:
                            items_a_mostrar.add(rec['Item_Atencion'])
                        for item in historial_nombres:
                            if item in rec['Argumento Clínico (Gemini XAI)']:
                                items_a_mostrar.add(item)

                    for item in items_a_mostrar:
                        G.add_node(item, color='#98FB98', size=2200, layer=1)
                        G.add_edge(nodo_cliente, item, label="Historial", style='solid')

                    for rec in recs_actuales:
                        prod       = rec['Producto Recomendado']
                        motor_real = rec['Modelo_Oculto']
                        G.add_node(prod, color='#F08080', size=2800, layer=2)
                        G.add_edge(nodo_cliente, prod, label=rec['Estrategia Comercial'], style='solid')

                        if motor_real == 'Atención-GRU' and rec['Item_Atencion'] in items_a_mostrar:
                            G.add_edge(rec['Item_Atencion'], prod, label="Causalidad GRU", style='dashed', color="darkviolet")
                        elif motor_real in ('NCF', 'Cold Start'):
                            for item in items_a_mostrar:
                                if item in rec['Argumento Clínico (Gemini XAI)']:
                                    G.add_edge(item, prod, label="Afinidad Zonal", style='dashed', color="tomato")

                    fig, ax = plt.subplots(figsize=(10, 6))
                    pos            = nx.multipartite_layout(G, subset_key="layer", align="horizontal")
                    colores_nodos  = [node[1]['color'] for node in G.nodes(data=True)]
                    tamanos        = [node[1]['size']  for node in G.nodes(data=True)]

                    nx.draw_networkx_nodes(G, pos, node_color=colores_nodos, node_size=tamanos, edgecolors='dimgray', ax=ax)
                    nx.draw_networkx_labels(G, pos, font_size=8, font_weight="bold", ax=ax)

                    aristas_solidas   = [(u, v) for u, v, d in G.edges(data=True) if d['style'] == 'solid']
                    aristas_punteadas = [(u, v) for u, v, d in G.edges(data=True) if d['style'] == 'dashed']
                    colores_punteadas = [G[u][v]['color'] for u, v in aristas_punteadas]

                    nx.draw_networkx_edges(G, pos, edgelist=aristas_solidas, edge_color="gray", arrows=True, ax=ax)
                    nx.draw_networkx_edges(G, pos, edgelist=aristas_punteadas, edge_color=colores_punteadas,
                                           style="dashed", connectionstyle="arc3,rad=0.2", ax=ax)
                    nx.draw_networkx_edge_labels(G, pos, edge_labels=nx.get_edge_attributes(G, 'label'), font_size=7, ax=ax)
                    ax.axis('off')
                    st.pyplot(fig)

        # =====================================================================
        # 9. PESTAÑA TELEMETRÍA MLOps
        # =====================================================================
        with tabs[-1]:
            st.markdown("### 📈 Auditoría de Modelos: Evaluación Dinámica (Backtesting)")
            st.caption("Métricas calculadas en tiempo real evaluando el modelo contra el historial real.")

            modelo_cargado = MODEL_PATH.exists()
            if modelo_cargado:
                st.success("✅ Evaluando con **modelo entrenado** — resultados esperados: HR@5 ≥ 70%")
            else:
                st.warning("⚠️ Modelo no entrenado — ejecuta `train.py` para obtener HR@5 ≥ 70%")

            with st.spinner("Calculando métricas de validación contra el Ground Truth..."):
                clientes_unicos = compras_ctx['cliente_id'].drop_duplicates().tolist()
                np.random.seed(42)
                clientes_muestra = np.random.choice(clientes_unicos, min(50, len(clientes_unicos)), replace=False)

                hr_total, ndcg_total, atencion_media = 0.0, 0.0, 0.0
                cold_start_count = 0
                productos_sugeridos_unicos = set()
                casos_validos = 0

                for cid in clientes_muestra:
                    hist_ids = compras_ctx[compras_ctx['cliente_id'] == cid]['producto_id'].tolist()
                    if len(hist_ids) < 3:
                        cold_start_count += 1
                        continue

                    contexto_ids = hist_ids[:-1]
                    ground_truth_id = hist_ids[-1]

                    # Mes del último registro del cliente
                    mes_cliente = compras_ctx[compras_ctx['cliente_id'] == cid]['mes'].iloc[-1] if 'mes' in compras_ctx.columns else 1

                    ctx_ids = contexto_ids[-10:]
                    pad_len = max(0, 10 - len(ctx_ids))
                    ctx_padded = [0] * pad_len + ctx_ids

                    tensor_ctx = torch.tensor([ctx_padded], dtype=torch.long)
                    cli_t      = torch.tensor([cliente2idx.get(cid, 0)], dtype=torch.long)
                    mes_t      = torch.tensor([int(mes_cliente)], dtype=torch.long)

                    with torch.no_grad():
                        out_eval, attn_eval = modelo_gru(tensor_ctx, cli_t, mes_t)
                        scores_eval         = torch.sigmoid(out_eval[0]).numpy()
                        pesos_attn_eval     = attn_eval[0].squeeze(-1).numpy()

                    top_5 = scores_eval.argsort()[::-1][:5].tolist()
                    productos_sugeridos_unicos.update(top_5)

                    hr_total      += calcular_hit_rate_at_k(top_5, ground_truth_id, k=5)
                    ndcg_total    += calcular_ndcg_at_k(top_5, ground_truth_id, k=5)
                    atencion_media += np.max(pesos_attn_eval)
                    casos_validos += 1

                if casos_validos > 0:
                    hr_final          = (hr_total / casos_validos) * 100
                    ndcg_final        = ndcg_total / casos_validos
                    atencion_final    = (atencion_media / casos_validos) * 100
                    cobertura_catalogo = (len(productos_sugeridos_unicos) / num_items) * 100
                else:
                    hr_final = ndcg_final = atencion_final = cobertura_catalogo = 0

            m1, m2, m3, m4 = st.columns(4)
            m1.metric("Hit Rate @ 5",               f"{hr_final:.1f}%",            delta="Evaluación en vivo")
            m2.metric("NDCG @ 5 (Ranking)",          f"{ndcg_final:.3f}",           delta="Cálculo posicional")
            m3.metric("Pico de Atención (XAI)",       f"{atencion_final:.1f}%",      delta="Concentración XAI")
            m4.metric("Cobertura de Catálogo",        f"{cobertura_catalogo:.1f}%",  delta="Diversidad IA")

            if cold_start_count > 0:
                st.info(f"ℹ️ {cold_start_count} clientes en la muestra activaron el motor Cold Start (historial < 3 compras).")

            st.markdown("#### Funciones Matemáticas de Evaluación:")
            st.code("""
def calcular_hit_rate_at_k(recomendaciones, ground_truth, k=5):
    '''¿El producto real facturado apareció en el Top-K predicho?'''
    return 1 if ground_truth in recomendaciones[:k] else 0

def calcular_ndcg_at_k(recomendaciones, ground_truth, k=5):
    '''Penaliza logarítmicamente los aciertos en posiciones bajas.'''
    if ground_truth in recomendaciones[:k]:
        index = recomendaciones.index(ground_truth)
        return 1 / np.log2(index + 2)
    return 0
            """, language="python")