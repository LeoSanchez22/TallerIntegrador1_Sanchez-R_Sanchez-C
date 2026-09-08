import pandas as pd

def pasa_filtros_seguridad(
    producto_sugerido: str,
    historial_cliente: list,
    zona_actual: str,
    motor_origen: str,
    compras_df: pd.DataFrame,
    col_zona: str
) -> tuple:
    """
    Evalúa reglas de seguridad comerciales: quiebre de stock, repetición y canibalización de marca.
    """
    if compras_df is not None and 'sin_stock' in compras_df.columns and col_zona in compras_df.columns:
        quiebres = compras_df[(compras_df[col_zona] == zona_actual) & (compras_df['sin_stock'] == True)]['producto'].unique().tolist()
        if producto_sugerido in quiebres:
            return False, "Sin stock en la zona comercial."

    if motor_origen == 'Regla de Asociación (Apriori)' and producto_sugerido in historial_cliente:
        return False, "Producto ya consumido previamente por la institución."

    marca_sugerida = producto_sugerido.split()[0]
    for prod_hist in historial_cliente:
        if marca_sugerida == prod_hist.split()[0] and producto_sugerido != prod_hist:
            if producto_sugerido not in historial_cliente:
                return False, "Riesgo de canibalización de marca."

    return True, "Aprobado"
