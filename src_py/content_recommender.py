"""
content_recommender.py — Motor de Similitud Terapéutica por Contenido
Laboratorios Sophia — Sprint 2
=======================================================
Mejoras sobre la versión anterior:
- Conocimiento clínico embebido en el código para los 16 productos existentes
  (el representante NO necesita completar un CSV ni un formulario para ellos)
- TF-IDF + coseno sobre texto clínico libre (composición + indicación + mecanismo)
  → discriminación fina: LAGRICEL vs DUSTALOX ya no dan el mismo score
- JSON solo para productos NUEVOS registrados por el representante (5 campos)
- Visualización de por qué se recomienda (campos que matchearon)
"""

import json
import numpy as np
import pandas as pd
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# =====================================================================
# BASE DE CONOCIMIENTO CLÍNICO EMBEBIDA
# Construida con información real de los productos de Sophia.
# El representante nunca toca esto — solo agrega productos NUEVOS via UI.
# =====================================================================
CONOCIMIENTO_BASE = {
    "LAGRICEL": {
        "sub_familia":   "Lubricante ocular",
        "mecanismo":     "lubricante hidratante lagrimal hialuronato sodio viscosidad retención acuosa",
        "indicacion":    "ojo seco síndrome ojo seco irritación ocular sequedad lubricación",
        "composicion":   "hialuronato de sodio 0.15% solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "LAGRICEL PF": {
        "sub_familia":   "Lubricante ocular sin conservantes",
        "mecanismo":     "lubricante hidratante lagrimal hialuronato sodio sin conservantes preservante",
        "indicacion":    "ojo seco severo intolerancia conservantes uso frecuente lubricación",
        "composicion":   "hialuronato de sodio libre de conservadores monodosis",
        "formato":       "Gotas monodosis",
        "es_nuevo":      False,
    },
    "ELIPTIC": {
        "sub_familia":   "Lubricante ocular",
        "mecanismo":     "lubricante hidratante lagrimal carboximetilcelulosa estabilización película lagrimal",
        "indicacion":    "ojo seco irritación sequedad ocular lubricación protección corneal",
        "composicion":   "carboximetilcelulosa sódica solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "ELIPTIC PF": {
        "sub_familia":   "Lubricante ocular sin conservantes",
        "mecanismo":     "lubricante hidratante lagrimal carboximetilcelulosa sin conservantes preservante",
        "indicacion":    "ojo seco severo intolerancia conservantes lubricación protección corneal",
        "composicion":   "carboximetilcelulosa sódica libre de conservadores",
        "formato":       "Gotas monodosis",
        "es_nuevo":      False,
    },
    "GAAP": {
        "sub_familia":   "Lubricante ocular",
        "mecanismo":     "lubricante hidratante lagrimal polivinilpirrolidona glicol propileno viscosidad",
        "indicacion":    "ojo seco irritación sequedad ocular lubricación confort visual",
        "composicion":   "polivinilpirrolidona polietilenglicol solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "GAAP PF": {
        "sub_familia":   "Lubricante ocular sin conservantes",
        "mecanismo":     "lubricante hidratante lagrimal polivinilpirrolidona sin conservantes preservante",
        "indicacion":    "ojo seco severo intolerancia conservantes lubricación confort visual",
        "composicion":   "polivinilpirrolidona polietilenglicol libre de conservadores",
        "formato":       "Gotas monodosis",
        "es_nuevo":      False,
    },
    "AQUADRAN": {
        "sub_familia":   "Lubricante ocular gel",
        "mecanismo":     "lubricante hidratante gel carbómero retención prolongada película lagrimal nocturno",
        "indicacion":    "ojo seco severo nocturno sequedad extrema protección corneal gel",
        "composicion":   "carbómero gel oftálmico",
        "formato":       "Gel",
        "es_nuevo":      False,
    },
    "DUSTALOX": {
        "sub_familia":   "Antibiótico antiinflamatorio ocular",
        "mecanismo":     "corticoide antibiótico dexametasona tobramicina antiinflamatorio antibacteriano",
        "indicacion":    "inflamación ocular infección bacteriana blefaritis conjuntivitis bacteriana postquirúrgico",
        "composicion":   "dexametasona 0.1% tobramicina 0.3% suspensión oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "FLUMETOL NF": {
        "sub_familia":   "Corticoide ocular",
        "mecanismo":     "corticoide fluorometolona antiinflamatorio esteroide ocular",
        "indicacion":    "inflamación ocular no infecciosa queratoconjuntivitis alergica postquirúrgico uveítis anterior",
        "composicion":   "fluorometolona 0.1% suspensión oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "SOPHIPREN": {
        "sub_familia":   "Corticoide ocular",
        "mecanismo":     "corticoide prednisolona antiinflamatorio esteroide potente ocular",
        "indicacion":    "inflamación ocular severa uveítis postquirúrgico queratitis corticoide",
        "composicion":   "prednisolona acetato 1% suspensión oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "ELAR-B": {
        "sub_familia":   "Corticoide antibiótico ocular",
        "mecanismo":     "corticoide antibiótico betametasona antiinflamatorio antibacteriano combinado",
        "indicacion":    "inflamación ocular infección bacteriana combinada blefaroconjuntivitis",
        "composicion":   "betametasona neomicina solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "TRAZIDEX O": {
        "sub_familia":   "Antibiótico antiinflamatorio ocular",
        "mecanismo":     "antibiótico antiinflamatorio tramadol dexametasona bactericida ocular gotas",
        "indicacion":    "conjuntivitis bacteriana blefaritis infección ocular postquirúrgico antibacteriano",
        "composicion":   "tobramicina dexametasona solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "TRAZIDEX U": {
        "sub_familia":   "Antibiótico antiinflamatorio ungüento",
        "mecanismo":     "antibiótico antiinflamatorio tobramicina dexametasona ungüento bactericida ocular nocturno",
        "indicacion":    "conjuntivitis bacteriana blefaritis infección ocular ungüento nocturno",
        "composicion":   "tobramicina dexametasona ungüento oftálmico",
        "formato":       "Ungüento",
        "es_nuevo":      False,
    },
    "ZEBESTEN": {
        "sub_familia":   "Antihistamínico antialérgico ocular",
        "mecanismo":     "antihistamínico estabilizador mastocitos ketotifeno antialérgico antipruriginoso",
        "indicacion":    "alergia ocular conjuntivitis alérgica prurito ocular picazón lagrimeo alérgico",
        "composicion":   "ketotifeno 0.025% solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "AGGLAD": {
        "sub_familia":   "Antihistamínico antialérgico ocular",
        "mecanismo":     "antihistamínico antialérgico olopatadina bloqueador H1 mastocitos estabilizador",
        "indicacion":    "conjuntivitis alérgica alergia ocular prurito picazón lagrimeo rojez alérgica",
        "composicion":   "olopatadina 0.1% solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
    "LANDAX": {
        "sub_familia":   "Antihistamínico antialérgico ocular",
        "mecanismo":     "antihistamínico antialérgico epinastina bloqueador H1 estabilizador mastocitos",
        "indicacion":    "conjuntivitis alérgica alergia ocular prurito picazón lagrimeo estacional",
        "composicion":   "epinastina 0.05% solución oftálmica",
        "formato":       "Gotas",
        "es_nuevo":      False,
    },
}

# Opciones para el formulario del representante
SUBFAMILIAS = [
    "Lubricante ocular",
    "Lubricante ocular sin conservantes",
    "Lubricante ocular gel",
    "Corticoide ocular",
    "Antibiótico antiinflamatorio ocular",
    "Corticoide antibiótico ocular",
    "Antihistamínico antialérgico ocular",
    "Antibiótico antiinflamatorio ungüento",
    "Oftalmología general",
]
FORMATOS = ["Gotas", "Ungüento", "Gel", "Suspensión", "Emulsión", "Gotas monodosis"]

METADATA_JSON_PATH = Path("productos_metadata.json")


# =====================================================================
# PERSISTENCIA JSON (solo para productos nuevos registrados por el rep.)
# =====================================================================

def cargar_metadatos_nuevos(ruta: Path = METADATA_JSON_PATH) -> dict:
    if ruta.exists():
        with open(ruta, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def guardar_metadatos_nuevos(registro: dict, ruta: Path = METADATA_JSON_PATH):
    with open(ruta, "w", encoding="utf-8") as f:
        json.dump(registro, f, ensure_ascii=False, indent=2)


def registrar_producto_nuevo(
    nombre: str,
    sub_familia: str,
    indicacion: str,
    composicion: str,
    formato: str,
    ruta: Path = METADATA_JSON_PATH,
) -> dict:
    """Registra un producto nuevo desde el formulario del dashboard."""
    registro = cargar_metadatos_nuevos(ruta)
    clave = nombre.upper().strip()
    # El mecanismo se enriquece concatenando sub-familia, indicación y composición
    # para maximizar las palabras clave disponibles para TF-IDF
    mecanismo_enriquecido = (
        f"{sub_familia.lower()} "
        f"{composicion.lower()} "
        f"lubricante hidratante lagrimal ocular "  # contexto base oftalmológico
        f"{indicacion.lower()}"
    )
    meta = {
        "sub_familia":  sub_familia,
        "mecanismo":    mecanismo_enriquecido,
        "indicacion":   indicacion,
        "composicion":  composicion,
        "formato":      formato,
        "es_nuevo":     True,
    }
    registro[clave] = meta
    guardar_metadatos_nuevos(registro, ruta)
    return {**meta, "producto": clave}


# =====================================================================
# MOTOR TF-IDF + COSENO
# =====================================================================

def _texto_clinico(meta: dict) -> str:
    """
    Concatena los campos clínicos de un producto en un texto libre.
    El TF-IDF aprende qué palabras son discriminativas entre productos.
    """
    partes = [
        meta.get("sub_familia", ""),
        meta.get("mecanismo", ""),
        meta.get("indicacion", ""),
        meta.get("composicion", ""),
        meta.get("formato", ""),
    ]
    return " ".join(p for p in partes if p).lower()


class MotorContenido:
    """
    Motor de recomendación para productos nuevos sin historial de ventas.

    Algoritmo:
    1. Construye un corpus de textos clínicos para todos los productos
       (base embebida + nuevos registrados por el representante).
    2. Aplica TF-IDF para convertir cada texto en un vector numérico.
       TF-IDF penaliza palabras muy comunes ("ocular", "gotas") y premia
       las discriminativas ("ketotifeno", "hialuronato"), dando scores
       milimétricos en lugar de valores planos.
    3. Calcula similitud coseno entre el producto nuevo y cada producto
       del historial del cliente.
    4. Si el máximo score supera el umbral → recomienda con justificación.
    """

    UMBRAL = 0.05  # Calibrado para TF-IDF sobre corpus oftalmológico pequeño

    def __init__(self, df_compras: pd.DataFrame = None, ruta_json: Path = METADATA_JSON_PATH):
        # 1. Base de conocimiento embebida
        registro = {k: dict(v) for k, v in CONOCIMIENTO_BASE.items()}

        # 2. Superponer productos nuevos registrados por el representante
        nuevos = cargar_metadatos_nuevos(ruta_json)
        for clave, meta in nuevos.items():
            registro[clave] = {**meta, "es_nuevo": True}

        self.registro = registro
        self.productos = list(registro.keys())

        # 3. Construir corpus TF-IDF
        corpus = [_texto_clinico(registro[p]) for p in self.productos]
        self._vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),   # unigramas + bigramas: "ojo seco" como unidad
            min_df=1,
            max_df=0.95,
            sublinear_tf=True,    # suaviza frecuencias altas
        )
        self._tfidf_matrix = self._vectorizer.fit_transform(corpus)
        self.p2i = {p: i for i, p in enumerate(self.productos)}

    def hay_productos_nuevos(self) -> bool:
        return any(m.get("es_nuevo") for m in self.registro.values())

    def productos_nuevos(self) -> list:
        return [p for p, m in self.registro.items() if m.get("es_nuevo")]

    def similitud_par(self, prod_a: str, prod_b: str) -> float:
        """Similitud coseno TF-IDF entre dos productos cualesquiera."""
        ka, kb = prod_a.upper().strip(), prod_b.upper().strip()
        if ka not in self.p2i or kb not in self.p2i:
            return 0.0
        ia, ib = self.p2i[ka], self.p2i[kb]
        sim = cosine_similarity(
            self._tfidf_matrix[ia], self._tfidf_matrix[ib]
        )[0][0]
        return round(float(sim), 4)

    def tabla_similitud_producto_nuevo(self, nombre_nuevo: str) -> pd.DataFrame:
        """
        Devuelve un DataFrame con la similitud del producto nuevo
        vs todos los productos existentes, con explicación de por qué.
        Útil para mostrar en el dashboard al registrar el producto.
        """
        clave = nombre_nuevo.upper().strip()
        if clave not in self.p2i:
            return pd.DataFrame()

        filas = []
        for prod, meta in self.registro.items():
            if prod == clave or meta.get("es_nuevo"):
                continue
            sim = self.similitud_par(clave, prod)
            meta_nuevo = self.registro[clave]

            # Explicación: campos que comparten
            coincidencias = []
            if meta.get("sub_familia") == meta_nuevo.get("sub_familia"):
                coincidencias.append(f"misma sub-familia ({meta['sub_familia']})")
            if meta.get("formato") == meta_nuevo.get("formato"):
                coincidencias.append(f"mismo formato ({meta['formato']})")

            # Palabras clave compartidas en composición/mecanismo
            palabras_nuevo = set(_texto_clinico(meta_nuevo).split())
            palabras_prod  = set(_texto_clinico(meta).split())
            comunes = palabras_nuevo & palabras_prod - {"de", "y", "el", "la", "en", "0.1%", "5%"}
            if comunes:
                top_comunes = sorted(comunes, key=len, reverse=True)[:3]
                coincidencias.append(f"comparten: {', '.join(top_comunes)}")

            filas.append({
                "Producto existente": prod,
                "Sub-familia":        meta.get("sub_familia", ""),
                "Similitud TF-IDF":   f"{sim*100:.1f}%",
                "¿Por qué?":          " | ".join(coincidencias) if coincidencias else "perfil diferente",
                "_score_raw":         sim,
            })

        df = pd.DataFrame(filas).sort_values("_score_raw", ascending=False).drop(columns=["_score_raw"])
        return df

    def score(self, historial_nombres: list, producto_nuevo: str) -> tuple:
        """
        Calcula afinidad entre el historial del cliente y un producto nuevo.

        Returns:
            (score: float, mejor_match: str, razon: str)
        """
        clave = producto_nuevo.upper().strip()
        if clave not in self.p2i:
            return 0.0, "", ""

        mejor_score, mejor_prod, mejor_razon = 0.0, "", ""

        for prod in historial_nombres:
            sim = self.similitud_par(clave, prod)
            if sim > mejor_score:
                mejor_score = sim
                mejor_prod  = prod

                # Construir razón legible para XAI
                meta_nuevo = self.registro.get(clave, {})
                meta_hist  = self.registro.get(prod.upper().strip(), {})
                partes_razon = []
                if meta_hist.get("sub_familia") == meta_nuevo.get("sub_familia"):
                    partes_razon.append(f"misma sub-familia terapéutica ({meta_nuevo.get('sub_familia')})")
                if meta_hist.get("formato") == meta_nuevo.get("formato"):
                    partes_razon.append("mismo formato de administración")
                palabras_n = set(_texto_clinico(meta_nuevo).split())
                palabras_h = set(_texto_clinico(meta_hist).split())
                comunes = palabras_n & palabras_h - {"de", "y", "el", "la", "en"}
                if comunes:
                    top = sorted(comunes, key=len, reverse=True)[:2]
                    partes_razon.append(f"principios activos relacionados: {', '.join(top)}")
                mejor_razon = "; ".join(partes_razon) if partes_razon else "afinidad de perfil terapéutico"

        return round(mejor_score, 4), mejor_prod, mejor_razon

    def recomendar_nuevos(self, historial_nombres: list, top_k: int = 3) -> list:
        """Retorna productos nuevos recomendados para el cliente."""
        historial_upper = {h.upper().strip() for h in historial_nombres}
        resultados = []

        for prod_nuevo in self.productos_nuevos():
            if prod_nuevo in historial_upper:
                continue
            s, match, razon = self.score(historial_nombres, prod_nuevo)
            if s >= self.UMBRAL:
                meta = self.registro[prod_nuevo]
                resultados.append({
                    "producto":    prod_nuevo,
                    "score":       s,
                    "similar_a":   match,
                    "razon_xai":   razon,
                    "sub_familia": meta.get("sub_familia", ""),
                    "indicacion":  meta.get("indicacion", ""),
                    "composicion": meta.get("composicion", ""),
                    "motor":       "Contenido (Nuevo Lanzamiento)",
                    "es_nuevo":    True,
                })

        resultados.sort(key=lambda x: x["score"], reverse=True)
        return resultados[:top_k]


# =====================================================================
# INTEGRACIÓN CON app.py
# =====================================================================

def inyectar_candidatos_nuevos(
    motor: MotorContenido,
    historial_nombres: list,
    mapa_nombre_a_id: dict,
) -> list:
    """
    Genera tuplas (prod_id_o_virtual, motor_nombre, score, meta_dict)
    listas para fusionarse con la lista de candidatos del pipeline GRU/NCF.
    """
    nuevos = motor.recomendar_nuevos(historial_nombres)
    candidatos = []
    for rec in nuevos:
        nombre  = rec["producto"]
        prod_id = mapa_nombre_a_id.get(nombre, f"NUEVO_{nombre}")
        candidatos.append((prod_id, rec["motor"], rec["score"], rec))
    return candidatos