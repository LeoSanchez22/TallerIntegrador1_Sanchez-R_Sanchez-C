import pandas as pd
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

def segmentar_clientes_kmeans(df: pd.DataFrame, n_clusters: int = 4):
    """
    Segmenta los clientes según métricas RFM (Volumen, Variedad, Frecuencia).
    """
    if df is None or df.empty:
        return {}, pd.DataFrame(), {}

    df_rfm = df.groupby('cliente_id').agg(
        Volumen=('cantidad', 'sum'),
        Variedad=('producto_id', 'nunique'),
        Frecuencia=('mes', 'nunique') if 'mes' in df.columns else ('cantidad', 'count')
    ).fillna(0)

    scaler = StandardScaler()
    rfm_scaled = scaler.fit_transform(df_rfm)

    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    df_rfm['Cluster'] = kmeans.fit_predict(rfm_scaled)
    cluster_dict = df_rfm['Cluster'].to_dict()

    df_con_cluster = df.merge(df_rfm[['Cluster']], left_on='cliente_id', right_index=True)
    volumenes_cluster = df_con_cluster.groupby(['Cluster', 'producto'])['cantidad'].median().to_dict()

    return cluster_dict, df_rfm, volumenes_cluster
