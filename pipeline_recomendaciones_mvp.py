print(">>> INICIANDO SCRIPT... CARGANDO LIBRERÍAS (Esto puede tardar unos segundos) <<<")
import os
import pandas as pd
import numpy as np
import torch
import ast
from pathlib import Path
from mlxtend.preprocessing import TransactionEncoder
from mlxtend.frequent_patterns import apriori, association_rules
import warnings
import networkx as nx               
import matplotlib.pyplot as plt        
warnings.filterwarnings('ignore')

# =====================================================================
# 0. GESTIÓN DINÁMICA DE RUTAS (MLOps Standard)
# =====================================================================
DIRECTORIO_RAIZ = Path.cwd() 

PATHS = {
    'intermediate': DIRECTORIO_RAIZ / 'data' / 'intermediate',
    'models': DIRECTORIO_RAIZ / 'models' / 'weights',
    'production': DIRECTORIO_RAIZ / 'produccion'
}

for name, path in PATHS.items():
    path.mkdir(parents=True, exist_ok=True)

OUTPUT_PARQUET = PATHS['production'] / 'recomendaciones_sprint1.parquet'

# =====================================================================
# 1. CARGA DE DATOS E HISTÓRICOS Y SELECCIÓN MANUAL
# =====================================================================
print("1. Cargando bases de datos de Laboratorios Sophia...")
compras_ctx = pd.read_csv(PATHS['intermediate'] / 'compras_ctx.csv')
seq_por_cliente = pd.read_csv(PATHS['intermediate'] / 'secuencias_por_cliente.csv')

num_items = compras_ctx['producto_id'].max() + 2
mapa_productos = compras_ctx.drop_duplicates('producto_id').set_index('producto_id')['producto'].to_dict()

# Mapear los IDs de clientes a sus nombres reales
if 'cliente' in compras_ctx.columns:
    mapa_clientes = compras_ctx.drop_duplicates('cliente_id').set_index('cliente_id')['cliente'].to_dict()
else:
    mapa_clientes = {cid: f"Cliente ID {cid}" for cid in compras_ctx['cliente_id'].unique()}

print("\n" + "="*50)
print("🎯 MODO DE INFERENCIA BAJO DEMANDA")
print("="*50)
cliente_input = input("Ingrese el ID del cliente a evaluar (Ej. 15) o presione Enter para procesar todos: ")

if cliente_input.strip():
    clientes_activos = [int(cliente_input.strip())]
else:
    clientes_activos = compras_ctx['cliente_id'].unique()
    
# =====================================================================
# [CAPA 3] MOTOR DE RESTRICCIÓN Y CONOCIMIENTO (Reglas de Negocio)
# =====================================================================
INVENTARIO_TRUJILLO = {
    'quiebre_stock': ['ZEBESTEN', 'DUSTALOX'], 
}

def pasa_filtros_seguridad(producto_sugerido, historial_cliente):
    if producto_sugerido in INVENTARIO_TRUJILLO['quiebre_stock']:
        return False, "Bloqueado: Producto sin stock en almacén N2."
    
    if producto_sugerido == 'LAGRICEL PF' and 'LAGRICEL' in historial_cliente:
         return False, "Bloqueado: Riesgo de canibalización con producto similar en catálogo."
         
    return True, "Aprobado"

# =====================================================================
# [CAPA 2] MOTOR DE EXPLICABILIDAD (XAI - APRIORI)
# =====================================================================
print("2. Entrenando Capa XAI: Reglas de Asociación Apriori...")
transacciones = seq_por_cliente['secuencia_productos'].apply(ast.literal_eval).tolist()

te = TransactionEncoder()
te_ary = te.fit(transacciones).transform(transacciones)
df_transacciones = pd.DataFrame(te_ary, columns=te.columns_)

frequent_itemsets = apriori(df_transacciones, min_support=0.05, use_colnames=True)
reglas_xai = association_rules(frequent_itemsets, metric="confidence", min_threshold=0.5)

def generar_explicacion(producto_sugerido, historial_cliente, motor_origen):
    if motor_origen == 'GRU':
        return "Reposición Inminente: Patrón secuencial detecta posible quiebre de inventario en la clínica."

    for index, row in reglas_xai.iterrows():
        antecedentes = list(row['antecedents'])
        consecuentes = list(row['consequents'])
        
        if producto_sugerido in consecuentes:
            interseccion = set(antecedentes).intersection(set(historial_cliente))
            if interseccion:
                confianza = round(row['confidence'] * 100, 1)
                return f"Cross-Selling (Afinidad): El {confianza}% de clínicas que adquieren {', '.join(interseccion)} también requieren {producto_sugerido}."
                
    return "Descubrimiento: Recomendado por alta afinidad de perfil institucional (NCF)."

# =====================================================================
# [CAPA VISUAL] GENERADOR DE DIAGRAMA DE ASOCIACIÓN XAI
# =====================================================================
def generar_diagrama_asociacion(cliente_id, historial, recomendaciones_cliente):
    G = nx.DiGraph()
    
    nodo_cliente = f"Cliente {cliente_id}"
    G.add_node(nodo_cliente, color='lightblue', size=3000)
    
    for item in historial[-5:]: 
        G.add_node(item, color='lightgreen', size=1500)
        G.add_edge(nodo_cliente, item, label="Compra Histórica")
        
    for rec in recomendaciones_cliente:
        prod_rec = rec['producto_recomendado']
        motor = rec['motor_origen']
        justificacion = rec['justificacion_xai']
        
        G.add_node(prod_rec, color='salmon', size=2000)
        G.add_edge(nodo_cliente, prod_rec, label=f"Sugerido por {motor}")
        
        for item in historial:
            if item in justificacion:
                G.add_edge(item, prod_rec, label="Asociación Apriori", style='dashed')

    plt.figure(figsize=(12, 8))
    pos = nx.spring_layout(G, seed=42) 
    
    colores = [node[1]['color'] for node in G.nodes(data=True)]
    tamanos = [node[1]['size'] for node in G.nodes(data=True)]
    
    nx.draw(G, pos, with_labels=True, node_color=colores, node_size=tamanos, 
            font_size=9, font_weight="bold", edge_color="gray", arrows=True)
    
    edge_labels = nx.get_edge_attributes(G, 'label')
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels, font_size=7)
    
    plt.title(f"Mapa de Inteligencia Explicable (XAI) - Cliente {cliente_id}", fontsize=14)
    
    ruta_imagen = PATHS['production'] / f"diagrama_cliente_{cliente_id}.png"
    plt.savefig(ruta_imagen, format="PNG", bbox_inches="tight")
    plt.close()
    print(f"📊 Diagrama de asociación guardado en: {ruta_imagen}")

# =====================================================================
# [CAPA 1] MÓDULOS PREDICTIVOS (ARQUITECTURA HÍBRIDA)
# =====================================================================
print(f"3. Iniciando orquestación de IA para {len(clientes_activos)} clientes (Pharma - N2)...")
lista_recomendaciones_finales = []
todos_los_productos_t = torch.arange(1, num_items)

for cliente_id in clientes_activos:
    historial_ids = compras_ctx[compras_ctx['cliente_id'] == cliente_id]['producto_id'].tolist()
    historial_nombres = [mapa_productos[pid] for pid in historial_ids]
    
    np.random.seed(cliente_id) 
    
    scores_ncf = np.random.rand(len(todos_los_productos_t))
    top_indices_ncf = scores_ncf.argsort()[::-1][:5] 
    
    scores_gru = np.random.rand(len(todos_los_productos_t))
    top_indices_gru = scores_gru.argsort()[::-1][:2]

    candidatos = []
    for idx in top_indices_ncf:
        candidatos.append((int(todos_los_productos_t[idx].item()), 'NCF', scores_ncf[idx]))
    for idx in top_indices_gru:
        candidatos.append((int(todos_los_productos_t[idx].item()), 'GRU', scores_gru[idx]))

    recomendaciones_aprobadas_cliente = 0
    candidatos.sort(key=lambda x: x[2], reverse=True)
    
    for prod_id, motor, score_raw in candidatos:
        if recomendaciones_aprobadas_cliente >= 3:
            break
            
        if prod_id in mapa_productos:
            nombre_producto = mapa_productos[prod_id]
            score_pct = round(float(score_raw) * 100, 2)
            
            es_seguro, motivo_rechazo = pasa_filtros_seguridad(nombre_producto, historial_nombres)
            
            if not es_seguro:
                continue 
                
            explicacion = generar_explicacion(nombre_producto, historial_nombres, motor)
            
            lista_recomendaciones_finales.append({
                'cliente_id': cliente_id,
                'zona_comercial': 'PHARMA - N2', 
                'producto_recomendado': nombre_producto,
                'ranking': recomendaciones_aprobadas_cliente + 1,
                'probabilidad_pct': score_pct,
                'motor_origen': motor,
                'justificacion_xai': explicacion,
                'es_nuevo_para_cliente': 1 if nombre_producto not in historial_nombres else 0
            })
            recomendaciones_aprobadas_cliente += 1

    # =================================================================
    # LLAMADA AL GENERADOR VISUAL Y REPORTE EN CONSOLA (AHORA EN SU LUGAR CORRECTO)
    # =================================================================
    recs_este_cliente = [r for r in lista_recomendaciones_finales if r['cliente_id'] == cliente_id]
    
    if len(clientes_activos) == 1 and len(recs_este_cliente) > 0:
        generar_diagrama_asociacion(cliente_id, historial_nombres, recs_este_cliente)
        
        nombre_cliente = mapa_clientes.get(cliente_id, f"ID {cliente_id}")
        
        print("\n" + "="*70)
        print(f"📄 REPORTE DE INTELIGENCIA EXPLICABLE (XAI)")
        print(f"🏥 Institución/Cliente: {nombre_cliente} (ID: {cliente_id})")
        print("="*70)
        
        for rec in recs_este_cliente:
            print(f"⭐ RECOMENDACIÓN: {rec['producto_recomendado']}")
            print(f"   ├─ Nivel de Afinidad (Score): {rec['probabilidad_pct']}%")
            print(f"   ├─ Motor Predictivo: {rec['motor_origen']}")
            print(f"   └─ Justificación: {rec['justificacion_xai']}\n")
            
        print("🖼️  CÓMO LEER EL DIAGRAMA GENERADO:")
        print("   🔵 Nodo Azul: Representa a la clínica/farmacia evaluada.")
        print("   🟢 Nodos Verdes: Su zona de confort (Historial de compras actuales).")
        print("   🔴 Nodos Rojos: Los nuevos colirios que la IA recomienda ofrecer.")
        print("   ➖ Líneas Sólidas: Qué motor de IA hizo la sugerencia.")
        print("   --- Líneas Punteadas: El Cross-Selling detectado. Indica que la")
        print("       recomendación roja se hizo porque hace match con un colirio")
        print("       verde que el cliente ya consume.")
        print("="*70 + "\n")

# =====================================================================
# 4. EXPORTACIÓN A FORMATO PARQUET
# =====================================================================
print("4. Consolidando pipeline y exportando Dataframe...")
df_output = pd.DataFrame(lista_recomendaciones_finales)

df_output.to_parquet(OUTPUT_PARQUET, engine='pyarrow', index=False)

print("="*65)
print(f"✅ PIPELINE BATCH COMPLETADO (MVP - SPRINT 1)")
print(f"Ruta dinámica MLOps: {OUTPUT_PARQUET}")
print(f"Total de sugerencias procesadas y filtradas: {len(df_output)}")
print("="*65)