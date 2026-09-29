"""
Update backend/graph_data.py and js/graph-data.js with the exact OSM road paths from data/real_roads.json.
"""

import os
import json
import re

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
real_roads_file = os.path.join(base_dir, "data", "real_roads.json")
backend_graph_file = os.path.join(base_dir, "backend", "graph_data.py")
frontend_graph_file = os.path.join(base_dir, "js", "graph-data.js")

with open(real_roads_file, "r", encoding="utf-8") as f:
    real_roads = json.load(f)

# 1. Update backend/graph_data.py
import sys
sys.path.insert(0, base_dir)
from backend.graph_data import NODES, EDGES, HAZARD_ZONES, METADATA

for edge in EDGES:
    eid = edge["id"]
    if eid in real_roads:
        edge["path"] = real_roads[eid]["path"]
        edge["distance_km"] = real_roads[eid]["distance_km"]

backend_code = f'''"""
Kerala SafeRoute - Kochi Evacuation Graph Dataset (Python Backend)
Pre-populated with exact OpenStreetMap driving geometries (Google Maps style).
"""

METADATA = {json.dumps(METADATA, indent=4)}

NODES = {json.dumps(NODES, indent=4)}

EDGES = {json.dumps(EDGES, indent=4)}

HAZARD_ZONES = {json.dumps(HAZARD_ZONES, indent=4)}
'''

with open(backend_graph_file, "w", encoding="utf-8") as f:
    f.write(backend_code)
print(f"Updated {backend_graph_file} with exact OSM road paths!")

# 2. Update js/graph-data.js
# Read existing js/graph-data.js to preserve ROAD_CLOSURE_PRESETS and header
with open(frontend_graph_file, "r", encoding="utf-8") as f:
    js_content = f.read()

# Replace the KERALA_GRAPH_DATA object in JS
js_graph_data = {
    "metadata": METADATA,
    "nodes": NODES,
    "edges": EDGES,
    "hazardZones": HAZARD_ZONES
}

js_replacement = f"""/**
 * Kerala SafeRoute - Demonstration Graph Data (Kochi Region)
 * Enhanced with 100% exact OpenStreetMap real-world driving road geometry (Google Maps style).
 */

const KERALA_GRAPH_DATA = {json.dumps(js_graph_data, indent=2)};

// Common Presets for Road Closures to toggle easily
const ROAD_CLOSURE_PRESETS = [
  {{
    edgeId: "e_edappally_cheranalloor",
    label: "Cheranalloor Link Road (Submerged)"
  }},
  {{
    edgeId: "e_kalamassery_aluva",
    label: "Periyar Riverside Highway (Breached)"
  }},
  {{
    edgeId: "e_fk_md",
    label: "Fort Kochi Coastal Corridor (Tidal Surge)"
  }}
];

if (typeof module !== 'undefined' && module.exports) {{
  module.exports = {{ KERALA_GRAPH_DATA, ROAD_CLOSURE_PRESETS }};
}}
"""

with open(frontend_graph_file, "w", encoding="utf-8") as f:
    f.write(js_replacement)
print(f"Updated {frontend_graph_file} with exact OSM road paths!")
