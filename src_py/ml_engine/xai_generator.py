import os
import warnings
from dotenv import load_dotenv

load_dotenv()

# Suppress harmless SDK warnings
warnings.filterwarnings("ignore")

_genai_client = None

def _get_genai_client():
    global _genai_client
    if _genai_client is None:
        api_key = os.getenv('GEMINI_API_KEY')
        if api_key:
            try:
                from google import genai
                _genai_client = genai.Client(api_key=api_key)
            except Exception:
                _genai_client = False
        else:
            _genai_client = False
    return _genai_client if _genai_client is not False else None

def generar_explicacion_ml(
    producto_sugerido: str,
    historial_cliente: list,
    motor_origen: str,
    horizonte_mes: str,
    cant_sug: int,
    ingreso_est: float,
    confianza: float,
    lift: float,
    detonante: str,
    es_historico: bool
) -> str:
    """
    Genera una justificación comercial B2B breve, persuasiva y orientada al equipo de ventas.
    """
    ancla = detonante if detonante else (historial_cliente[-1] if historial_cliente else "Productos habituales")

    # Intentar generar con Gemini un pitch comercial conciso
    client = _get_genai_client()
    if client:
        try:
            prompt = f"""
            Actúa como un Especialista Comercial Senior en Farmacéutica Oftalmológica de Laboratorios Sophia.
            Genera un argumento de venta comercial (pitch de ventas B2B) breve, profesional, convincente y de alto impacto para el representante de ventas (máximo 2 oraciones, sin viñetas, sin markdown ni emojis).
            Contexto Oftalmológico:
            - Fármaco Oftálmico Recomendado: '{producto_sugerido}'
            - Fármaco / Categoría ancla de consumo activo: '{ancla}'
            - Volumen sugerido de reposición: {cant_sug} unidades
            - Facturación estimada: S/ {ingreso_est:,.2f}
            - Afinidad comercial proyectada: {confianza}%

            Enfoque: Resalta la sinergia terapéutica oftalmológica (lubricación ocular, antiinflamatorio, hipotensor, etc.), la alta rotación en botica/clínica oftálmica y la oportunidad de maximizar el margen del cliente con stock preferencial.
            """
            resp = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            clean_text = resp.text.strip().replace('✅', '').replace('⚠️', '').replace('🚀', '').replace('🎯', '').replace('**', '').replace('"', '')
            if clean_text:
                return clean_text
        except Exception:
            pass

    # Plantilla comercial concisa y directa para el área de ventas oftalmológicas
    return (
        f"Oportunidad oftalmológica complementaria al consumo frecuente de '{ancla}'. "
        f"'{producto_sugerido}' fortalece el protocolo terapéutico y la rotación en clínica con una afinidad proyectada del {confianza}%. "
        f"Se recomienda un pedido sugerido de {cant_sug} unidades (facturación estimada de S/ {ingreso_est:,.2f}) para optimizar el margen del cliente y asegurar disponibilidad preferencial de lote."
    )


