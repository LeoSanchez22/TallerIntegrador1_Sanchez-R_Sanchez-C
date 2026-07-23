import numpy as np
import pandas as pd

def calcular_limites_polinomiales(df_cliente: pd.DataFrame) -> dict:
    """
    Calcula los topes deterministas de capacidad de compra mediante regresión cuadrática f(x) = ax^2 + bx + c.
    """
    limites = {}
    if df_cliente is None or df_cliente.empty or 'mes' not in df_cliente.columns:
        return limites

    tendencia = df_cliente.groupby('mes')['cantidad'].sum().reset_index()
    if len(tendencia) >= 3:
        x_hist = tendencia['mes'].values
        y_hist = tendencia['cantidad'].values
        try:
            coeficientes = np.polyfit(x_hist, y_hist, 2)
            polinomio = np.poly1d(coeficientes)
            ultimo_mes_real = x_hist.max()

            limites["Mes Actual (En Curso)"] = max(0, int(polinomio(ultimo_mes_real)))
            limites["Mes +1 (Próximo Mes)"] = max(0, int(polinomio(ultimo_mes_real + 1)))
            limites["Mes +2 (Proyección)"] = max(0, int(polinomio(ultimo_mes_real + 2)))
        except Exception:
            pass

    return limites
