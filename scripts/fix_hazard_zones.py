"""
Restore coordinates in hazardZones for backend/graph_data.py and js/graph-data.js.
"""

import json
import re

hazard_zones = [
    {
      "id": "hazard_periyar",
      "name": "Periyar River Basin Overflow Zone",
      "type": "river_flood",
      "color": "#ef4444",
      "fillColor": "#f87171",
      "fillOpacity": 0.25,
      "desc": "Active flood plain of the Periyar river. High risk during intense dam releases and heavy catchment downpours.",
      "coordinates": [
        [10.135, 76.325],
        [10.125, 76.375],
        [10.090, 76.370],
        [10.060, 76.340],
        [10.045, 76.295],
        [10.075, 76.280],
        [10.110, 76.305]
      ]
    },
    {
      "id": "hazard_vembanad",
      "name": "Vembanad Backwaters Coastal Surge Strip",
      "type": "coastal_surge",
      "color": "#f59e0b",
      "fillColor": "#fbbf24",
      "fillOpacity": 0.22,
      "desc": "Low-lying tidal zone subject to storm surge inundation, high tides, and saline canal overflows.",
      "coordinates": [
        [9.995, 76.230],
        [9.990, 76.280],
        [9.955, 76.285],
        [9.940, 76.255],
        [9.950, 76.230]
      ]
    },
    {
      "id": "hazard_edappally_canal",
      "name": "Edappally Canal Inundation Depression",
      "type": "urban_waterlogging",
      "color": "#8b5cf6",
      "fillColor": "#a78bfa",
      "fillOpacity": 0.20,
      "desc": "Narrow urban canal drainage corridor prone to flash stagnation and submerged bridge underpasses.",
      "coordinates": [
        [10.035, 76.285],
        [10.040, 76.315],
        [10.015, 76.320],
        [10.010, 76.290]
      ]
    }
]

# 1. Update backend/graph_data.py
with open("backend/graph_data.py", "r", encoding="utf-8") as f:
    code = f.read()

code = re.sub(r"HAZARD_ZONES = \[.*?\]", f"HAZARD_ZONES = {json.dumps(hazard_zones, indent=4)}", code, flags=re.DOTALL)
with open("backend/graph_data.py", "w", encoding="utf-8") as f:
    f.write(code)

# 2. Update js/graph-data.js
with open("js/graph-data.js", "r", encoding="utf-8") as f:
    jscode = f.read()

jscode = re.sub(r'\"hazardZones\":\s*\[.*?\]', f'\"hazardZones\": {json.dumps(hazard_zones, indent=2)}', jscode, flags=re.DOTALL)
with open("js/graph-data.js", "w", encoding="utf-8") as f:
    f.write(jscode)

print("Restored hazard zones coordinates successfully!")
