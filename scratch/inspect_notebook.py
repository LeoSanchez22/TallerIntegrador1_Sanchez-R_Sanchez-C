import json

notebook_path = "c:/Users/Diego/Documents/Folder/TallerIntegrador1_Sanchez-R_Sanchez-C/notebooks/interactive_client_dashboard.ipynb"

try:
    with open(notebook_path, 'r', encoding='utf-8') as f:
        nb = json.load(f)
    
    cells = nb.get('cells', [])
    print(f"Total cells: {len(cells)}")
    
    # Let's filter and print code cells
    code_cells = [c for c in cells if c.get('cell_type') == 'code']
    print(f"Code cells: {len(code_cells)}")
    
    # Print the last 10 code cells to inspect prediction / inference logic
    print("=== Last 10 code cells ===")
    for i, cell in enumerate(code_cells[-15:]):
        source = "".join(cell.get('source', []))
        print(f"\n--- Code Cell {i+1} ---")
        print(source[:800]) # Print first 800 chars of each cell
        print("..." if len(source) > 800 else "")
except Exception as e:
    print("Error:", e)
