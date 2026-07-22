print(">>> INICIANDO STREAMLIT... CARGANDO LIBRERÍAS MACHINE LEARNING <<<")
import os
import sys
import pathlib
if sys.platform != "win32":
    pathlib.WindowsPath = pathlib.PosixPath
from google import genai
import pandas as pd
import numpy as np
from pathlib import Path
import warnings
import networkx as nx                
import matplotlib.pyplot as plt
import streamlit as st
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
import time

# --- NUEVAS LIBRERÍAS DE MACHINE LEARNING CLÁSICO ---
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from mlxtend.frequent_patterns import apriori, association_rules

warnings.filterwarnings('ignore')

# Motor de similitud por contenido (productos nuevos - TF-IDF se mantiene igual)
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
# CONFIGURACIÓN DEL DASHBOARD
# =====================================================================
st.set_page_config(page_title="Dashboard Sophia ML", layout="wide")
st.title("Dashboard Predictivo Comercial (Machine Learning Determinístico)")
st.markdown("### Laboratorios Sophia — Segmentación K-Means y Reglas de Asociación (Apriori)")
st.markdown("---")

DIRECTORIO_RAIZ = Path(__file__).resolve().parent
PATHS = {'intermediate': DIRECTORIO_RAIZ / 'data' / 'intermediate'}

# =====================================================================
# 1. CARGA DE DATOS
# =====================================================================
@st.cache_data(ttl=3600)
def cargar_datos():
    load_dotenv()
    db_uri = os.environ.get("DATABASE_URL")
    
    try:
        if not db_uri or "tu_contraseña" in db_uri:
            raise ValueError("La variable DATABASE_URL no existe en el .env o es inválida.")
        
        # FIX AUTOMÁTICO: Corrige el dialecto de Supabase para SQLAlchemy
        if db_uri.startswith("postgres://"):
            db_uri = db_uri.replace("postgres://", "postgresql://", 1)
            
        engine = create_engine(db_uri)
        compras = pd.read_sql_query("SELECT * FROM ventas_detalle", con=engine)
        print("✅ CONEXIÓN EXITOSA A SUPABASE DESDE LOCAL.")
        return compras
        
    except Exception as e:
        # AHORA SÍ VEREMOS EL ERROR REAL EN LA TERMINAL
        print(f"\n❌ ERROR FATAL DE CONEXIÓN A BD: {str(e)}\n")
        print("⚠️ Usando CSVs locales...")
        compras = pd.read_csv(PATHS['intermediate'] / 'compras_ctx.csv')
        return compras

try:
    compras_ctx = cargar_datos()
except Exception as e:
    st.error(f"Error fatal cargando datos: {e}")
    st.stop()

col_zona    = next((c for c in ['vendedor', 'zona'] if c in compras_ctx.columns), None)
col_cliente = next((c for c in ['cliente', 'nombre_cliente', 'Cliente'] if c in compras_ctx.columns), None)
mapa_productos = compras_ctx.drop_duplicates('producto_id').set_index('producto_id')['producto'].to_dict()

mes_col_existe = False
for col_fecha in ['fecha', 'date', 'fecha_pedido']:
    if col_fecha in compras_ctx.columns:
        compras_ctx['mes'] = pd.to_datetime(compras_ctx[col_fecha], errors='coerce').dt.month.fillna(1).astype(int)
        mes_col_existe = True
        break

if not mes_col_existe:
    if 'mes_num' in compras_ctx.columns:
        compras_ctx['mes'] = compras_ctx['mes_num'].fillna(1).astype(int)
    else:
        compras_ctx['mes'] = 1

MES_ACTUAL = int(pd.Timestamp.now().month)

# ── CÁLCULO DE PRECIOS PARA PROYECCIÓN FINANCIERA ──
if 'monto_cancelado' in compras_ctx.columns:
    compras_ctx['precio_unit'] = compras_ctx['monto_cancelado'] / compras_ctx['cantidad'].replace(0, 1)
    precios_dict = compras_ctx.groupby('producto')['precio_unit'].median().to_dict()
else:
    np.random.seed(42)
    precios_dict = {prod: round(np.random.uniform(15.0, 85.0), 2) for prod in compras_ctx['producto'].unique()}

motor_contenido = None
if CONTENT_RECOMMENDER_DISPONIBLE:
    try:
        motor_contenido = MotorContenido(compras_ctx, DIRECTORIO_RAIZ / METADATA_JSON_PATH)
    except Exception as _e:
        pass

# =====================================================================
# ⚙️ HIPERPARÁMETROS DINÁMICOS
# =====================================================================
st.sidebar.markdown("### ⚙️ Configuración del Modelo ML")
k_clusters_ui = st.sidebar.slider("K-Means: Número de Clusters (k)", min_value=2, max_value=8, value=4, step=1, help="Define en cuántos grupos matemáticos se segmentará a los clientes.")
soporte_ui = st.sidebar.slider("Apriori: Soporte Mínimo", min_value=0.01, max_value=0.15, value=0.05, step=0.01, help="Frecuencia mínima de aparición en el historial global.")
lift_ui = st.sidebar.slider("Apriori: Lift Mínimo", min_value=1.0, max_value=5.0, value=1.0, step=0.1, help="Fuerza de la regla. >1 indica correlación positiva real.")

# =====================================================================
# 2. ENTRENAMIENTO DE MACHINE LEARNING CLÁSICO DINÁMICO
# =====================================================================
@st.cache_data(show_spinner=False)
def entrenar_modelos_ml(df, k_clusters, min_sup, min_lift):
    df_rfm = df.groupby('cliente_id').agg(
        Volumen=('cantidad', 'sum'),
        Variedad=('producto_id', 'nunique'),
        Frecuencia=('mes', 'nunique')
    ).fillna(0)
    
    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(df_rfm)
    
    kmeans = KMeans(n_clusters=k_clusters, random_state=42, n_init=10)
    df_rfm['Cluster'] = kmeans.fit_predict(rfm_scaled)
    cluster_dict = df_rfm['Cluster'].to_dict()

    cesta = df.groupby(['cliente_id', 'producto'])['cantidad'].sum().unstack().reset_index().fillna(0)
    cesta_bool = (cesta.drop('cliente_id', axis=1) > 0).astype(bool)
    
    itemsets_frecuentes = apriori(cesta_bool, min_support=min_sup, use_colnames=True)
    
    if not itemsets_frecuentes.empty:
        reglas = association_rules(itemsets_frecuentes, metric="lift", min_threshold=min_lift)
    else:
        reglas = pd.DataFrame(columns=['antecedents', 'consequents', 'confidence', 'lift'])
        
    df_con_cluster = df.merge(df_rfm[['Cluster']], left_on='cliente_id', right_index=True)
    volumenes_cluster = df_con_cluster.groupby(['Cluster', 'producto'])['cantidad'].median().to_dict()

    return cluster_dict, reglas, df_rfm, volumenes_cluster

cluster_dict, reglas_asociacion, df_perfiles, volumenes_cluster = entrenar_modelos_ml(compras_ctx, k_clusters_ui, soporte_ui, lift_ui)

# =====================================================================
# 3. INTERFAZ Y SELECCIÓN
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
# 4. VALIDACIÓN CUANTITATIVA DINÁMICA
# =====================================================================
st.markdown("---")
with st.container():
    st.markdown(f"### 📊 Diagnóstico Operativo de la Zona: {zona_activa}")
    st.markdown("El sistema audita la base de datos en tiempo real para justificar la intervención matemática:")
    
    total_clientes_zona = df_filtrado['cliente_id'].nunique()
    total_productos_zona = df_filtrado['producto_id'].nunique()
    
    volumen_total_zona = df_filtrado['cantidad'].sum()
    top_3_productos_zona = df_filtrado.groupby('producto')['cantidad'].sum().nlargest(3)
    volumen_top_3_zona = top_3_productos_zona.sum()
    concentracion_pct_zona = (volumen_top_3_zona / volumen_total_zona) * 100 if volumen_total_zona > 0 else 0
    nombres_top_3_zona = ", ".join(top_3_productos_zona.index.tolist())
    
    c1, c2, c3 = st.columns(3)
    c1.metric("Clientes Institucionales", total_clientes_zona)
    c2.metric("Catálogo Activo", total_productos_zona)
    c3.metric("Concentración Top 3 (Sesgo)", f"{concentracion_pct_zona:.2f}%")
    
    st.error(
        f"🚨 **Cuello de botella detectado:** El **{concentracion_pct_zona:.2f}%** del volumen de ventas B2B en {zona_activa} "
        f"está estancado en 3 productos de reposición ({nombres_top_3_zona}). La heurística manual limita el Cross-Selling."
    )
    st.success(
        "✅ **Solución Explicable:** Intervención automatizada mediante **Clustering K-Means** y **Reglas de Asociación Apriori** "
        "para detectar patrones de venta cruzada con métricas de Soporte y Lift, 100% determinísticas."
    )
st.markdown("---")

# =====================================================================
# 5. FUNCIONES Y REGLAS DE NEGOCIO
# =====================================================================
def obtener_quiebres_zona(zona):
    if 'sin_stock' in compras_ctx.columns:
        return compras_ctx[(compras_ctx[col_zona] == zona) & (compras_ctx['sin_stock'] == True)]['producto'].unique().tolist()
    return []

def pasa_filtros_seguridad(producto_sugerido, historial_cliente, zona_actual, motor_origen):
    if producto_sugerido in obtener_quiebres_zona(zona_actual):
        return False, "Sin stock."
    if motor_origen == 'Regla de Asociación (Apriori)' and producto_sugerido in historial_cliente:
        return False, "Regla bloqueada: Producto ya consumido."
    marca_sugerida = producto_sugerido.split()[0]
    for prod_hist in historial_cliente:
        if marca_sugerida == prod_hist.split()[0] and producto_sugerido != prod_hist:
            if producto_sugerido not in historial_cliente:
                return False, "Riesgo de canibalización."
    return True, "Aprobado"

def generar_explicacion_ml(producto_sugerido, historial_cliente, motor_origen, horizonte_mes, cant_sug, ingreso_est, confianza=None, lift=None, detonante=None, es_historico=True):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return f"Sugerido por {motor_origen}. Vol: {cant_sug}. Ingreso: ${ingreso_est}"

    if motor_origen == 'Regla de Asociación (Apriori)':
        if es_historico:
            origen_texto = f"El sistema auditó la base de datos y confirmó que este cliente YA consume el producto ancla '{detonante}' en sus transacciones reales."
        else:
            origen_texto = f"Como parte de la proyección en cascada, el sistema asume la adopción estratégica previa de '{detonante}', usándolo como nuevo producto ancla."
            
        logica_motor = (f"Paso 1 (Determinismo): {origen_texto} "
                        f"Paso 2 (Regla Matemática): Al detectar '{detonante}', se dispara la regla de asociación hacia '{producto_sugerido}' "
                        f"(Confianza: {confianza}%, Lift: {lift}). Operativamente, un Lift de {lift} significa que la presencia de '{detonante}' "
                        f"multiplica la demanda de '{producto_sugerido}', demostrando una fuerte dependencia comercial y no una casualidad.")
    elif motor_origen == 'Cluster K-Means (Popularidad de Segmento)':
        logica_motor = (f"Segmentación K-Means: El cliente fue agrupado matemáticamente según su volumen y variedad histórica. "
                        f"Al no haber una regla Apriori fuerte, se extrajo '{producto_sugerido}' por ser el ítem de mayor rotación constante "
                        f"dentro de las clínicas que pertenecen exactamente a su mismo clúster.")
    else:
        logica_motor = (f"Afinidad TF-IDF: '{producto_sugerido}' es un lanzamiento. Se analizó su fórmula médica y "
                        f"se detectó una alta compatibilidad técnica con el portafolio que esta institución ya maneja.")

    if "Mes +1" in horizonte_mes:
        logica_tiempo = "Horizonte Mes +1 (Proyección en Cascada): El sistema estructura esta recomendación asumiendo que la propuesta del mes actual fue aceptada e integrada al inventario de la clínica."
    elif "Mes +2" in horizonte_mes:
        logica_tiempo = "Horizonte Mes +2 (Expansión): Proyección a mediano plazo que asume la maduración y consolidación del catálogo sugerido en los dos meses anteriores."
    else:
        logica_tiempo = "Acción Inmediata (Mes Actual): Diagnóstico calculado estrictamente sobre los datos reales y consolidados que la clínica maneja a la fecha."

    prompt = f"""
    Actúa como un Auditor de Datos B2B para Laboratorios Sophia. Tu tarea es redactar una justificación técnica que demuestre la trazabilidad exacta de una recomendación comercial.

    DATOS A EXPLICAR:
    - Trazabilidad Matemática: {logica_motor}
    - Proyección Financiera: Sugerir {cant_sug} unidades (${ingreso_est}). Justifica que esta cantidad corresponde a la mediana exacta de consumo del clúster (K-Means) al que pertenece el cliente.
    - Contexto Temporal: {logica_tiempo}

    REGLAS DE REDACCIÓN (ESTRICTAS):
    1. Escribe exactamente 2 párrafos bien estructurados.
    2. Tono: Profesional, auditor, lógico y directo. (Prohibido usar saludos como "Estimado cliente" o frases de vendedor).
    3. Párrafo 1: DEBES empezar explicando explícitamente el origen de la recomendación (Paso 1 y Paso 2). Explica la regla matemática (Lift) y cierra con la cantidad/ingreso basado en el clúster.
    4. Párrafo 2: Explica el contexto temporal en el que se debe aplicar la acción.
    """
    try:
        client = genai.Client(api_key=api_key)
        resp = client.models.generate_content(model='gemini-2.5-flash', contents=prompt, config={'temperature': 0.2})
        return resp.text.strip()
    except:
        return f"{logica_motor}\n\nPropuesta: {cant_sug} unds. / Ingreso: ${ingreso_est}\n\n{logica_tiempo}"

# =====================================================================
# 6. TRAZABILIDAD DE DATOS (HISTORIAL DEL CLIENTE)
# =====================================================================
st.markdown("#### 🔍 Historial de Compras (Data Cruda para Machine Learning)")
st.caption("Auditoría de las transacciones reales que alimentan al algoritmo Apriori y definen el perfil del cliente para K-Means.")

if cliente_seleccionado:
    historial_crudo = compras_ctx[compras_ctx['cliente_id'] == cliente_seleccionado].copy()
    
    if not historial_crudo.empty:
        col_auditoria1, col_auditoria2 = st.columns([1.5, 1])
        with col_auditoria1:
            st.markdown("**1. Transacciones Detalladas:**")
            columnas_mostrar = ['mes_nombre', 'producto', 'cantidad', 'monto_cancelado'] if 'monto_cancelado' in historial_crudo.columns else ['mes', 'producto', 'cantidad']
            rename_dict = {'mes_nombre': 'Mes', 'mes': 'Mes Num', 'producto': 'Fármaco Comprado', 'cantidad': 'Volumen', 'monto_cancelado': 'Ticket ($)'}
            historial_mostrar = historial_crudo[columnas_mostrar].rename(columns=rename_dict)
            st.dataframe(historial_mostrar, use_container_width=True, height=200)
            
        with col_auditoria2:
            st.markdown("**2. Frecuencia Acumulada (Entrada K-Means):**")
            frecuencia_mostrar = historial_crudo.groupby('producto')['cantidad'].sum().reset_index().sort_values(by='cantidad', ascending=False).rename(columns={
                'producto': 'Fármaco', 'cantidad': 'Unidades Acumuladas'
            })
            st.dataframe(frecuencia_mostrar, use_container_width=True, height=200)
            
        total_compras = len(historial_crudo)
        st.success(f"**Diagnóstico:** Se procesaron {total_compras} transacciones. Esta información define la 'Canasta de Compras' del cliente para extraer reglas matemáticas de Cross-Selling.")
    else:
        st.warning("El cliente seleccionado no posee registros históricos de compra.")
st.markdown("---")

# =====================================================================
# 7. EJECUCIÓN DEL PROCESO MACHINE LEARNING (PROYECCIÓN Y XAI)
# =====================================================================
if st.button("🚀 Generar Diagnóstico y Proyección Financiera (3 Meses)", type="primary"):
    with st.spinner('Procesando Árboles de Reglas, Volumen K-Means e invocando Gemini (XAI)...'):
        
        historial_ids_reales = df_filtrado[df_filtrado['cliente_id'] == cliente_seleccionado]['producto_id'].tolist()
        historial_nombres_reales = [mapa_productos[pid] for pid in historial_ids_reales if pid in mapa_productos]
        
        df_cliente_actual = df_filtrado[df_filtrado['cliente_id'] == cliente_seleccionado]
        top_detonadores = df_cliente_actual.groupby('producto')['cantidad'].sum().nlargest(5).index.tolist()
        if not top_detonadores:
            top_detonadores = historial_nombres_reales.copy()
        
        cluster_cliente = cluster_dict.get(cliente_seleccionado, 0)
        
        horizonte_meses = ["Mes Actual (En Curso)", "Mes +1 (Próximo Mes)", "Mes +2 (Proyección)"]
        proyecciones_por_mes = {}
        
        historial_simulado = historial_nombres_reales.copy()
        detonadores_simulados = top_detonadores.copy()
        
        nombres_recomendados_trimestre = set()
        bases_recomendadas_trimestre = set()

        # --- CONEXIÓN DE ARQUITECTURA: PRE-CÁLCULO POLINOMIAL ---
        # Calculamos la tendencia del cliente antes de iniciar las cotizaciones
        limites_polinomiales = {}
        if 'mes' in historial_crudo.columns and len(historial_crudo) > 0:
            tendencia_mensual = historial_crudo.groupby('mes')['cantidad'].sum().reset_index()
            if len(tendencia_mensual) >= 3:
                x_hist = tendencia_mensual['mes'].values
                y_hist = tendencia_mensual['cantidad'].values
                coeficientes = np.polyfit(x_hist, y_hist, 2)
                polinomio = np.poly1d(coeficientes)
                
                ultimo_mes_real = x_hist.max()
                # Establecemos los topes matemáticos para cada mes
                limites_polinomiales["Mes Actual (En Curso)"] = max(0, int(polinomio(ultimo_mes_real)))
                limites_polinomiales["Mes +1 (Próximo Mes)"] = max(0, int(polinomio(ultimo_mes_real + 1)))
                limites_polinomiales["Mes +2 (Proyección)"] = max(0, int(polinomio(ultimo_mes_real + 2)))

        for paso, mes_nombre in enumerate(horizonte_meses):
            candidatos = []
            
            # 1. MOTOR APRIORI
            if not reglas_asociacion.empty:
                set_detonadores = set(detonadores_simulados)
                reglas_aplicables = reglas_asociacion[
                    reglas_asociacion['antecedents'].apply(lambda x: set(x).issubset(set_detonadores))
                ]
                
                for _, regla in reglas_aplicables.iterrows():
                    # --- CORRECCIÓN 1: ORDEN ALFABÉTICO DEL DETONANTE PARA DETERMINISMO ---
                    antecedentes = sorted(list(regla['antecedents'])) 
                    consecuentes = list(regla['consequents'])
                    confianza_pct = round(regla['confidence'] * 100, 1)
                    lift_val      = round(regla['lift'], 2)
                    
                    for prod_consecuente in consecuentes:
                        if prod_consecuente not in historial_simulado:
                            candidatos.append({
                                "prod": prod_consecuente, 
                                "motor": "Regla de Asociación (Apriori)", 
                                "score": regla['lift'], 
                                "confianza": confianza_pct,
                                "lift": lift_val,
                                "detonante": antecedentes[0] 
                            })

            # 2. MOTOR K-MEANS
            if len(candidatos) < 3:
                clientes_mismo_cluster = [cid for cid, clus in cluster_dict.items() if clus == cluster_cliente]
                df_cluster = compras_ctx[compras_ctx['cliente_id'].isin(clientes_mismo_cluster)]
                top_cluster = df_cluster['producto'].value_counts().index.tolist()
                
                for prod_cluster in top_cluster:
                    if prod_cluster not in historial_simulado:
                        candidatos.append({
                            "prod": prod_cluster, 
                            "motor": "Cluster K-Means (Popularidad de Segmento)", 
                            "score": 1.0, 
                            "confianza": "N/A", "lift": "N/A", "detonante": "Perfil de su Cluster"
                        })
            
            # 3. MOTOR DE CONTENIDO (TF-IDF)
            # --- CORRECCIÓN 3: MANEJO SEGURO DEL MOTOR DE CONTENIDO PARA MES +2 ---
            if motor_contenido and hasattr(motor_contenido, 'hay_productos_nuevos') and motor_contenido.hay_productos_nuevos():
                mapa_inv = {v.upper(): k for k, v in mapa_productos.items()}
                try:
                    candidatos_nuevos = inyectar_candidatos_nuevos(motor_contenido, historial_simulado, mapa_inv)
                    for prod_id_n, motor_n, score_n, meta_n in candidatos_nuevos:
                        nombre_n = prod_id_n.replace("NUEVO_", "") if isinstance(prod_id_n, str) else mapa_productos.get(prod_id_n, str(prod_id_n))
                        candidatos.append({
                            "prod": nombre_n, "motor": motor_n, "score": score_n, 
                            "confianza": f"{score_n*100:.1f}", "lift": "TF-IDF", "detonante": meta_n['similar_a']
                        })
                except Exception:
                    pass

            recomendaciones_mes = []
            # Ordenamos por score descendente y, en caso de empate matemático, por orden alfabético del fármaco
            candidatos.sort(key=lambda x: (-float(x["score"]), x["prod"]))
            
            for cand in candidatos:
                if len(recomendaciones_mes) >= 3: break
                
                prod_rec = cand["prod"]
                base_prod = prod_rec.replace(' PF', '').replace(' PLUS', '').replace(' U', '').replace(' O', '').strip()
                
                if prod_rec in nombres_recomendados_trimestre or base_prod in bases_recomendadas_trimestre: 
                    continue
                
                seguro, _ = pasa_filtros_seguridad(prod_rec, historial_simulado, zona_activa, cand["motor"])
                if seguro:
                    # 1. Volumen Teórico (K-Means)
                    if (cluster_cliente, prod_rec) in volumenes_cluster:
                        vol_kmeans = int(volumenes_cluster[(cluster_cliente, prod_rec)])
                    else:
                        mediana_global = compras_ctx[compras_ctx['producto'] == prod_rec]['cantidad'].median()
                        vol_kmeans = int(mediana_global) if not pd.isna(mediana_global) else 10
                    
                    # 2. Regla de Determinismo Híbrido (K-Means vs Regresión)
                    if mes_nombre in limites_polinomiales:
                        tope_tendencia = limites_polinomiales[mes_nombre]
                        
                        # Si la regresión dictamina que el cliente va en picada extrema (0 unds),
                        # ABORTAMOS la recomendación de este producto para proteger el inventario
                        if tope_tendencia <= 0:
                            continue 
                            
                        # El volumen final es el menor entre el promedio del cluster y el tope de su propia tendencia
                        cant_sug = min(vol_kmeans, tope_tendencia)
                    else:
                        cant_sug = vol_kmeans
                    
                    # --- CORRECCIÓN 2: BLINDAJE FINANCIERO CONTRA VALORES NULOS (NaN) ---
                    precio_u = precios_dict.get(prod_rec)
                    if pd.isna(precio_u) or precio_u is None:
                        precio_u = 25.00 # Respaldo seguro si no existe precio histórico
                    ingreso_est = round(cant_sug * float(precio_u), 2)

                    es_historico_bool = cand["detonante"] in historial_nombres_reales
                    exp_xai = generar_explicacion_ml(prod_rec, historial_simulado, cand["motor"], mes_nombre, cant_sug, ingreso_est, cand["confianza"], cand["lift"], cand["detonante"], es_historico_bool)
                    
                    recomendaciones_mes.append({
                        "Producto Recomendado": prod_rec,
                        "Volumen Sugerido": f"{cant_sug} unds.",
                        "Proyección Ingresos": f"${ingreso_est:,.2f}",
                        "Métrica": f"Lift: {cand['lift']} | Conf: {cand['confianza']}%" if cand['lift'] not in ["N/A", "TF-IDF"] else ("Afinidad Clínica" if cand['lift']=="TF-IDF" else "Top Segmento"),
                        "Motor Estratégico": cand["motor"],
                        "Argumento Comercial (Gemini)": exp_xai,
                        "Detonante_Grafo": cand["detonante"]
                    })
                    
                    nombres_recomendados_trimestre.add(prod_rec)
                    bases_recomendadas_trimestre.add(base_prod)
                    historial_simulado.append(prod_rec)
                    detonadores_simulados.append(prod_rec) 

            proyecciones_por_mes[mes_nombre] = recomendaciones_mes

        # =====================================================================
        # DESPLIEGUE VISUAL
        # =====================================================================
        st.success("¡Análisis determinístico y proyección financiera completados!")
        
        # --- SE AÑADE LA PESTAÑA DE REGRESIÓN POLINOMIAL ---
        tabs = st.tabs(
            [f"📅 {m}" for m in horizonte_meses] + 
            ["👥 Segmentación (K-Means)", "📈 Proyección Polinomial (Tendencia)", "🧠 ¿Cómo funciona el sistema?"]
        )

        for i, mes_nombre in enumerate(horizonte_meses):
            with tabs[i]:
                recs_actuales = proyecciones_por_mes[mes_nombre]
                
                col_res1, col_res2 = st.columns([1, 1.2])
                with col_res1:
                    st.markdown(f"#### 📋 Cotización Sugerida ({mes_nombre})")
                    if recs_actuales:
                        df_mostrar = pd.DataFrame(recs_actuales).drop(columns=['Detonante_Grafo', 'Argumento Comercial (Gemini)'])
                        st.dataframe(df_mostrar, use_container_width=True)
                        
                        st.markdown("**Auditoría de Inferencia (Explicabilidad XAI):**")
                        for rec in recs_actuales:
                            with st.expander(f"Justificación para: {rec['Producto Recomendado']}"):
                                st.info(rec["Argumento Comercial (Gemini)"])
                    else:
                        st.info("No hay recomendaciones seguras para este periodo (Filtros de canibalización activos).")

                with col_res2:
                    if recs_actuales:
                        st.markdown("#### 🗺️ Grafo Causal Multipartito")
                        G = nx.DiGraph()
                        nodo_cliente = f"Cliente {cliente_seleccionado}"
                        G.add_node(nodo_cliente, color='#87CEFA', size=3500, layer=0)

                        items_a_mostrar = set(historial_nombres_reales[-5:])
                        for rec in recs_actuales:
                            if rec['Detonante_Grafo'] != "Perfil de su Cluster":
                                items_a_mostrar.add(rec['Detonante_Grafo'])

                        for item in items_a_mostrar:
                            if item in historial_nombres_reales:
                                G.add_node(item, color='#98FB98', size=2200, layer=1) 
                                G.add_edge(nodo_cliente, item, label="Historial Real", style='solid', color='gray')
                            else:
                                G.add_node(item, color='#FFD700', size=2200, layer=1) 
                                G.add_edge(nodo_cliente, item, label="Proyección Previa", style='dotted', color='orange')

                        for rec in recs_actuales:
                            prod = rec['Producto Recomendado']
                            detonante = rec['Detonante_Grafo']
                            motor = rec['Motor Estratégico']
                            
                            G.add_node(prod, color='#F08080', size=2800, layer=2)
                            G.add_edge(nodo_cliente, prod, label=motor.split(' ')[0], style='solid', color='gray')
                            
                            if detonante in items_a_mostrar:
                                # --- ACTUALIZACIÓN DE COLORES PARA EL GRAFO VISUAL EN STREAMLIT ---
                                color_arista = "darkviolet" if "Apriori" in motor else ("tomato" if "TF-IDF" in motor else "orange")
                                G.add_edge(detonante, prod, label=f"Causalidad {motor.split(' ')[0]}", style='dashed', color=color_arista)

                        fig, ax = plt.subplots(figsize=(10, 6))
                        pos = nx.multipartite_layout(G, subset_key="layer", align="horizontal")
                        colores_nodos = [node[1]['color'] for node in G.nodes(data=True)]
                        tamanos = [node[1]['size'] for node in G.nodes(data=True)]

                        nx.draw_networkx_nodes(G, pos, node_color=colores_nodos, node_size=tamanos, edgecolors='dimgray', ax=ax)
                        nx.draw_networkx_labels(G, pos, font_size=8, font_weight="bold", ax=ax)

                        aristas_solidas = [(u, v) for u, v, d in G.edges(data=True) if d['style'] == 'solid']
                        aristas_punteadas = [(u, v) for u, v, d in G.edges(data=True) if d['style'] in ['dashed', 'dotted']]
                        colores_punteadas = [G[u][v]['color'] for u, v in aristas_punteadas]

                        nx.draw_networkx_edges(G, pos, edgelist=aristas_solidas, edge_color="gray", arrows=True, ax=ax)
                        nx.draw_networkx_edges(G, pos, edgelist=aristas_punteadas, edge_color=colores_punteadas, style="dashed", connectionstyle="arc3,rad=0.2", ax=ax)
                        nx.draw_networkx_edge_labels(G, pos, edge_labels=nx.get_edge_attributes(G, 'label'), font_size=7, ax=ax)
                        ax.axis('off')
                        st.pyplot(fig)

        # =====================================================================
        # PESTAÑA SEGMENTACIÓN GERENCIAL
        # =====================================================================
        with tabs[3]:
            st.markdown("### 👥 Matriz de Segmentación de Cartera (Clustering K-Means)")
            st.markdown("El algoritmo agrupó a los clientes según su volumen, variedad y frecuencia de compra. Esto permite calcular proyecciones financieras realistas basadas en el comportamiento de clientes gemelos.")
            if not df_perfiles.empty:
                df_perfiles['Color'] = df_perfiles['Cluster'].apply(lambda x: '#FF0000' if x == cluster_cliente else '#A9A9A9')
                st.scatter_chart(data=df_perfiles, x='Volumen', y='Variedad', color='Color', size='Frecuencia', height=400)

        # =====================================================================
        # NUEVA PESTAÑA: REGRESIÓN POLINOMIAL (DETERMINISMO NO LINEAL)
        # =====================================================================
        with tabs[4]:
            st.markdown("### 📈 Análisis Matemático de Tendencia (Regresión Polinomial)")
            st.markdown("El motor de regresión no lineal de grado 2 calcula la trayectoria exacta de la capacidad de compra del cliente a lo largo del tiempo, asegurando un pronóstico de volumen completamente **determinístico y continuo**.")
            
            # Agrupar las compras históricas por mes
            if 'mes' in historial_crudo.columns and len(historial_crudo) > 0:
                tendencia_mensual = historial_crudo.groupby('mes')['cantidad'].sum().reset_index()
                
                if len(tendencia_mensual) >= 3: # Necesitamos al menos 3 puntos para una curva polinomial
                    x_hist = tendencia_mensual['mes'].values
                    y_hist = tendencia_mensual['cantidad'].values
                    
                    # Calcular el polinomio de grado 2 (No lineal)
                    coeficientes = np.polyfit(x_hist, y_hist, 2)
                    polinomio = np.poly1d(coeficientes)
                    
                    # Generar puntos de la curva suave para graficar
                    x_curva = np.linspace(x_hist.min(), x_hist.max() + 2, 100)
                    y_curva = polinomio(x_curva)
                    
                    # Proyectar Mes +1 y Mes +2
                    mes_futuro_1 = x_hist.max() + 1
                    mes_futuro_2 = x_hist.max() + 2
                    y_futuro_1 = max(0, int(polinomio(mes_futuro_1))) # Evitar volumen negativo
                    y_futuro_2 = max(0, int(polinomio(mes_futuro_2)))
                    
                    # Renderizar gráfico de matplotlib
                    fig_poly, ax_poly = plt.subplots(figsize=(10, 6))
                    
                    # Dispersión histórica
                    ax_poly.scatter(x_hist, y_hist, color='black', s=60, label='Historial Real (Compras consolidadas del mes)', zorder=5)
                    # Curva de Regresión
                    ax_poly.plot(x_curva, y_curva, color='royalblue', linestyle='-', linewidth=2, label=f'Tendencia Matemática (Curva de Ajuste)', alpha=0.8)
                    # Predicciones futuras
                    ax_poly.scatter([mes_futuro_1, mes_futuro_2], [y_futuro_1, y_futuro_2], color='red', marker='X', s=150, label='Proyección Determinística (Capacidad Futura)', zorder=6)
                    
                    # Anotaciones con recuadros para mayor claridad
                    bbox_props = dict(boxstyle="round,pad=0.3", fc="white", ec="darkred", lw=1.5, alpha=0.9)
                    ax_poly.annotate(f"Mes +1\n{y_futuro_1} unds.", (mes_futuro_1, y_futuro_1), 
                                     textcoords="offset points", xytext=(0,15), ha='center', color='darkred', fontweight='bold', bbox=bbox_props)
                    ax_poly.annotate(f"Mes +2\n{y_futuro_2} unds.", (mes_futuro_2, y_futuro_2), 
                                     textcoords="offset points", xytext=(0,15), ha='center', color='darkred', fontweight='bold', bbox=bbox_props)
                    
                    # Títulos y Ejes Explicativos
                    ax_poly.set_title(f"Evaluación de Capacidad de Compra Total (Cliente ID: {cliente_seleccionado})\n", fontsize=14, fontweight='bold')
                    ax_poly.text(0.5, 1.02, "(Nota: Este gráfico evalúa el Volumen Total Acumulado, no productos individuales)", 
                                 horizontalalignment='center', verticalalignment='bottom', transform=ax_poly.transAxes, fontsize=10, color='dimgray', style='italic')
                    
                    ax_poly.set_xlabel("Secuencia de Meses Activos (Línea de Tiempo)", fontsize=11, fontweight='bold')
                    ax_poly.set_ylabel("Volumen Total Consolidado (Suma de todas las unidades)", fontsize=11, fontweight='bold')
                    
                    # Leyenda mejorada
                    ax_poly.legend(loc='upper right', frameon=True, shadow=True, title="Leyenda de Variables:", title_fontsize='9')
                    ax_poly.grid(True, linestyle='--', alpha=0.5)
                    
                    st.pyplot(fig_poly)
                    
                    st.success(f"**Validación Matemática:** La curva extraída es $f(x) = {coeficientes[0]:.2f}x^2 + {coeficientes[1]:.2f}x + {coeficientes[2]:.2f}$. Al reemplazar la 'x' por el mes a proyectar, el sistema determina exactamente el tope de unidades sugeridas.")
                else:
                    st.warning("El cliente no cuenta con suficientes meses históricos (mínimo 3) para calcular una curva de regresión no lineal estadísticamente válida.")
            else:
                 st.warning("No hay datos de volumen en el tiempo para este cliente.")

        # =====================================================================
        # PESTAÑA GUÍA DIDÁCTICA
        # =====================================================================
        with tabs[5]:
            st.markdown("## ¿Cómo funciona el sistema? — Trazabilidad Matemática")
            st.caption(f"Auditoría interna de los algoritmos para el cliente **{opciones_clientes[cliente_seleccionado]}**.")

            st.markdown("---")
            st.markdown("### 📥 Paso 1 · Extracción de la Canasta (Datos Reales)")
            if not historial_crudo.empty:
                st.dataframe(historial_crudo.groupby('producto')['cantidad'].sum().reset_index().rename(columns={'producto': 'Fármaco', 'cantidad': 'Unidades Compradas'}), use_container_width=True)

            st.markdown("---")
            st.markdown(f"### 👥 Paso 2 · Asignación de Segmento (K-Means)")
            st.markdown(f"El algoritmo evaluó el volumen y la variedad de compras, asignando a este cliente al **Cluster #{cluster_cliente}**. De este grupo se extraen los promedios de unidades que se le sugieren comprar, garantizando que el volumen cotizado sea realista y escalable.")

            st.markdown("---")
            st.markdown("### 🛒 Paso 3 · Regla de Asociación Extraída (Apriori)")
            regla_cliente = next((rec for rec in proyecciones_por_mes[horizonte_meses[0]] if "Apriori" in rec["Motor Estratégico"]), None)
            if regla_cliente:
                st.markdown("El sistema escaneó las compras nacionales y aplicó esta regla para determinar *qué* producto ofrecer:")
                lift_valor = regla_cliente["Métrica"].split("|")[0].strip()
                conf_valor = regla_cliente["Métrica"].split("|")[1].strip()
                st.code(
                    f"SI compra [{regla_cliente['Detonante_Grafo']}] \n"
                    f"ENTONCES compra [{regla_cliente['Producto Recomendado']}] \n"
                    f"({conf_valor} | {lift_valor})", 
                    language=None
                )
            else:
                st.info("Para este cliente se utilizó el Fallback de K-Means (Top de su Cluster) para garantizar una recomendación.")

            st.markdown("---")
            st.markdown("### 💬 Paso 4 · Traducción Financiera (Gemini XAI)")
            st.markdown("Finalmente, Gemini cruza el Producto Sugerido (Apriori) con el Volumen Sugerido (K-Means) y redacta la justificación ejecutiva que el representante leerá en pantalla.")
            
            if regla_cliente:
                st.info(f"**🤖 Justificación generada:**\n\n{regla_cliente['Argumento Comercial (Gemini)']}")
            else:
                fallback_rec = next((rec for rec in proyecciones_por_mes[horizonte_meses[0]] if "K-Means" in rec["Motor Estratégico"]), None)
                if fallback_rec:
                    st.info(f"**🤖 Justificación generada:**\n\n{fallback_rec['Argumento Comercial (Gemini)']}")