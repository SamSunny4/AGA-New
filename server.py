"""
Kerala SafeRoute - Python Backend Server & REST API
Provides high-performance graph algorithm calculations:
- Dijkstra's & A* Shortest/Safest Evacuation Path
- Minimum Spanning Tree (Kruskal's & Prim's)
- Edmonds-Karp Maximum Flow & Minimum Cut Bottleneck Analysis
- Static file server for the web interface
"""

import sys
import os
import json
import argparse
from typing import Any, Dict, List, Optional
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

# Ensure backend package can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.graph_data import NODES, EDGES, HAZARD_ZONES, METADATA
from backend.dijkstra import run_dijkstra, evaluate_edge
from backend.mst import run_kruskal, run_prim
from backend.maxflow import compute_max_flow

# Sample fallback graphs for Algorithm Lab
SAMPLE_MST_GRAPH = {
    "nodes": ["HQ", "HOSP", "CAMP", "RADIO", "DEPOT", "POWER"],
    "edges": [
        {"id": "e1", "u": "HQ",    "v": "HOSP",  "weight": 4.2, "name": "HQ - Hospital"},
        {"id": "e2", "u": "HQ",    "v": "CAMP",  "weight": 3.5, "name": "HQ - Camp"},
        {"id": "e3", "u": "HOSP",  "v": "CAMP",  "weight": 5.1, "name": "Hospital - Camp"},
        {"id": "e4", "u": "HOSP",  "v": "RADIO", "weight": 3.8, "name": "Hospital - Radio"},
        {"id": "e5", "u": "CAMP",  "v": "DEPOT", "weight": 4.6, "name": "Camp - Depot"},
        {"id": "e6", "u": "RADIO", "v": "DEPOT", "weight": 3.2, "name": "Radio - Depot"},
        {"id": "e7", "u": "RADIO", "v": "POWER", "weight": 5.5, "name": "Radio - Power"},
        {"id": "e8", "u": "DEPOT", "v": "POWER", "weight": 2.8, "name": "Depot - Power"},
        {"id": "e9", "u": "HQ",    "v": "RADIO", "weight": 7.0, "name": "HQ - Radio Direct"}
    ]
}

SAMPLE_FLOW_GRAPH = {
    "nodes": ["S", "A", "B", "C", "D", "T"],
    "edges": [
        {"id": "e_sa", "u": "S", "v": "A", "capacity": 1200, "name": "S → A (Coastal Exit North)"},
        {"id": "e_sb", "u": "S", "v": "B", "capacity": 1500, "name": "S → B (Coastal Exit South)"},
        {"id": "e_ab", "u": "A", "v": "B", "capacity": 400,  "name": "A → B (Cross Bypass)"},
        {"id": "e_ac", "u": "A", "v": "C", "capacity": 900,  "name": "A → C (Canal Bridge Link)"},
        {"id": "e_bd", "u": "B", "v": "D", "capacity": 1400, "name": "B → D (Southern Ring Road)"},
        {"id": "e_cd", "u": "C", "v": "D", "capacity": 300,  "name": "C → D (Interchange Ramp)"},
        {"id": "e_ct", "u": "C", "v": "T", "capacity": 1100, "name": "C → T (Highland Inbound North)"},
        {"id": "e_dt", "u": "D", "v": "T", "capacity": 1600, "name": "D → T (Highland Inbound South)"}
    ]
}

class SafeRouteAPIHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for API and static requests
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, data: Any, status_code: int = 200):
        response_bytes = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/health":
            self.send_json({
                "status": "online",
                "backend": "Python 3.13 NetworkX SafeRoute Engine",
                "algorithms": ["Dijkstra", "A*", "Kruskal MST", "Prim MST", "Edmonds-Karp MaxFlow", "Min-Cut"],
                "region": "Kochi, Kerala"
            })
            return

        if path == "/api/graph":
            shelters = [n for n in NODES.values() if n.get("type") == "shelter"]
            self.send_json({
                "metadata": METADATA,
                "nodeCount": len(NODES),
                "edgeCount": len(EDGES),
                "shelterCount": len(shelters),
                "nodes": NODES,
                "edges": EDGES,
                "hazardZones": HAZARD_ZONES
            })
            return

        # Serve static files for normal web browsing
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Read JSON body
        content_length = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_length) if content_length > 0 else b"{}"

        try:
            body = json.loads(post_data.decode("utf-8")) if post_data else {}
        except json.JSONDecodeError:
            self.send_json({"error": "Invalid JSON payload in request body"}, 400)
            return

        # 1. Route Planning Endpoint: /api/route
        if path == "/api/route":
            source_id = body.get("sourceId") or body.get("origin") or "fort_kochi"
            target_id = body.get("targetId") or body.get("shelter")
            if target_id == "auto":
                target_id = None

            options = {
                "disasterType": body.get("disasterType", "flood"),
                "severity": body.get("severity", "moderate"),
                "closedEdgeIds": body.get("closedEdgeIds", [])
            }

            custom_nodes = body.get("nodes", NODES)
            custom_edges = body.get("edges", EDGES)

            result = run_dijkstra(custom_nodes, custom_edges, source_id, target_id, options)
            self.send_json(result)
            return

        # 2. Minimum Spanning Tree Endpoint: /api/mst
        if path == "/api/mst":
            algorithm = body.get("algorithm", "kruskal")
            start_node = body.get("startNode", "HQ")
            node_ids = body.get("nodes", SAMPLE_MST_GRAPH["nodes"])
            edges = body.get("edges", SAMPLE_MST_GRAPH["edges"])

            if algorithm == "prim":
                result = run_prim(node_ids, edges, start_node)
            else:
                result = run_kruskal(node_ids, edges)

            self.send_json(result)
            return

        # 3. Maximum Flow & Minimum Cut Endpoint: /api/maxflow
        if path == "/api/maxflow":
            source = body.get("source", "S")
            sink = body.get("sink", "T")
            nodes = body.get("nodes", SAMPLE_FLOW_GRAPH["nodes"])
            edges = body.get("edges", SAMPLE_FLOW_GRAPH["edges"])

            result = compute_max_flow(nodes, edges, source, sink)
            self.send_json(result)
            return

        # Unknown endpoint
        self.send_json({"error": f"Endpoint '{path}' not found on Python SafeRoute backend."}, 404)

def run_server(port: int = 8008, bind_address: str = "0.0.0.0"):
    # Ensure stdout handles UTF-8 on Windows
    if sys.stdout.encoding != 'utf-8':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except Exception:
            pass

    web_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(web_dir)
    server_address = (bind_address, port)
    httpd = ThreadingHTTPServer(server_address, SafeRouteAPIHandler)
    print("=" * 60)
    print(f"Kerala SafeRoute Python Backend running on http://localhost:{port}")
    print("Serving web application and REST API endpoints:")
    print("  * GET  /api/health")
    print("  * GET  /api/graph")
    print("  * POST /api/route")
    print("  * POST /api/mst")
    print("  * POST /api/maxflow")
    print("=" * 60)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Kerala SafeRoute Python Server")
    parser.add_argument("--port", type=int, default=8008, help="Port to listen on (default 8008)")
    parser.add_argument("--bind", type=str, default="0.0.0.0", help="Address to bind to (default 0.0.0.0)")
    args = parser.parse_args()
    run_server(port=args.port, bind_address=args.bind)
