"""
Script to fetch 100% exact OpenStreetMap road network geometry (like Google Maps)
for all edges in the Kochi evacuation network using OSRM.
"""

import sys
import os
import json
import time
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.graph_data import NODES, EDGES

def fetch_osrm_road(u_lat, u_lng, v_lat, v_lng):
    # OSRM expects {lng},{lat};{lng},{lat}
    url = f"http://router.project-osrm.org/route/v1/driving/{u_lng},{u_lat};{v_lng},{v_lat}?overview=full&geometries=geojson"
    req = urllib.request.Request(url, headers={"User-Agent": "KeralaSafeRouteRoadFetcher/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode())
            if data.get("code") == "Ok" and data.get("routes"):
                route = data["routes"][0]
                distance_km = round(route["distance"] / 1000.0, 1)
                # OSRM gives [lng, lat], Leaflet wants [lat, lng]
                leaflet_coords = [[round(pt[1], 5), round(pt[0], 5)] for pt in route["geometry"]["coordinates"]]
                return leaflet_coords, distance_km
    except Exception as e:
        print(f"  OSRM error: {e}")
    return None, None

def main():
    print(f"Fetching real road geometry for {len(EDGES)} corridors from OpenStreetMap...")
    results = {}
    for i, edge in enumerate(EDGES):
        u_node = NODES[edge["u"]]
        v_node = NODES[edge["v"]]
        print(f"[{i+1}/{len(EDGES)}] {edge['name']} ({edge['u']} -> {edge['v']})...", end="", flush=True)
        
        coords, real_dist = fetch_osrm_road(u_node["lat"], u_node["lng"], v_node["lat"], v_node["lng"])
        if coords and len(coords) > 2:
            print(f" OK! {len(coords)} points, {real_dist} km")
            results[edge["id"]] = {
                "path": coords,
                "distance_km": real_dist
            }
        else:
            print(" Fallback to existing path")
            results[edge["id"]] = {
                "path": edge.get("path", []),
                "distance_km": edge.get("distance_km", 5.0)
            }
        time.sleep(0.3)  # Be polite to public OSRM server

    out_file = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "real_roads.json")
    os.makedirs(os.path.dirname(out_file), exist_ok=True)
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nSaved real road geometries to {out_file}!")

if __name__ == "__main__":
    main()
