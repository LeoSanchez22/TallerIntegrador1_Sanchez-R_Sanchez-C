Lammra2469!Lammra2469!Lammra2469!Lammra2469!# Modelo de Recomendación y Predicción de Ventas con Deep Learning 

Este repositorio contiene el código para el procesamiento de datos, análisis de contexto comercial y entrenamiento de un modelo de Deep Learning basado en redes neuronales recurrentes, LSTM, NCF y Transfer Learning. El objetivo del sistema es procesar el historial de transacciones para predecir ventas y recomendar productos farmacéuticos u oftalmológicos específicos a clientes.

## 🗂️ Estructura del Proyecto

El flujo de trabajo dentro del cuaderno principal está dividido en tres etapas fundamentales:

### PARTE 1: Limpieza y Preparación de Datos
* **Carga de Bases de Datos:** Se monta el entorno de Google Drive y se procesa el archivo transaccional principal `BD zona.csv`.
* **Normalización:** Se estandarizan los formatos de las columnas (ej. `vendedor`, `cliente`, `producto`, `monto_cancelado`) convirtiendo los textos a mayúsculas y eliminando espacios residuales.
* **Banderas de Negocio (Business Flags):** Se diseñó un sistema de clasificación para identificar la naturaleza de cada transacción:
  * `is_purchase`: Identifica compras efectivas donde la cantidad entregada es mayor a cero.
  * `is_payment_only`: Detecta cobros de entregas pasadas donde no hubo movimiento de inventario en ese mes.
  * `is_return`: Clasifica transacciones que representan devoluciones o ajustes.
  * `is_credit_delivery`: Identifica entregas de productos a crédito (sin pago registrado en el mes).
* **Generación de Secuencias:** Las transacciones válidas se agrupan temporalmente por cliente para extraer la secuencia cronológica de productos adquiridos.

### PARTE 2: Integración de Contexto Comercial
* **Enriquecimiento de Datos:** Se cargan los archivos de soporte `Resumen_Valores-VENTA_POR_PRODUCTO2.csv`, `Resumen_Valores-VENTA_POR_FAMILIA2.csv` y el catálogo `maestra.csv`.
* **Ingeniería de Características:** Las tablas dinámicas de resumen se aplanan para obtener métricas clave por mes y por producto/familia, tales como:
  * `venta`: Monto global vendido.
  * `tgt`: Meta de ventas establecida.
  * `py24`: Rendimiento del año anterior para comparativas.
  * `pct`: Porcentaje de cumplimiento de la meta
* **Cruce de Información:** Se integran los códigos SKU y las descripciones formales de los productos al registro de compras del cliente.

### PARTE 3: Arquitectura y Entrenamiento del Modelo
* **Codificación y Tensores:** Se utiliza `LabelEncoder` para transformar las variables categóricas (como los IDs de productos) y se construyen las secuencias numéricas. 
* **Padding:** Las secuencias de historial se normalizan a una longitud máxima de 12 pasos (`MAX_LEN = 12`), rellenando con ceros (PAD) los espacios faltantes.
* **Arquitectura de la Red:** Se implementó una clase en PyTorch llamada `SalesGRU` que contiene:
  * Una capa de **Embedding** para aprender la representación vectorial de cada producto.
  * Una capa **GRU** (`hidden_size=128`) que procesa la concatenación de las características numéricas históricas y el embedding del producto.
  * Una capa lineal de salida con activación ReLU para la regresión final (predicción de la cantidad de cajas/ventas).
* **Entrenamiento:** El modelo se entrena durante 15 épocas empleando el optimizador Adam y evaluando el error mediante la pérdida cuadrática media (MSELoss) y la métrica RMSE.

## 🛠️ Tecnologías y Requisitos
Para reproducir y ejecutar este entorno, el cuaderno hace uso de las siguientes herramientas:
* `pandas` y `numpy` para estructuración y cálculo numérico.
* `torch` (PyTorch) para la creación, procesamiento y entrenamiento de tensores en GPU/CPU.
* `scikit-learn` para preprocesamiento de etiquetas (`LabelEncoder`).
* `unidecode` para el tratamiento de codificaciones de texto.

## 📚 Bibliografía y Referencias
El fundamento teórico del modelo y las técnicas de recomendación contextual se apoyan en una sólida revisión de literatura detallada al final del proyecto, incluyendo estudios sobre redes neuronales para sistemas de recomendación en e-commerce y extracción de características
