import pandas as pd
from mlxtend.frequent_patterns import apriori, association_rules

def generar_reglas_apriori(df: pd.DataFrame, min_support: float = 0.05, min_lift: float = 1.0) -> pd.DataFrame:
    """
    Genera reglas de asociación Apriori a partir del historial de compras.
    """
    if df is None or df.empty:
        return pd.DataFrame(columns=['antecedents', 'consequents', 'confidence', 'lift', 'support'])
        
    cesta = df.groupby(['cliente_id', 'producto'])['cantidad'].sum().unstack().reset_index().fillna(0)
    cesta_bool = (cesta.drop('cliente_id', axis=1) > 0).astype(bool)

    if cesta_bool.empty:
        return pd.DataFrame(columns=['antecedents', 'consequents', 'confidence', 'lift', 'support'])

    itemsets_frecuentes = apriori(cesta_bool, min_support=min_support, use_colnames=True)
    if itemsets_frecuentes.empty:
        return pd.DataFrame(columns=['antecedents', 'consequents', 'confidence', 'lift', 'support'])

    reglas = association_rules(itemsets_frecuentes, metric="lift", min_threshold=min_lift)
    return reglas
