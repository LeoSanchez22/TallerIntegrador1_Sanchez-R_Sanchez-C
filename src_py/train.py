"""
train.py — Script de Entrenamiento para AttentionGRU Mejorado
Laboratorios Sophia — Pipeline MLOps
======================================================
Ejecutar en Google Colab o PC local con GPU/CPU:
    python train.py

Genera: modelo_sophia_final.pt (pesos entrenados)
"""

import os
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader
from pathlib import Path
import warnings
warnings.filterwarnings('ignore')

# =====================================================================
# CONFIGURACIÓN CENTRAL — Ajusta según tus datos
# =====================================================================
CONFIG = {
    "data_dir":        Path("data/intermediate"),
    "output_model":    Path("models/modelo_sophia_final.pt"),
    "embedding_dim":   64,
    "hidden_dim":      128,
    "dropout":         0.3,
    "lr":              0.001,
    "epochs":          50,
    "batch_size":      64,
    "seq_len":         10,       # Longitud máxima de secuencia que ve el modelo
    "k_eval":          5,        # Top-K para Hit Rate y NDCG
    "early_stop_patience": 7,    # Épocas sin mejora antes de parar
    "val_split":       0.15,     # 15% de clientes para validación
    "test_split":      0.10,     # 10% de clientes para test
    "min_seq_len":     3,        # Clientes con menos de 3 compras se omiten
    "seed":            42,
}

torch.manual_seed(CONFIG["seed"])
np.random.seed(CONFIG["seed"])

# =====================================================================
# 1. ARQUITECTURA MEJORADA — AttentionGRU con Embedding de Cliente
# =====================================================================
class AttentionGRUMejorado(nn.Module):
    """
    Mejoras sobre el modelo original:
    - Embedding de Cliente (personalización por institución)
    - Embedding de Mes (estacionalidad farmacéutica)
    - Dropout para regularización
    - Concatenación de contexto antes de la GRU
    """
    def __init__(self, num_items, num_clientes, num_meses=13,
                 embedding_dim=64, hidden_dim=128, dropout=0.3):
        super(AttentionGRUMejorado, self).__init__()

        # --- Embeddings ---
        self.item_embedding    = nn.Embedding(num_items,    embedding_dim, padding_idx=0)
        self.cliente_embedding = nn.Embedding(num_clientes, embedding_dim // 2)
        self.mes_embedding     = nn.Embedding(num_meses,    embedding_dim // 4)

        # El input a la GRU es: item_emb (64) + cliente_emb (32) + mes_emb (16) = 112
        gru_input_dim = embedding_dim + embedding_dim // 2 + embedding_dim // 4

        self.gru             = nn.GRU(gru_input_dim, hidden_dim, batch_first=True, num_layers=2, dropout=dropout)
        self.attention_layer = nn.Linear(hidden_dim, 1)
        self.dropout         = nn.Dropout(dropout)
        self.fc              = nn.Linear(hidden_dim, num_items)

    def forward(self, seq_items, cliente_id, mes_id):
        """
        seq_items:  (batch, seq_len)    — IDs de productos en historial
        cliente_id: (batch,)            — ID del cliente (institucion)
        mes_id:     (batch,)            — Mes de la predicción (1-12)
        """
        B, L = seq_items.shape

        # Embed items: (B, L, embedding_dim)
        item_emb = self.item_embedding(seq_items)

        # Embed cliente y mes, luego expandir a secuencia completa
        cli_emb = self.cliente_embedding(cliente_id).unsqueeze(1).expand(B, L, -1)  # (B, L, 32)
        mes_emb = self.mes_embedding(mes_id).unsqueeze(1).expand(B, L, -1)          # (B, L, 16)

        # Concatenar todo: (B, L, 112)
        x = torch.cat([item_emb, cli_emb, mes_emb], dim=-1)
        x = self.dropout(x)

        # GRU: (B, L, hidden_dim)
        gru_out, _ = self.gru(x)

        # Mecanismo de Atención
        attn_scores   = self.attention_layer(gru_out)            # (B, L, 1)
        attn_weights  = F.softmax(attn_scores, dim=1)            # (B, L, 1)
        context       = torch.sum(attn_weights * gru_out, dim=1) # (B, hidden_dim)
        context       = self.dropout(context)

        # Proyección final a logits sobre todos los productos
        logits = self.fc(context)                                 # (B, num_items)
        return logits, attn_weights


# =====================================================================
# 2. DATASET — Construcción de (secuencia → siguiente producto)
# =====================================================================
class SophiaDataset(Dataset):
    """
    Estrategia: Sliding window sobre el historial de cada cliente.
    Para cada cliente con historial [p1, p2, p3, p4, p5]:
      (contexto=[p1,p2,p3,p4], target=p5)
      (contexto=[p1,p2,p3],    target=p4)
      ...
    Esto maximiza el número de ejemplos de entrenamiento.
    """
    def __init__(self, registros, seq_len, cliente2idx, mes_col=None):
        self.muestras = []
        self.seq_len  = seq_len

        for (cliente_id_orig, mes), grupo in registros:
            # Mapear cliente a índice continuo
            cli_idx = cliente2idx.get(cliente_id_orig, 0)
            mes_idx = int(mes) if mes is not None else 1
            ids     = grupo['producto_id'].tolist()

            # Sliding window
            for fin in range(len(ids) - 1, 0, -1):
                target  = ids[fin]
                inicio  = max(0, fin - seq_len)
                ctx     = ids[inicio:fin]

                # Padding por la izquierda con 0
                pad_len = seq_len - len(ctx)
                ctx_pad = [0] * pad_len + ctx

                self.muestras.append({
                    "seq":       torch.tensor(ctx_pad, dtype=torch.long),
                    "cliente":   torch.tensor(cli_idx, dtype=torch.long),
                    "mes":       torch.tensor(mes_idx, dtype=torch.long),
                    "target":    torch.tensor(target,  dtype=torch.long),
                })

    def __len__(self):
        return len(self.muestras)

    def __getitem__(self, idx):
        return self.muestras[idx]


# =====================================================================
# 3. MÉTRICAS
# =====================================================================
def hit_rate_at_k(logits_batch, targets, k=5):
    """Proporción de casos donde el target está en el Top-K predicho."""
    topk = torch.topk(logits_batch, k, dim=1).indices  # (B, k)
    hits = (topk == targets.unsqueeze(1)).any(dim=1).float()
    return hits.mean().item()

def ndcg_at_k(logits_batch, targets, k=5):
    """NDCG promedio: penaliza aciertos en posiciones bajas."""
    topk     = torch.topk(logits_batch, k, dim=1).indices
    ndcg_sum = 0.0
    for i, target in enumerate(targets):
        match = (topk[i] == target).nonzero(as_tuple=True)
        if len(match[0]) > 0:
            pos = match[0][0].item()
            ndcg_sum += 1.0 / np.log2(pos + 2)
    return ndcg_sum / len(targets)


# =====================================================================
# 4. CARGA Y PREPARACIÓN DE DATOS
# =====================================================================
def preparar_datos(config):
    print("\n📂 Cargando datos...")
    compras_path = config["data_dir"] / "compras_ctx.csv"
    compras      = pd.read_csv(compras_path)

    # Detectar columna de cliente
    for col in ['cliente_id', 'cliente', 'Cliente']:
        if col in compras.columns:
            col_cliente_id = col
            break
    else:
        raise ValueError("No se encontró columna de cliente_id.")

    # Extraer mes si hay columna de fecha
    mes_disponible = False
    for col_fecha in ['fecha', 'date', 'fecha_pedido']:
        if col_fecha in compras.columns:
            compras['mes'] = pd.to_datetime(compras[col_fecha], errors='coerce').dt.month.fillna(1).astype(int)
            mes_disponible = True
            break
    if not mes_disponible:
        compras['mes'] = 1  # Si no hay fecha, asumimos mes 1

    # Filtrar clientes con historial suficiente
    conteos = compras.groupby(col_cliente_id)['producto_id'].count()
    clientes_validos = conteos[conteos >= config["min_seq_len"]].index
    compras = compras[compras[col_cliente_id].isin(clientes_validos)].copy()

    print(f"   ✔ {len(clientes_validos)} clientes con historial ≥ {config['min_seq_len']} compras")
    print(f"   ✔ {compras['producto_id'].nunique()} productos únicos")

    # Crear mapa cliente → índice continuo
    clientes_unicos = sorted(compras[col_cliente_id].unique().tolist())
    cliente2idx     = {c: i + 1 for i, c in enumerate(clientes_unicos)}  # 0 reservado para padding
    num_clientes    = len(clientes_unicos) + 1
    num_items       = int(compras['producto_id'].max()) + 2

    # Split Train / Val / Test por cliente (evita data leakage)
    np.random.shuffle(clientes_unicos)
    n_val  = max(1, int(len(clientes_unicos) * config["val_split"]))
    n_test = max(1, int(len(clientes_unicos) * config["test_split"]))

    clientes_test  = set(clientes_unicos[:n_test])
    clientes_val   = set(clientes_unicos[n_test:n_test + n_val])
    clientes_train = set(clientes_unicos[n_test + n_val:])

    def filtrar_y_agrupar(df, clientes_set):
        subset = df[df[col_cliente_id].isin(clientes_set)]
        return subset.groupby([col_cliente_id, 'mes'])

    grupos_train = filtrar_y_agrupar(compras, clientes_train)
    grupos_val   = filtrar_y_agrupar(compras, clientes_val)
    grupos_test  = filtrar_y_agrupar(compras, clientes_test)

    print(f"   ✔ Split — Train: {len(clientes_train)} | Val: {len(clientes_val)} | Test: {len(clientes_test)} clientes")

    ds_train = SophiaDataset(grupos_train, config["seq_len"], cliente2idx)
    ds_val   = SophiaDataset(grupos_val,   config["seq_len"], cliente2idx)
    ds_test  = SophiaDataset(grupos_test,  config["seq_len"], cliente2idx)

    print(f"   ✔ Muestras — Train: {len(ds_train)} | Val: {len(ds_val)} | Test: {len(ds_test)}")

    return ds_train, ds_val, ds_test, num_items, num_clientes, cliente2idx


# =====================================================================
# 5. BUCLE DE ENTRENAMIENTO
# =====================================================================
def entrenar(config):
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"\n⚙️  Dispositivo: {device}")

    ds_train, ds_val, ds_test, num_items, num_clientes, cliente2idx = preparar_datos(config)

    dl_train = DataLoader(ds_train, batch_size=config["batch_size"], shuffle=True,  drop_last=True)
    dl_val   = DataLoader(ds_val,   batch_size=config["batch_size"], shuffle=False, drop_last=False)
    dl_test  = DataLoader(ds_test,  batch_size=config["batch_size"], shuffle=False, drop_last=False)

    modelo = AttentionGRUMejorado(
        num_items    = num_items,
        num_clientes = num_clientes,
        embedding_dim = config["embedding_dim"],
        hidden_dim    = config["hidden_dim"],
        dropout       = config["dropout"],
    ).to(device)

    total_params = sum(p.numel() for p in modelo.parameters() if p.requires_grad)
    print(f"   ✔ Parámetros entrenables: {total_params:,}\n")

    optimizer = torch.optim.Adam(modelo.parameters(), lr=config["lr"], weight_decay=1e-5)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(optimizer, patience=3, factor=0.5)
    criterion = nn.CrossEntropyLoss(ignore_index=0)  # Ignora el padding

    mejor_hr_val     = 0.0
    epocas_sin_mejora = 0
    historial        = []

    print("=" * 60)
    print("🚀 INICIANDO ENTRENAMIENTO")
    print("=" * 60)

    for epoch in range(1, config["epochs"] + 1):
        # --- FASE DE ENTRENAMIENTO ---
        modelo.train()
        loss_total = 0.0

        for batch in dl_train:
            seq     = batch["seq"].to(device)
            cliente = batch["cliente"].to(device)
            mes     = batch["mes"].to(device)
            target  = batch["target"].to(device)

            optimizer.zero_grad()
            logits, _ = modelo(seq, cliente, mes)
            loss = criterion(logits, target)
            loss.backward()
            nn.utils.clip_grad_norm_(modelo.parameters(), max_norm=1.0)  # Gradient clipping
            optimizer.step()
            loss_total += loss.item()

        loss_media = loss_total / len(dl_train)

        # --- FASE DE VALIDACIÓN ---
        modelo.eval()
        hr_val, ndcg_val = 0.0, 0.0
        n_batches_val = 0

        with torch.no_grad():
            for batch in dl_val:
                seq     = batch["seq"].to(device)
                cliente = batch["cliente"].to(device)
                mes     = batch["mes"].to(device)
                target  = batch["target"].to(device)
                logits, _ = modelo(seq, cliente, mes)

                hr_val   += hit_rate_at_k(logits, target, k=config["k_eval"])
                ndcg_val += ndcg_at_k(logits, target, k=config["k_eval"])
                n_batches_val += 1

        hr_val   /= n_batches_val
        ndcg_val /= n_batches_val

        scheduler.step(1 - hr_val)  # Reduce LR si HR no mejora

        historial.append({"epoch": epoch, "loss": loss_media, "hr_val": hr_val, "ndcg_val": ndcg_val})
        print(f"Época {epoch:>3}/{config['epochs']} | Loss: {loss_media:.4f} | HR@5 Val: {hr_val*100:.1f}% | NDCG@5 Val: {ndcg_val:.4f}")

        # --- EARLY STOPPING + GUARDADO DEL MEJOR MODELO ---
        if hr_val > mejor_hr_val:
            mejor_hr_val = hr_val
            epocas_sin_mejora = 0
            # Convertir Path objects a str para compatibilidad con weights_only
            config_serializable = {k: str(v) if isinstance(v, Path) else v for k, v in config.items()}
            torch.save({
                "epoch":        epoch,
                "model_state":  modelo.state_dict(),
                "num_items":    num_items,
                "num_clientes": num_clientes,
                "cliente2idx":  cliente2idx,
                "config":       config_serializable,
                "hr_val":       hr_val,
                "ndcg_val":     ndcg_val,
            }, config["output_model"])
            print(f"   ✅ ¡Mejor modelo guardado! HR@5 = {hr_val*100:.1f}%")
        else:
            epocas_sin_mejora += 1
            if epocas_sin_mejora >= config["early_stop_patience"]:
                print(f"\n⏹️  Early Stopping en época {epoch} (sin mejora en {config['early_stop_patience']} épocas)")
                break

    # --- EVALUACIÓN FINAL EN TEST ---
    print("\n" + "=" * 60)
    print("📊 EVALUACIÓN FINAL EN CONJUNTO DE TEST")
    print("=" * 60)

    checkpoint = torch.load(config["output_model"], map_location=device, weights_only=False)
    modelo.load_state_dict(checkpoint["model_state"])
    modelo.eval()

    hr_test, ndcg_test = 0.0, 0.0
    n_batches_test = 0

    with torch.no_grad():
        for batch in dl_test:
            seq     = batch["seq"].to(device)
            cliente = batch["cliente"].to(device)
            mes     = batch["mes"].to(device)
            target  = batch["target"].to(device)
            logits, _ = modelo(seq, cliente, mes)

            hr_test   += hit_rate_at_k(logits, target, k=config["k_eval"])
            ndcg_test += ndcg_at_k(logits, target, k=config["k_eval"])
            n_batches_test += 1

    hr_test   /= n_batches_test
    ndcg_test /= n_batches_test

    print(f"\n  Hit Rate@5 (Test):  {hr_test * 100:.1f}%")
    print(f"  NDCG@5     (Test):  {ndcg_test:.4f}")
    print(f"\n  Modelo guardado en: {config['output_model']}")
    print("\n✅ Entrenamiento completado. Carga el .pt en tu app.py.")

    return historial


# =====================================================================
# 6. PUNTO DE ENTRADA
# =====================================================================
if __name__ == "__main__":
    historial = entrenar(CONFIG)