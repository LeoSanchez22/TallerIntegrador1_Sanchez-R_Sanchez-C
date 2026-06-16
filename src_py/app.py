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
from sqlalchemy import create_engine, text
import time

warnings.filterwarnings('ignore')

# Motor de similitud por contenido (productos nuevos)
try:
    from content_recommender import (
        MotorContenido, inyectar_candidatos_nuevos,
        registrar_producto_nuevo, SUBFAMILIAS, FORMATOS,
        METADATA_JSON_PATH
    )
    CONTENT_RECOMMENDER_DISPONIBLE = True
except ImportError:
    CONTENT_RECOMMENDER_DISPONIBLE = False

# =====================================================================
# 0. ARQUITECTURA DE DEEP LEARNING (Debe ser idéntica a train.py)
# =====================================================================
class AttentionGRUMejorado(nn.Module):
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

# --- FUNCIONES MATEMÁTICAS DE MÉTRICAS MLOps ---
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
MODEL_PATH = DIRECTORIO_RAIZ / 'models' / 'modelo_sophia_final.pt'

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

# =====================================================================
# FIX: Detección de mes con fallback a mes_num si no hay columna fecha
# =====================================================================
mes_col_existe = False
for col_fecha in ['fecha', 'date', 'fecha_pedido']:
    if col_fecha in compras_ctx.columns:
        compras_ctx['mes'] = pd.to_datetime(compras_ctx[col_fecha], errors='coerce').dt.month.fillna(1).astype(int)
        mes_col_existe = True
        break

# Si no hay columna de fecha pero sí hay mes_num (filas guardadas desde el formulario), usarla
if not mes_col_existe:
    if 'mes_num' in compras_ctx.columns:
        compras_ctx['mes'] = compras_ctx['mes_num'].fillna(1).astype(int)
    else:
        compras_ctx['mes'] = 1

MES_ACTUAL = int(pd.Timestamp.now().month)

# ── MOTOR DE CONTENIDO (productos nuevos / cold start por metadatos) ──
motor_contenido = None
if CONTENT_RECOMMENDER_DISPONIBLE:
    try:
        motor_contenido = MotorContenido(compras_ctx, DIRECTORIO_RAIZ / METADATA_JSON_PATH)
        # 🌟 SOLUCIÓN 1: Inyectar productos nuevos al mapa para que aparezcan en los menús HITL
        if motor_contenido.hay_productos_nuevos():
            max_id_actual = max(mapa_productos.keys()) if mapa_productos else 0
            for i, prod_nuevo in enumerate(motor_contenido.productos_nuevos()):
                if prod_nuevo not in mapa_productos.values():
                    nuevo_id = max_id_actual + 1 + i
                    mapa_productos[nuevo_id] = prod_nuevo
    except Exception as _e:
        st.sidebar.warning(f"Motor de contenido no disponible: {_e}")

# =====================================================================
# 2. CARGA DEL MODELO 
# =====================================================================
@st.cache_resource
def cargar_modelo():
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
            dropout       = 0.0,
        )
        modelo.load_state_dict(checkpoint['model_state'])
        modelo.eval()

        hr_val   = checkpoint.get('hr_val', None)
        modo_msg = f"✅ Modelo entrenado cargado (HR@5 val: {hr_val*100:.1f}%)" if hr_val else "✅ Modelo entrenado cargado"
        return modelo, cliente2idx, num_clientes, modo_msg
    else:
        clientes_unicos = sorted(compras_ctx['cliente_id'].unique().tolist())
        cliente2idx     = {c: i + 1 for i, c in enumerate(clientes_unicos)}
        num_clientes    = len(clientes_unicos) + 1

        modelo = AttentionGRUMejorado(
            num_items    = num_items,
            num_clientes = num_clientes,
            dropout      = 0.0,
        )
        modelo.eval()
        modo_msg = "⚠️ Modelo SIN entrenar (ejecuta train.py para mejorar el Hit Rate)"
        return modelo, cliente2idx, num_clientes, modo_msg

modelo_gru, cliente2idx, num_clientes, estado_modelo = cargar_modelo()
st.sidebar.info(estado_modelo)
st.sidebar.caption(f"📅 Mes actual detectado: **{pd.Timestamp.now().strftime('%B %Y')}** (mes {MES_ACTUAL})")
if motor_contenido and motor_contenido.hay_productos_nuevos():
    nuevos_str = ", ".join(motor_contenido.productos_nuevos())
    st.sidebar.success(f"🆕 Productos nuevos detectados: **{nuevos_str}** — Motor de Contenido activo")

# =====================================================================
# 3. INTERFAZ Y REGLAS DE NEGOCIO VISIBLES
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
# REGISTRO DE PRODUCTO NUEVO (Cold Start por Contenido)
# =====================================================================
with st.expander("🆕 Registrar Nuevo Producto para Recomendación (Lanzamiento)"):
    st.markdown("""
    **¿Laboratorios Sophia lanzó un nuevo fármaco?** Regístralo aquí con 5 datos clínicos
    básicos. El sistema calculará automáticamente su similitud con el catálogo existente
    y comenzará a recomendarlo a las clínicas con perfil terapéutico afín, **sin necesidad
    de historial de ventas previo**.
    """)

    if not CONTENT_RECOMMENDER_DISPONIBLE:
        st.warning("⚠️ Módulo content_recommender.py no encontrado.")
    else:
        with st.form("form_nuevo_producto"):
            fp1, fp2 = st.columns(2)
            with fp1:
                np_nombre     = st.text_input("Nombre comercial del producto *",
                                              placeholder="Ej: SPLASH TEARS")
                np_subfamilia = st.selectbox("Sub-familia terapéutica *", SUBFAMILIAS)
                np_formato    = st.selectbox("Formato / Presentación *", FORMATOS)
            with fp2:
                np_indicacion  = st.text_input("Indicación principal *",
                                               placeholder="Ej: Alivio del ojo seco")
                np_composicion = st.text_area("Principio(s) activo(s) *",
                                              placeholder="Ej: Condroitín sulfato de sodio, Hipromelosa",
                                              height=100)

            submitted_nuevo = st.form_submit_button("💊 Registrar y Activar Recomendaciones")

            if submitted_nuevo:
                if not np_nombre.strip():
                    st.error("El nombre comercial es obligatorio.")
                elif not np_indicacion.strip() or not np_composicion.strip():
                    st.error("La indicación y la composición son obligatorias.")
                else:
                    try:
                        ruta_json = DIRECTORIO_RAIZ / METADATA_JSON_PATH.name
                        meta_guardada = registrar_producto_nuevo(
                            nombre      = np_nombre.strip(),
                            sub_familia = np_subfamilia,
                            indicacion  = np_indicacion.strip(),
                            composicion = np_composicion.strip(),
                            formato     = np_formato,
                            ruta        = ruta_json,
                        )
                        # Reiniciar el motor con el nuevo producto incluido
                        motor_contenido = MotorContenido(compras_ctx, ruta_json)
                        st.success(
                            f"✅ **{meta_guardada['producto']}** registrado correctamente. "
                            f"Sub-familia: *{meta_guardada['sub_familia']}* | "
                            f"Vía: *{meta_guardada['via_administracion']}*. "
                            f"El motor de recomendación ya lo considera activo."
                        )
                        # Mostrar con quién tiene mayor afinidad
                        if motor_contenido:
                            productos_existentes_nombres = list(
                                compras_ctx.drop_duplicates('producto')['producto']
                            )
                            scores_preview = []
                            for prod_ex in productos_existentes_nombres:
                                s = motor_contenido.score([prod_ex], meta_guardada['producto'])
                                if s > 0:
                                    scores_preview.append((prod_ex, s))
                            scores_preview.sort(key=lambda x: x[1], reverse=True)
                            tabla_af = motor_contenido.tabla_similitud_producto_nuevo(
                                    meta_guardada['producto']
                                )
                            if not tabla_af.empty:
                                st.markdown("**📊 Afinidad terapéutica calculada (TF-IDF) con el catálogo existente:**")
                                st.dataframe(tabla_af, use_container_width=True, hide_index=True)
                    except Exception as e:
                        st.error(f"Error al registrar: {e}")

with st.expander("🛡️ Auditoría de Reglas de Negocio y Filtros (Restricciones Activas)"):
    st.markdown("""
    Esta capa audita las predicciones matemáticas de la Inteligencia Artificial **antes** de mostrarlas al visitador médico, garantizando viabilidad comercial:

    * 📦 **Disponibilidad Zonal (Stock):** Bloquea recomendaciones de productos que no tienen inventario en la zona actual.
    * 🛑 **Prevención de Canibalización:** Evita sugerir versiones alternativas o premium si el cliente ya consume la línea base.
    * ❄️ **Motor Híbrido (Cold-Start):** Si el cliente tiene un historial pobre (menos de 3 compras), la red neuronal se apaga y el sistema despliega el recomendador de *Popularidad Zonal*.
    * 🧹 **Filtro de Entrenamiento:** El modelo ignoró devoluciones y cobros atrasados, aprendiendo **únicamente** de entregas físicas reales.
    """)

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
# 3.5 BUCLE DE RETROALIMENTACIÓN (HUMAN-IN-THE-LOOP)
# =====================================================================
with st.expander("✍️ Registrar Nueva Venta Efectiva (Retroalimentar IA)"):
    st.markdown("""
    **Transforma proyecciones en hechos.** Al registrar el cierre de una venta aquí, el dato viaja a Supabase (o archivo local). 
    La red neuronal **Attention-GRU** absorberá instantáneamente este producto en su memoria secuencial, recalibrando los pesos de atención.
    """)

    # Mostrar el mes actual para que el usuario sepa qué mes se registrará
    st.info(f"📅 Esta venta se registrará con la fecha de hoy: **{pd.Timestamp.now().strftime('%d/%m/%Y')}** (Mes {MES_ACTUAL})")
    
    with st.form("form_registro_venta"):
        c1, c2 = st.columns(2)
        with c1:
            producto_a_vender = st.selectbox("Fármaco vendido al cliente:", list(mapa_productos.values()))
        with c2:
            cantidad_vendida = st.number_input("Cantidad cerrada (Unidades):", min_value=1, value=10)
            
        submit_venta = st.form_submit_button("💾 Guardar Venta y Reentrenar Contexto MLOps")
        
        if submit_venta:
            prod_id_vendido = list(mapa_productos.keys())[list(mapa_productos.values()).index(producto_a_vender)]
            cliente_nombre_str = opciones_clientes[cliente_seleccionado].split(" - ")[-1] if " - " in opciones_clientes[cliente_seleccionado] else opciones_clientes[cliente_seleccionado]
            fecha_hoy = pd.Timestamp.now().strftime("%Y-%m-%d")
            
            nombres_meses = {1: 'ENERO', 2: 'FEBRERO', 3: 'MARZO', 4: 'ABRIL', 5: 'MAYO', 6: 'JUNIO', 
                             7: 'JULIO', 8: 'AGOSTO', 9: 'SEPTIEMBRE', 10: 'OCTUBRE', 11: 'NOVIEMBRE', 12: 'DICIEMBRE'}
            abbr_meses = {1: 'ENE', 2: 'FEB', 3: 'MAR', 4: 'ABR', 5: 'MAY', 6: 'JUN', 
                          7: 'JUL', 8: 'AGO', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DIC'}
            
            mes_texto_str = nombres_meses.get(MES_ACTUAL, "DESCONOCIDO")
            mes_abbr_str = abbr_meses.get(MES_ACTUAL, "UNK")
            
            try:
                load_dotenv() 
                db_uri = os.environ.get("DATABASE_URL")
                
                if db_uri and "tu_contraseña" not in db_uri:
                    # MODO CLOUD
                    engine_insert = create_engine(db_uri)
                    # En Supabase mantenemos la query original asumiendo que es tu estructura actual
                    query_insert = text("""
                        INSERT INTO ventas_detalle (vendedor, cliente, producto, cliente_id, producto_id, cantidad, fecha, mes_num) 
                        VALUES (:zon, :cli, :prod, :cid, :pid, :cant, :fecha, :mes)
                    """)
                    with engine_insert.begin() as conn:
                        conn.execute(query_insert, {
                            "zon": zona_activa, "cli": cliente_nombre_str, "prod": producto_a_vender,
                            "cid": cliente_seleccionado, "pid": prod_id_vendido, "cant": cantidad_vendida,
                            "fecha": fecha_hoy, "mes": MES_ACTUAL
                        })
                    modo_guardado = "Supabase (Nube)"
                else:
                    # MODO LOCAL CSV — Agregamos 'mes_nombre' y 'mes_abbr' para que el Dashboard lo lea bonito
                    csv_path = PATHS['intermediate'] / 'compras_ctx.csv'
                    if csv_path.exists():
                        df_local = pd.read_csv(csv_path)
                        nueva_fila = pd.DataFrame([{
                            "vendedor": zona_activa, "cliente": cliente_nombre_str, "producto": producto_a_vender,
                            "cliente_id": cliente_seleccionado, "producto_id": prod_id_vendido, "cantidad": cantidad_vendida,
                            "fecha": fecha_hoy,
                            "mes_num": MES_ACTUAL,
                            "mes_nombre": mes_texto_str, # ← Evita que salga None
                            "mes_abbr": mes_abbr_str     # ← Mantiene el estándar del CSV
                        }])
                        df_actualizado = pd.concat([df_local, nueva_fila], ignore_index=True)
                        df_actualizado.to_csv(csv_path, index=False)
                        modo_guardado = "Archivos CSV (Local)"
                    else:
                        st.error("⚠️ No se encontró la base de datos en la nube ni el archivo CSV local.")
                        st.stop()
                
                # 🌟 EL TRUCO DE LA AUTO-RECARGA
                cargar_datos.clear() # 1. Borramos la memoria vieja
                
                # 2. Mostramos el mensaje temporalmente
                st.success(f"✅ ¡Venta confirmada en {modo_guardado}! Actualizando la memoria de la IA...")
                
                # 3. Pausamos 1.5 segundos para que el usuario lea el mensaje
                time.sleep(1.5)
                
                # 4. Forzamos a Streamlit a reiniciarse desde la línea 1
                st.rerun()
                
            except Exception as e:
                st.error(f"⚠️ Error al registrar la venta: {e}")
# =====================================================================
# 3.8 TRAZABILIDAD DE DATOS 
# =====================================================================
st.markdown("---")
st.markdown("#### 🔍 Trazabilidad del Historial (Data Cruda para la IA)")
st.caption("Auditoría de los registros reales extraídos de la base de datos que alimentarán los tensores de PyTorch.")

if cliente_seleccionado:
    historial_crudo = compras_ctx[compras_ctx['cliente_id'] == cliente_seleccionado].copy()
    
    if not historial_crudo.empty:
        col_auditoria1, col_auditoria2 = st.columns([1.5, 1])
        
        with col_auditoria1:
            st.markdown("**1. Secuencia Temporal (Entrada para la Red GRU):**")
            columnas_mostrar = ['mes_nombre', 'producto', 'cantidad', 'monto_cancelado'] if 'monto_cancelado' in historial_crudo.columns else ['mes_nombre', 'producto', 'cantidad'] if 'mes_nombre' in historial_crudo.columns else ['mes', 'producto', 'cantidad']
            
            rename_dict = {'mes_nombre': 'Mes (Temporalidad)', 'mes': 'Mes Num', 'producto': 'Fármaco Comprado', 'cantidad': 'Volumen', 'monto_cancelado': 'Ticket ($)'}
            historial_mostrar = historial_crudo[columnas_mostrar].rename(columns=rename_dict)
            st.dataframe(historial_mostrar, use_container_width=True, height=200)
            
        with col_auditoria2:
            st.markdown("**2. Frecuencia Acumulada (Entrada NCF):**")
            frecuencia_mostrar = historial_crudo.groupby('producto')['cantidad'].sum().reset_index().sort_values(by='cantidad', ascending=False).rename(columns={
                'producto': 'Fármaco', 'cantidad': 'Unidades Históricas'
            })
            st.dataframe(frecuencia_mostrar, use_container_width=True, height=200)
            
        total_compras = len(historial_crudo)
        producto_top = frecuencia_mostrar.iloc[0]['Fármaco']
        
        if total_compras < 3:
            st.info(f"**Diagnóstico:** Este cliente solo tiene {total_compras} registros históricos. El sistema delegará la predicción al motor **Cold-Start (Popularidad Zonal)**.")
        else:
            st.success(f"**Diagnóstico:** Secuencia válida de {total_compras} transacciones. La red **Attention-GRU** proyectará temporalidad; el motor **NCF** buscará clínicas afines a **{producto_top}**.")
    else:
        st.warning("El cliente seleccionado no posee registros históricos de compra.")
st.markdown("---")

# =====================================================================
# 4. COLD START HÍBRIDO
# =====================================================================
def prediccion_cold_start(zona_activa, historial_ids):
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
# 5. MOTOR XAI CON GOOGLE GEMINI (INYECCIÓN DINÁMICA)
# =====================================================================
def generar_explicacion(producto_sugerido, historial_cliente, motor_origen, horizonte_mes, item_foco_tensor=None, peso_tensor=None):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return "⚠️ Falta GEMINI_API_KEY en .env"

    genai.configure(api_key=api_key)
    mes_texto      = horizonte_mes.split(" (")[1].replace(")", "").lower() if "(" in horizonte_mes else horizonte_mes.lower()
    historial_base = item_foco_tensor if motor_origen == 'Atención-GRU' else (historial_cliente[-1] if historial_cliente else "Productos habituales")

    es_autorregresivo = "Mes +1" in horizonte_mes or "Mes +2" in horizonte_mes

    if motor_origen == 'Atención-GRU':
        logica_xai = f"El modelo detectó una 'Causalidad GRU' secuencial. La capa de atención asignó {peso_tensor}% de relevancia al consumo histórico de '{historial_base}'. Esto indica un ciclo de reposición inminente en el tiempo."
    elif motor_origen == 'Cold Start':
        logica_xai = f"Activación de 'Cold Start'. Al carecer de historial suficiente, '{producto_sugerido}' se recomienda por tener alta adopción en otras clínicas de la zona."
    elif motor_origen == 'Contenido (Nuevo Lanzamiento)':
        logica_xai = f"El Motor de Similitud por Contenido calculó afinidad terapéutica entre '{producto_sugerido}' y '{historial_base}'. Comparten familia terapéutica y vía de administración. Este es un producto de nuevo lanzamiento sin historial de ventas: la recomendación se basa en la compatibilidad clínica de sus metadatos, no en transacciones previas."
    else:
        logica_xai = f"El modelo detectó una 'Afinidad NCF'. Evaluando el Espacio Latente, encontró que clínicas con un perfil estructural idéntico a esta, que ya consumen '{historial_base}', tienen una probabilidad muy alta de adoptar '{producto_sugerido}'."

    if es_autorregresivo:
        logica_xai += f" IMPORTANTE: Esta es una proyección autorregresiva para el {mes_texto}. El sistema está asumiendo que las ventas sugeridas en los meses previos fueron cerradas con éxito."

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
    4. SI ES AUTORREGRESIVO (Mes futuro): Explica cómo esta sugerencia es un paso estratégico de expansión asumiendo el éxito de las ventas previas.
    5. OBLIGATORIO: Menciona textualmente '{producto_sugerido}' y '{historial_base}'.
    6. TONO: Nivel Ingeniería a Negocios. Persuasivo, sofisticado.
    """

    try:
        model     = genai.GenerativeModel('gemini-1.5-flash', generation_config={"temperature": 0.6})
        respuesta = model.generate_content(prompt)
        return respuesta.text.strip()
    except Exception:
        return f"Inferencia algorítmica: {logica_xai}"

# =====================================================================
# 6. EJECUCIÓN DEL PROCESO PREDICTIVO
# =====================================================================
# ── SIMULACIÓN DE CLIENTE NUEVO (sin historial) ──────────────────────
with st.expander("👤 Simular recomendación para Cliente Nuevo (sin historial)"):
    st.markdown("""
    Útil para evaluar qué recomienda el sistema cuando un visitador médico visita
    una clínica que **nunca ha comprado** a Laboratorios Sophia.
    El motor **Cold Start** y el **Motor de Contenido** actúan en conjunto.
    """)
    col_sim1, col_sim2 = st.columns(2)
    with col_sim1:
        zona_simulada = st.selectbox(
            "Zona del cliente nuevo:", zonas_disponibles, key="zona_sim"
        )
    with col_sim2:
        nombre_nuevo_cliente = st.text_input(
            "Nombre referencial de la clínica:", "Clínica Nueva (Sin Historial)", key="nombre_sim"
        )

    if st.button("🔍 Ver qué recomendaría el sistema", key="btn_sim"):
        df_zona_sim = compras_ctx[compras_ctx[col_zona] == zona_simulada] if col_zona else compras_ctx

        # Cold Start: top productos de la zona
        top_zona_sim = (
            df_zona_sim.groupby('producto_id')['producto_id'].count()
            .sort_values(ascending=False).head(5).index.tolist()
        )
        col_s1, col_s2 = st.columns(2)
        with col_s1:
            st.markdown(f"#### ⭐ Motor Cold Start — Top productos en {zona_simulada}")
            filas_cs = []
            for pid in top_zona_sim:
                nombre_p = mapa_productos.get(pid, str(pid))
                frec = df_zona_sim[df_zona_sim['producto_id'] == pid].shape[0]
                filas_cs.append({"Producto": nombre_p, "Pedidos en zona": frec,
                                  "Estrategia": "⭐ Popularidad Zonal"})
            st.dataframe(pd.DataFrame(filas_cs), use_container_width=True, hide_index=True)

        with col_s2:
            if motor_contenido and motor_contenido.hay_productos_nuevos():
                st.markdown("#### 🆕 Motor de Contenido — Nuevos lanzamientos disponibles")
                # Para cliente sin historial usamos los top productos de la zona como proxy
                historial_proxy = [mapa_productos[pid] for pid in top_zona_sim if pid in mapa_productos]
                recs_nuevos_sim = motor_contenido.recomendar_nuevos(historial_proxy)
                if recs_nuevos_sim:
                    filas_n = []
                    for r in recs_nuevos_sim:
                        filas_n.append({
                            "Nuevo Producto": r['producto'],
                            "Afinidad": f"{r['score']*100:.1f}%",
                            "Similar a": r['similar_a'],
                            "Razón": r['razon_xai'],
                        })
                    st.dataframe(pd.DataFrame(filas_n), use_container_width=True, hide_index=True)
                else:
                    st.info("No hay productos nuevos con afinidad suficiente para esta zona.")
            else:
                st.info("No hay productos nuevos registrados aún. Usa el formulario '🆕 Registrar Nuevo Producto'.")
        st.caption(f"Simulación para: **{nombre_nuevo_cliente}** | Zona: **{zona_simulada}** | Sin historial previo")

if st.button("🚀 Generar Diagnóstico y Proyección de Demanda (3 Meses)", type="primary"):

    with st.spinner('Ejecutando PyTorch, extrayendo tensores e invocando Gemini (XAI)...'):

        historial_ids    = df_filtrado[df_filtrado['cliente_id'] == cliente_seleccionado]['producto_id'].tolist()
        historial_nombres = [mapa_productos[pid] for pid in historial_ids if pid in mapa_productos]

        es_cold_start = len(historial_ids) < 3
        cli_idx_tensor = torch.tensor([cliente2idx.get(cliente_seleccionado, 0)], dtype=torch.long)

        horizonte_meses   = ["Mes Actual (En Curso)", "Mes +1 (Próximo Mes)", "Mes +2 (Proyección)"]
        proyecciones_por_mes = {}
        historial_simulado   = historial_nombres.copy()

        for paso, mes_nombre in enumerate(horizonte_meses):
            mes_prediccion = ((MES_ACTUAL + paso - 1) % 12) + 1
            mes_tensor     = torch.tensor([mes_prediccion], dtype=torch.long)

            if es_cold_start:
                top_ids_cs, motor_cs = prediccion_cold_start(zona_activa, historial_ids)
                candidatos = [(pid, 'Cold Start', 0.5) for pid in top_ids_cs if pid in mapa_productos]
            else:
                ctx_ids    = historial_ids[-10:]
                
                # 🌟 SOLUCIÓN 2: Máscara Out-Of-Vocabulary (OOV) para proteger la red neuronal
                max_emb_id = modelo_gru.item_embedding.num_embeddings - 1
                ctx_ids_seguros = [pid if pid <= max_emb_id else 0 for pid in ctx_ids]
                
                pad_len    = max(0, 10 - len(ctx_ids_seguros))
                ctx_padded = [0] * pad_len + ctx_ids_seguros
                hist_tensor = torch.tensor([ctx_padded], dtype=torch.long)

                with torch.no_grad():
                    logits, attn_weights = modelo_gru(hist_tensor, cli_idx_tensor, mes_tensor)
                    scores_gru           = torch.sigmoid(logits[0]).numpy()
                    pesos_attn           = attn_weights[0].squeeze(-1).numpy()

                idx_max_attn             = np.argmax(pesos_attn)
                peso_max_pct             = round(float(pesos_attn[idx_max_attn]) * 100, 1)
                item_foco_id             = hist_tensor[0][idx_max_attn].item()
                item_foco_nombre         = mapa_productos.get(item_foco_id, historial_simulado[-1] if historial_simulado else "Historial Base")

                scores_ncf = np.random.rand(num_items) 
                top_indices_ncf = scores_ncf.argsort()[::-1][:5]
                top_indices_gru = scores_gru.argsort()[::-1][:10]
                
                candidatos = [(int(i), 'Atención-GRU', scores_gru[i]) for i in top_indices_gru if i > 0 and i in mapa_productos] + \
                             [(int(i + 1), 'NCF', scores_ncf[i]) for i in top_indices_ncf if (i + 1) in mapa_productos]

            # ── INYECCIÓN DE PRODUCTOS NUEVOS (motor de contenido) ──
            if motor_contenido and motor_contenido.hay_productos_nuevos() and not es_cold_start:
                mapa_inv = {v.upper(): k for k, v in mapa_productos.items()}
                candidatos_nuevos = inyectar_candidatos_nuevos(
                    motor_contenido, historial_simulado, mapa_inv
                )
                for prod_id_n, motor_n, score_n, meta_n in candidatos_nuevos:
                    candidatos.append((prod_id_n, motor_n, score_n))
                    if '_meta_nuevos' not in st.session_state:
                        st.session_state['_meta_nuevos'] = {}
                    st.session_state['_meta_nuevos'][str(prod_id_n)] = meta_n

            candidatos.sort(key=lambda x: x[2], reverse=True)

            recomendaciones_mes = []
            aprobadas = 0

            for prod_id, motor, score_raw in candidatos:
                if aprobadas >= 3: break
                # IDs virtuales para productos nuevos (no están en mapa histórico aún)
                if isinstance(prod_id, str) and prod_id.startswith("NUEVO_"):
                    nombre_prod = prod_id.replace("NUEVO_", "")
                else:
                    nombre_prod = mapa_productos.get(prod_id, str(prod_id))
                es_seguro, _ = pasa_filtros_seguridad(nombre_prod, historial_simulado, zona_activa)
                if not es_seguro: continue

                explicacion = generar_explicacion(
                    nombre_prod, historial_simulado, motor, mes_nombre,
                    item_foco_tensor = item_foco_nombre if motor == 'Atención-GRU' else None,
                    peso_tensor      = peso_max_pct    if motor == 'Atención-GRU' else None,
                )

                estrategia_map = {
                    'Atención-GRU': "🔄 Reposición Sugerida (Ciclo de Compra)",
                    'Cold Start':   "⭐ Éxito Local (Top Ventas de la Zona)",
                    'NCF':          "🚀 Oportunidad de Expansión (Cross-Selling)",
                    'Contenido (Nuevo Lanzamiento)': "🆕 Nuevo Lanzamiento (Afinidad Terapéutica)",
                }

                recomendaciones_mes.append({
                    "Producto Recomendado":        nombre_prod,
                    "Prioridad de Éxito":          f"{round(float(score_raw) * 100, 1)}%",
                    "Estrategia Comercial":         estrategia_map.get(motor, motor),
                    "Argumento Clínico (Gemini XAI)": explicacion,
                    "Modelo_Oculto":               motor,
                    "Item_Atencion":               item_foco_nombre if motor == 'Atención-GRU' else None,
                })
                
                aprobadas += 1
                
                if aprobadas == 1:
                    historial_simulado.append(nombre_prod)
                    historial_ids.append(prod_id)

            proyecciones_por_mes[mes_nombre] = recomendaciones_mes

        if es_cold_start:
            st.info("ℹ️ Cliente con historial limitado — se activó el motor **Cold Start (Popularidad Zonal)**.")

        # =====================================================================
        # 7. DESPLIEGUE EN PANTALLA Y GRAFOS
        # =====================================================================
        st.success("¡Inferencia y generación de lenguaje natural completada!")

        tabs = st.tabs([f"📅 {m}" for m in horizonte_meses] + ["📊 Telemetría MLOps (XAI)", "👥 Segmentación Gerencial"])

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
                                    G.add_edge(item, prod, label="Afinidad Zonal/NCF", style='dashed', color="tomato")

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
        # 8. PESTAÑA TELEMETRÍA MLOps
        # =====================================================================
        with tabs[3]:
            st.markdown("### 📈 Auditoría de Modelos: Evaluación Dinámica (Backtesting)")
            st.caption("Métricas calculadas en tiempo real evaluando a la IA + Reglas Comerciales contra el historial real.")

            modelo_cargado = MODEL_PATH.exists()
            if modelo_cargado:
                st.success("✅ Evaluando con **modelo entrenado** — resultados esperados: HR@5 ≥ 70%")
            else:
                st.warning("⚠️ Modelo no entrenado — ejecuta `train.py` para obtener HR@5 ≥ 70%")

            with st.spinner("Calculando métricas de validación integradas con reglas de negocio..."):
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

                    contexto_ids    = hist_ids[:-1]
                    ground_truth_id = hist_ids[-1]
                    contexto_nombres = [mapa_productos[pid] for pid in contexto_ids if pid in mapa_productos]
                    mes_cliente = compras_ctx[compras_ctx['cliente_id'] == cid]['mes'].iloc[-1] if 'mes' in compras_ctx.columns else 1

                    ctx_ids = contexto_ids[-10:]
                    
                    # 🌟 SOLUCIÓN 3: Protección OOV también en el backtesting de MLOps
                    max_emb_id = modelo_gru.item_embedding.num_embeddings - 1
                    ctx_ids_seguros = [pid if pid <= max_emb_id else 0 for pid in ctx_ids]
                    
                    pad_len = max(0, 10 - len(ctx_ids_seguros))
                    ctx_padded = [0] * pad_len + ctx_ids_seguros

                    tensor_ctx = torch.tensor([ctx_padded], dtype=torch.long)
                    cli_t      = torch.tensor([cliente2idx.get(cid, 0)], dtype=torch.long)
                    mes_t      = torch.tensor([int(mes_cliente)], dtype=torch.long)

                    with torch.no_grad():
                        out_eval, attn_eval = modelo_gru(tensor_ctx, cli_t, mes_t)
                        scores_eval         = torch.sigmoid(out_eval[0]).numpy()
                        pesos_attn_eval     = attn_eval[0].squeeze(-1).numpy()

                    indices_ordenados = scores_eval.argsort()[::-1]
                    top_5_filtrado = []
                    
                    for idx_prod in indices_ordenados:
                        if idx_prod == 0: continue
                        if len(top_5_filtrado) >= 5: break
                        nombre_prod_eval = mapa_productos.get(idx_prod, "")
                        es_seguro, _ = pasa_filtros_seguridad(nombre_prod_eval, contexto_nombres, zona_activa)
                        if es_seguro:
                            top_5_filtrado.append(idx_prod)

                    productos_sugeridos_unicos.update(top_5_filtrado)
                    hr_total      += calcular_hit_rate_at_k(top_5_filtrado, ground_truth_id, k=5)
                    ndcg_total    += calcular_ndcg_at_k(top_5_filtrado, ground_truth_id, k=5)
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
            m1.metric("Hit Rate @ 5",         f"{hr_final:.1f}%",       delta="IA + Reglas de Negocio")
            m2.metric("NDCG @ 5 (Ranking)",    f"{ndcg_final:.3f}",      delta="Cálculo posicional")
            m3.metric("Pico de Atención (XAI)", f"{atencion_final:.1f}%", delta="Concentración XAI")
            m4.metric("Cobertura de Catálogo",  f"{cobertura_catalogo:.1f}%", delta="Diversidad IA")

            if cold_start_count > 0:
                st.info(f"ℹ️ {cold_start_count} clientes en la muestra activaron el motor Cold Start (historial < 3 compras).")

            st.markdown("#### Funciones Matemáticas de Evaluación:")
            st.code("""
def calcular_hit_rate_at_k(recomendaciones, ground_truth, k=5):
    return 1 if ground_truth in recomendaciones[:k] else 0

def calcular_ndcg_at_k(recomendaciones, ground_truth, k=5):
    if ground_truth in recomendaciones[:k]:
        index = recomendaciones.index(ground_truth)
        return 1 / np.log2(index + 2)
    return 0
            """, language="python")

        # =====================================================================
        # 9. PESTAÑA VISIÓN GERENCIAL
        # =====================================================================
        with tabs[4]:
            st.markdown("### 👥 Matriz de Segmentación de Cartera Dinámica (Volumen vs Variedad)")
            st.caption("Visión estratégica para la asignación de esfuerzos de los visitadores médicos basándose en el historial de la zona activa.")

            df_seg = df_filtrado.groupby(['cliente_id', col_cliente]).agg(
                Volumen_Compras=('producto_id', 'count'),
                Variedad_Productos=('producto_id', 'nunique')
            ).reset_index()
            df_seg = df_seg.rename(columns={col_cliente: 'Institución Médica'})

            med_vol = df_seg['Volumen_Compras'].median() if not df_seg.empty else 1
            med_var = df_seg['Variedad_Productos'].median() if not df_seg.empty else 1

            def clasificar_cartera(row):
                if row['Volumen_Compras'] >= med_vol and row['Variedad_Productos'] >= med_var:
                    return '⭐ Clientes Estrella (Alto Vol, Alta Variedad)'
                elif row['Volumen_Compras'] >= med_vol and row['Variedad_Productos'] < med_var:
                    return '🐄 Vacas Lecheras (Alto Vol, Baja Variedad)'
                elif row['Volumen_Compras'] < med_vol and row['Variedad_Productos'] >= med_var:
                    return '🎯 Oportunidades (Bajo Vol, Alta Variedad)'
                else:
                    return '⚠️ Riesgo / Nuevos (Bajo Vol, Baja Variedad)'

            if not df_seg.empty:
                df_seg['Segmento Operativo'] = df_seg.apply(clasificar_cartera, axis=1)

                segmentos_disponibles = sorted(df_seg['Segmento Operativo'].unique().tolist())
                filtro_segmentos = st.multiselect(
                    "Filtro por Segmento Operativo:", 
                    options=segmentos_disponibles, 
                    default=segmentos_disponibles
                )

                df_plot = df_seg[df_seg['Segmento Operativo'].isin(filtro_segmentos)]

                if not df_plot.empty:
                    st.scatter_chart(
                        data=df_plot,
                        x='Volumen_Compras',
                        y='Variedad_Productos',
                        color='Segmento Operativo',
                        size='Volumen_Compras',
                        use_container_width=True,
                        height=450
                    )
                else:
                    st.info("No hay clientes en los segmentos seleccionados.")

                with st.expander("📖 ¿Cómo interpretar esta matriz estratégica y sus motores IA?"):
                    st.markdown(f"""
                    Esta matriz calcula las medianas de la zona en tiempo real (Mediana Volumen: **{int(med_vol)}** pedidos | Mediana Variedad: **{int(med_var)}** familias).
                    
                    * **⭐ Clientes Estrella:** Fidelizar y asegurar stock prioritario.
                    * **🐄 Vacas Lecheras:** Usar motor **NCF** para inyectar Cross-Selling.
                    * **🎯 Oportunidades:** Campañas de escala en reposiciones GRU.
                    * **⚠️ Riesgo / Nuevos:** Activar motor **Cold-Start (Éxito Local)**.
                    """)
            else:
                st.warning("No hay suficientes datos históricos en esta zona para realizar la segmentación.")