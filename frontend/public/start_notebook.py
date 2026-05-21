import subprocess
import sys

# Configuramos los argumentos como una lista para que subprocess
# los maneje directamente sin pasar por el shell ni sus reglas de comillas.
args = [
    "jupyter",
    "notebook",
    "--ServerApp.token=",
    "--ServerApp.password=",
    "--ServerApp.tornado_settings={\"headers\": {\"Content-Security-Policy\": \"frame-ancestors 'self' http://localhost:3000\"}}"
]

print("Iniciando Jupyter Notebook con configuración segura...")
try:
    subprocess.run(args, check=True)
except KeyboardInterrupt:
    print("\nJupyter Notebook detenido.")
except Exception as e:
    print(f"Error al iniciar Jupyter: {e}")
