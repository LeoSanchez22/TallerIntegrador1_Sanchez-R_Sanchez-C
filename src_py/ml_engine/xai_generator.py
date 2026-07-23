import os
from dotenv import load_dotenv

load_dotenv()

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
    Genera la justificación B2B exacta y estructurada en 2 párrafos a partir de las métricas de ML.
    """
    ancla = detonante if detonante else (historial_cliente[-1] if historial_cliente else "Historial")
    
    # Determinar designación temporal
    if "Mes +1" in horizonte_mes:
        designacion = "Acción Preventiva (Mes +1)"
    elif "Mes +2" in horizonte_mes:
        designacion = "Acción de Largo Plazo (Mes +2)"
    else:
        designacion = "Acción Inmediata"

    # Intentar usar Gemini con instrucciones ultra-estrictas para seguir el patrón del notebook
    api_key = os.getenv('GEMINI_API_KEY')
    if api_key:
        try:
            from google import genai
            client = genai.Client(api_key=api_key)
            prompt = f"""
            Actúa como un Auditor de Datos B2B farmacéutico. Debes generar exactamente el siguiente formato de texto utilizando los datos suministrados. No agregues saludos, ni explicaciones adicionales, ni introducciones. Evita tono de ventas u operacional.
            
            FORMATO REQUERIDO:
            La trazabilidad de esta recomendación se fundamenta en un análisis determinista que confirmó el consumo activo del producto ancla '[ANCLA]' en las transacciones reales del cliente. Esta detección habilitó una regla de asociación predefinida que asocia '[ANCLA]' con '[PRODUCTO_SUGERIDO]', respaldada por una confianza del [CONFIANZA]% y un lift de [LIFT], lo cual valida la correlación predictiva entre ambos productos dentro del patrón de compra histórico.

            Financieramente, se sugiere una adquisición de [CANTIDAD] unidades de '[PRODUCTO_SUGERIDO]', que representan un valor de $[VALOR], justificada por la mediana de consumo observada en el clúster de clientes al que pertenece esta entidad. Esta intervención se designa como [DESIGNACION], dado que el diagnóstico se elaboró a partir de datos transaccionales reales y actualizados a la fecha del mes en curso, asegurando la máxima relevancia y oportunidad.

            DATOS:
            - ANCLA: {ancla}
            - PRODUCTO_SUGERIDO: {producto_sugerido}
            - CONFIANZA: {confianza}
            - LIFT: {lift}
            - CANTIDAD: {cant_sug}
            - VALOR: {ingreso_est}
            - DESIGNACION: {designacion}
            """
            resp = client.models.generate_content(model='gemini-2.5-flash', contents=prompt)
            clean_text = resp.text.strip().replace('✅', '').replace('⚠️', '').replace('🚀', '').replace('🎯', '')
            if clean_text:
                return clean_text
        except Exception:
            pass

    # Fallback determinístico dinámico idéntico a la plantilla del notebook
    parrafo1 = (
        f"La trazabilidad de esta recomendación se fundamenta en un análisis determinista que "
        f"confirmó el consumo activo del producto ancla '{ancla}' en las transacciones reales del cliente. "
        f"Esta detección habilitó una regla de asociación predefinida que asocia '{ancla}' con '{producto_sugerido}', "
        f"respaldada por una confianza del {confianza}% y un lift de {lift}, lo cual valida la correlación predictiva "
        f"entre ambos productos dentro del patrón de compra histórico."
    )
    
    parrafo2 = (
        f"Financieramente, se sugiere una adquisición de {cant_sug} unidades de '{producto_sugerido}', "
        f"que representan un valor de ${ingreso_est:,.1f}, justificada por la mediana de consumo observada en el clúster "
        f"de clientes al que pertenece esta entidad. Esta intervención se designa como {designacion}, "
        f"dado que el diagnóstico se elaboró a partir de datos transaccionales reales y actualizados a la fecha del mes en curso, "
        f"asegurando la máxima relevancia y oportunidad."
    )
    
    return f"{parrafo1}\n\n{parrafo2}"
