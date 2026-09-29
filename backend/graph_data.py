"""
PlanEsc - Full Kerala Statewide Evacuation Network (Python Backend)
Loads the statewide graph from data/full_kerala_graph.json
"""
import json
import os

_DATA_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "full_kerala_graph.json")

with open(_DATA_FILE, "r", encoding="utf-8") as _f:
    _DATA = json.load(_f)

METADATA = _DATA["metadata"]
NODES = _DATA["nodes"]
EDGES = _DATA["edges"]
HAZARD_ZONES = _DATA["hazardZones"]
ROAD_CLOSURE_PRESETS = _DATA["roadClosurePresets"]
