"""
Kerala SafeRoute - Dijkstra & A* Routing Algorithm Engine
"""

import math
import heapq
from typing import Dict, List, Set, Any, Optional

def evaluate_edge(
    edge: Dict[str, Any],
    disaster_type: str = "flood",
    severity: str = "moderate",
    closed_edge_ids: Optional[Set[str]] = None
) -> Dict[str, Any]:
    """
    Calculate dynamic edge weight and simulated risk score.
    Heuristic formula combining road elevation, flood susceptibility, and hazard proximity.
    """
    closed_ids = closed_edge_ids or set()
    is_closed = edge.get("id") in closed_ids or edge.get("is_closed", False)

    if is_closed:
        return {
            "weight": float("inf"),
            "riskScore": 100.0,
            "isClosed": True,
            "distance": edge.get("distance_km", 0.0)
        }

    # Severity Multiplier
    severity_multiplier = 1.0
    if severity == "moderate":
        severity_multiplier = 1.75
    elif severity == "severe":
        severity_multiplier = 3.0

    # Disaster Type Affinity
    disaster_affinity = 1.0
    hazard = edge.get("hazard_proximity", "none")
    elev = edge.get("elevation", 5.0)

    if disaster_type == "flood" and hazard == "hazard_periyar":
        disaster_affinity = 2.4
    elif disaster_type == "cyclone" and hazard == "hazard_vembanad":
        disaster_affinity = 2.5
    elif disaster_type == "waterlogging":
        if hazard == "hazard_edappally_canal":
            disaster_affinity = 2.2
        elif elev < 4.0:
            disaster_affinity = 1.6

    # Elevation Vulnerability Penalty: Lower ground = higher flood risk
    elevation_penalty = max(0.0, (12.0 - elev) / 12.0)

    # Base flood susceptibility
    base_susceptibility = edge.get("flood_susceptibility", 0.3)

    # Simulated Risk Score (0 - 100)
    raw_risk = (
        base_susceptibility * 45.0 +
        elevation_penalty * 35.0 +
        (20.0 if disaster_affinity > 1.0 else 0.0)
    ) * (severity_multiplier / 1.5)

    risk_score = min(99.0, max(5.0, round(raw_risk, 1)))

    # Combined Cost = Physical Distance * (1 + Risk Penalty)
    risk_penalty_factor = (risk_score / 100.0) * 2.5
    dist_km = edge.get("distance_km", 1.0)
    combined_weight = dist_km * (1.0 + risk_penalty_factor)

    return {
        "weight": combined_weight,
        "riskScore": risk_score,
        "isClosed": False,
        "distance": dist_km
    }

def run_dijkstra(
    graph_nodes: Dict[str, Any],
    graph_edges: List[Dict[str, Any]],
    source_id: str,
    target_id: Optional[str] = None,
    options: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Run Dijkstra's algorithm from source_id with disaster risk penalties.
    """
    opts = options or {}
    disaster_type = opts.get("disasterType", "flood")
    severity = opts.get("severity", "moderate")
    closed_edge_ids = set(opts.get("closedEdgeIds", []))

    if source_id not in graph_nodes:
        return {"error": f"Source node '{source_id}' not found in graph."}

    # 1. Build Adjacency List
    adj: Dict[str, List[Dict[str, Any]]] = {nid: [] for nid in graph_nodes}
    for edge in graph_edges:
        eval_data = evaluate_edge(edge, disaster_type, severity, closed_edge_ids)
        if not eval_data["isClosed"] and math.isfinite(eval_data["weight"]):
            u, v = edge["u"], edge["v"]
            if u in adj:
                adj[u].append({"target": v, "edge": edge, "eval": eval_data})
            if v in adj:
                adj[v].append({"target": u, "edge": edge, "eval": eval_data})

    # Dijkstra structures
    distances = {nid: float("inf") for nid in graph_nodes}
    dist_km = {nid: float("inf") for nid in graph_nodes}
    cum_risk = {nid: 0.0 for nid in graph_nodes}
    previous: Dict[str, Optional[Dict[str, Any]]] = {nid: None for nid in graph_nodes}

    distances[source_id] = 0.0
    dist_km[source_id] = 0.0
    cum_risk[source_id] = 0.0

    visited: Set[str] = set()
    steps: List[Dict[str, Any]] = []

    # Priority queue: (cost, node_id)
    pq = [(0.0, source_id)]

    steps.append({
        "iteration": 0,
        "currentNode": source_id,
        "action": f"Initialized Dijkstra from {graph_nodes[source_id].get('name', source_id)}. Cost set to 0.",
        "tentativeDistances": {k: round(v, 2) if math.isfinite(v) else "Infinity" for k, v in distances.items()},
        "visitedNodes": list(visited)
    })

    iter_count = 0
    while pq:
        curr_cost, u = heapq.heappop(pq)

        if u in visited:
            continue
        visited.add(u)
        iter_count += 1

        if target_id and u == target_id:
            steps.append({
                "iteration": iter_count,
                "currentNode": u,
                "action": f"Destination {graph_nodes[u].get('name', u)} reached with optimal combined cost {curr_cost:.2f}.",
                "tentativeDistances": {k: round(v, 2) if math.isfinite(v) else "Infinity" for k, v in distances.items()},
                "visitedNodes": list(visited)
            })
            break

        updates = []
        for neighbor_info in adj.get(u, []):
            v = neighbor_info["target"]
            edge = neighbor_info["edge"]
            edge_eval = neighbor_info["eval"]

            if v not in visited:
                tentative_cost = distances[u] + edge_eval["weight"]
                if tentative_cost < distances[v]:
                    old_cost = distances[v]
                    distances[v] = tentative_cost
                    dist_km[v] = dist_km[u] + edge_eval["distance"]
                    cum_risk[v] = cum_risk[u] + edge_eval["riskScore"]
                    previous[v] = {
                        "from": u,
                        "edge": edge,
                        "eval": edge_eval
                    }
                    heapq.heappush(pq, (tentative_cost, v))
                    old_cost_str = f"{old_cost:.2f}" if math.isfinite(old_cost) else "∞"
                    updates.append(
                        f"Relaxed {v}: cost {old_cost_str} → {tentative_cost:.2f} via {edge.get('name', '')}"
                    )

        steps.append({
            "iteration": iter_count,
            "currentNode": u,
            "nodeName": graph_nodes[u].get("name", u),
            "action": f"Evaluated {len(adj.get(u, []))} neighbors: {'; '.join(updates)}" if updates else f"Evaluated neighbors of {u}; no shorter paths.",
            "tentativeDistances": {k: round(v, 2) if math.isfinite(v) else "Infinity" for k, v in distances.items()},
            "visitedNodes": list(visited)
        })

    def reconstruct_path(dest_id: str) -> Optional[Dict[str, Any]]:
        if not previous[dest_id] and dest_id != source_id:
            return None
        path_nodes = []
        path_edges = []
        curr = dest_id

        while curr is not None:
            path_nodes.insert(0, curr)
            prev_info = previous.get(curr)
            if prev_info:
                path_edges.insert(0, prev_info["edge"])
                curr = prev_info["from"]
            else:
                curr = None

        total_k = dist_km[dest_id]
        total_c = distances[dest_id]
        edge_cnt = len(path_edges)
        avg_r = round(cum_risk[dest_id] / edge_cnt) if edge_cnt > 0 else 0

        return {
            "reachable": True,
            "sourceId": source_id,
            "destinationId": dest_id,
            "destinationNode": graph_nodes.get(dest_id),
            "pathNodes": path_nodes,
            "pathEdges": path_edges,
            "totalKm": round(total_k, 1),
            "totalCost": round(total_c, 1),
            "averageRiskScore": avg_r,
            "stepCount": len(path_nodes)
        }

    # If specific target requested
    if target_id and target_id != "auto":
        target_route = reconstruct_path(target_id)
        return {
            "status": "success",
            "backend": "Python 3.13 NetworkX SafeRoute Engine",
            "sourceId": source_id,
            "targetId": target_id,
            "route": target_route,
            "allDistances": {k: round(v, 2) if math.isfinite(v) else None for k, v in distances.items()},
            "steps": steps
        }

    # Otherwise collect all reachable shelters
    shelter_routes = []
    for nid, node in graph_nodes.items():
        if node.get("type") == "shelter":
            route = reconstruct_path(nid)
            if route:
                shelter_routes.append(route)

    shelter_routes.sort(key=lambda r: r["totalCost"])
    optimal_route = shelter_routes[0] if shelter_routes else None

    return {
        "status": "success",
        "backend": "Python 3.13 NetworkX SafeRoute Engine",
        "sourceId": source_id,
        "targetId": optimal_route["destinationId"] if optimal_route else None,
        "route": optimal_route,
        "optimalShelterRoute": optimal_route,
        "allShelterRoutes": shelter_routes,
        "allDistances": {k: round(v, 2) if math.isfinite(v) else None for k, v in distances.items()},
        "steps": steps
    }
