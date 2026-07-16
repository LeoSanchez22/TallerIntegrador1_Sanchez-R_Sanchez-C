import json

notebook_path = "c:/Users/Diego/Documents/Folder/TallerIntegrador1_Sanchez-R_Sanchez-C/notebooks/interactive_client_dashboard.ipynb"

with open(notebook_path, 'r', encoding='utf-8') as f:
    nb = json.load(f)

cells = nb.get('cells', [])
code_cells = [c for c in cells if c.get('cell_type') == 'code']

# Find the cell containing ejecutar_inferencia_local
for i, cell in enumerate(code_cells):
    source = "".join(cell.get('source', []))
    if "def ejecutar_inferencia_local" in source:
        print(f"Found in code cell {i+1}:")
        print(source)
        break
