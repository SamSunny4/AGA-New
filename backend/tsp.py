"""
PlanEsc - Travelling Salesman Problem (TSP) Engine
Solves optimal multi-stop rescue vehicle routes across disaster zones using 2-Opt heuristic local search.
"""

import math
import heapq
from typing import Dict, List, Set, Any, Optional, Tuple

def _dijkstra_shortest_path(nodes: Dict[str, Any], edges: List[Dict[str, Any]], start_id: str, target_id: str) -> Tuple[float, List[str], List[List[float]]]:
    """Calculate shortest distance and path between two nodes using Dijkstra's algorithm."""
    if start_id == target_id:
        return 0.0, [start_id], []

    adj = {nid: [] for nid in nodes}
    edge_map = {}
    for e in edges:
        u, v = e["u"], e["v"]
        dist = e.get("distance_km", 5.0)
        adj[u].append((v, dist, e))
        adj[v].append((u, dist, e))
        edge_map[(u, v)] = e
        edge_map[(v, u)] = e

    dist = {nid: float("inf") for nid in nodes}
    prev = {}
    dist[start_id] = 0.0

    pq = [(0.0, start_id)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        if u == target_id:
            break

        for v, weight, e in adj.get(u, []):
            new_dist = d + weight
            if new_dist < dist[v]:
                dist[v] = new_dist
                prev[v] = (u, e)
                heapq.heappush(pq, (new_dist, v))

    if dist[target_id] == float("inf"):
        # Fallback to straight-line Euclidean distance
        n1 = nodes[start_id]
        n2 = nodes[target_id]
        lat_diff = (n1["lat"] - n2["lat"]) * 111.0
        lng_diff = (n1["lng"] - n2["lng"]) * 111.0 * math.cos(math.radians((n1["lat"] + n2["lat"]) / 2.0))
        eucl = math.sqrt(lat_diff * lat_diff + lng_diff * lng_diff) * 1.3
        return round(eucl, 2), [start_id, target_id], [[n1["lat"], n1["lng"]], [n2["lat"], n2["lng"]]]

    # Reconstruct path and polyline coordinates
    curr = target_id
    path_nodes = []
    polyline_coords = []
    
    while curr in prev:
        path_nodes.append(curr)
        u, e = prev[curr]
        # Include detailed edge path if available
        if e.get("path"):
            coords = e["path"] if e["u"] == u else list(reversed(e["path"]))
            for pt in reversed(coords):
                polyline_coords.append(pt)
        else:
            polyline_coords.append([nodes[curr]["lat"], nodes[curr]["lng"]])
        curr = u
    path_nodes.append(start_id)
    path_nodes.reverse()
    polyline_coords.reverse()

    return round(dist[target_id], 2), path_nodes, polyline_coords

def solve_tsp_2opt(cost_matrix: List[List[float]], start_idx: int = 0, initial_tour: Optional[List[int]] = None) -> Tuple[List[int], List[int], float, float, float, float, int]:
    """
    Solve TSP on an N x N distance matrix using 2-Opt local search.
    Returns (original_tour, optimized_tour, initial_dist, optimal_dist, imp_dist, imp_pct, iterations).
    """
    N = len(cost_matrix)
    if N <= 1:
        return [0, 0], [0, 0], 0.0, 0.0, 0.0, 0.0, 0
    if N == 2:
        d = round(cost_matrix[0][1] + cost_matrix[1][0], 2)
        return [0, 1, 0], [0, 1, 0], d, d, 0.0, 0.0, 0

    if initial_tour and len(initial_tour) == N + 1:
        tour = list(initial_tour)
    else:
        tour = [start_idx] + [i for i in range(N) if i != start_idx] + [start_idx]
    original_tour = list(tour)

    def tour_length(t: List[int]) -> float:
        total = 0.0
        for i in range(len(t) - 1):
            total += cost_matrix[t[i]][t[i + 1]]
        return total

    initial_length = round(tour_length(tour), 2)
    best_length = initial_length
    improved = True
    iterations = 0

    # 2-Opt Local Search (Edge Inversions)
    while improved and iterations < 100:
        improved = False
        iterations += 1
        for i in range(1, len(tour) - 2):
            for j in range(i + 1, len(tour) - 1):
                a, b = tour[i - 1], tour[i]
                c, d = tour[j], tour[j + 1]

                current_dist = cost_matrix[a][b] + cost_matrix[c][d]
                new_dist = cost_matrix[a][c] + cost_matrix[b][d]

                if new_dist < current_dist - 1e-4:
                    tour[i:j + 1] = reversed(tour[i:j + 1])
                    best_length = round(tour_length(tour), 2)
                    improved = True
                    break
            if improved:
                break

    imp_dist = max(0.0, round(initial_length - best_length, 2))
    imp_pct = round((imp_dist / initial_length) * 100, 1) if initial_length > 0 else 0.0

    return original_tour, tour, initial_length, best_length, imp_dist, imp_pct, iterations

def solve_tsp_optimal(cost_matrix: List[List[float]], start_idx: int = 0, initial_tour: Optional[List[int]] = None) -> Tuple[List[int], List[int], float, float, float, float, int, bool]:
    """
    Solves TSP with a guarantee of finding the absolute shortest possible Hamiltonian cycle.
    For N <= 10 (which covers all disaster regions), uses DFS Branch & Bound with 2-Opt upper bounding.
    Returns (orig_tour, best_tour, initial_dist, optimal_dist, imp_dist, imp_pct, iterations, is_exact_optimal).
    """
    N = len(cost_matrix)
    if N <= 1:
        return [0, 0], [0, 0], 0.0, 0.0, 0.0, 0.0, 0, True
    if N == 2:
        d = round((cost_matrix[0][1] + cost_matrix[1][0]), 2)
        return [0, 1, 0], [0, 1, 0], d, d, 0.0, 0.0, 0, True

    # 1. Obtain upper bound via 2-Opt
    orig_tour, tour_2opt, init_d, best_2opt_d, imp_d, imp_pct, iters = solve_tsp_2opt(cost_matrix, start_idx, initial_tour)
    best_tour = list(tour_2opt)
    min_dist = best_2opt_d
    is_exact = True

    # 2. If N <= 10, run Branch & Bound for proven exact global minimum
    if N <= 10:
        def bnb_dfs(curr: int, current_dist: float, visited_count: int, visited_mask: int, path: List[int]):
            nonlocal min_dist, best_tour
            if current_dist >= min_dist:
                return
            if visited_count == N:
                total = current_dist + cost_matrix[curr][start_idx]
                if total < min_dist - 1e-6:
                    min_dist = total
                    best_tour = path + [start_idx]
                return

            # Order candidates by edge cost for early pruning
            candidates = []
            for nxt in range(N):
                if not (visited_mask & (1 << nxt)):
                    candidates.append((cost_matrix[curr][nxt], nxt))
            candidates.sort(key=lambda x: x[0])

            for edge_cost, nxt in candidates:
                if current_dist + edge_cost >= min_dist:
                    continue
                bnb_dfs(nxt, current_dist + edge_cost, visited_count + 1, visited_mask | (1 << nxt), path + [nxt])

        bnb_dfs(start_idx, 0.0, 1, 1 << start_idx, [start_idx])
    else:
        is_exact = False

    optimal_dist = round(min_dist, 2)
    final_imp_dist = max(0.0, round(init_d - optimal_dist, 2))
    final_imp_pct = round((final_imp_dist / init_d) * 100, 1) if init_d > 0 else 0.0

    return orig_tour, best_tour, init_d, optimal_dist, final_imp_dist, final_imp_pct, iters, is_exact

# Regional Disaster Zone Waypoint Presets
DISASTER_ZONE_TARGETS = {
    "hazard_kuttanad": {
        "name": "Kuttanad Wetland & Delta Basin",
        "type": "flood",
        "base": "shelter_alappuzha",
        "distressNodes": [
            {"id": "kuttanad", "priority": "Critical", "survivors": 320, "desc": "Submerged delta settlements cut off by water surges"},
            {"id": "alappuzha_town", "priority": "High", "survivors": 180, "desc": "Beachfront and port canal breach waterlogging"},
            {"id": "changanassery", "priority": "High", "survivors": 150, "desc": "MC Road low-lying transit corridor flooding"},
            {"id": "thiruvalla", "priority": "Moderate", "survivors": 110, "desc": "Manimala river confluence overflow"},
            {"id": "kottayam_city", "priority": "High", "survivors": 240, "desc": "Meenachil river urban fringe flooding"},
            {"id": "cherthala", "priority": "Moderate", "survivors": 95, "desc": "Vembanad north coastal wetland breach"}
        ]
    },
    "hazard_wayanad": {
        "name": "Wayanad Meppadi & Churam Landslide Zone",
        "type": "landslide",
        "base": "shelter_wayanad",
        "distressNodes": [
            {"id": "kalpetta", "priority": "Critical", "survivors": 450, "desc": "Escarpment debris flow cut off along mountain ghat"},
            {"id": "thamarassery", "priority": "Critical", "survivors": 280, "desc": "Churam Pass base blockade stranded transit"},
            {"id": "sulthan_bathery", "priority": "Moderate", "survivors": 130, "desc": "Wildlife corridor access disrupted by mudslips"},
            {"id": "mananthavady", "priority": "High", "survivors": 210, "desc": "Kabani river catchment slope instability"}
        ]
    },
    "hazard_periyar": {
        "name": "Periyar River Floodplain & Dam Basin",
        "type": "flood",
        "base": "shelter_kakkanad",
        "distressNodes": [
            {"id": "aluva_town", "priority": "Critical", "survivors": 390, "desc": "Manappuram temple banks submerged by dam releases"},
            {"id": "kalamassery", "priority": "High", "survivors": 260, "desc": "Industrial lowlands near river overflow channel"},
            {"id": "angamaly", "priority": "High", "survivors": 190, "desc": "NH 544 northern airport expressway bottleneck"},
            {"id": "north_paravur", "priority": "Critical", "survivors": 310, "desc": "Varappuzha coastal backwater confluence breach"},
            {"id": "edappally", "priority": "Moderate", "survivors": 140, "desc": "Toll gate canal overflow and traffic paralysis"}
        ]
    },
    "hazard_pamba": {
        "name": "Pamba & Achankovil River Confluence Basin",
        "type": "flood",
        "base": "shelter_adoor",
        "distressNodes": [
            {"id": "adoor", "priority": "High", "survivors": 190, "desc": "Adoor town center southern Pamba tributary surge"},
            {"id": "thiruvalla", "priority": "Critical", "survivors": 320, "desc": "Chengannur-Thiruvalla river confluence inundation"},
            {"id": "kayamkulam", "priority": "Moderate", "survivors": 120, "desc": "NH 66 backwater junction road submersion"},
            {"id": "kollam_city", "priority": "Moderate", "survivors": 160, "desc": "Ashtamudi lake tidal surge buffer"}
        ]
    },
    "hazard_idukki": {
        "name": "Idukki & Munnar High-Range Landslide Corridor",
        "type": "landslide",
        "base": "shelter_munnar",
        "distressNodes": [
            {"id": "munnar", "priority": "Critical", "survivors": 260, "desc": "Tea plantation valley road washouts & rockfalls"},
            {"id": "adimali", "priority": "Critical", "survivors": 340, "desc": "Neriamangalam gorge road blockade"},
            {"id": "kothamangalam", "priority": "Moderate", "survivors": 150, "desc": "Western foothills emergency supply entry point"},
            {"id": "thodupuzha", "priority": "High", "survivors": 180, "desc": "Spillway discharge riverbank inundation"}
        ]
    },
    "hazard_sea_erosion": {
        "name": "Coastal Marine Surge & Sea Erosion Belt",
        "type": "surge",
        "base": "shelter_kakkanad",
        "distressNodes": [
            {"id": "fort_kochi", "priority": "Critical", "survivors": 310, "desc": "Heritage coastline seawall breach and storm swell"},
            {"id": "marine_drive", "priority": "High", "survivors": 210, "desc": "Vembanad estuary swell overflowing promenade"},
            {"id": "vyttila", "priority": "Moderate", "survivors": 160, "desc": "Mobility hub drainage canal backflow"}
        ]
    }
}

def get_region_candidate_nodes(hazard_zone_id: str, nodes: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Returns all available locations for a disaster region (default base + distress targets)."""
    preset = DISASTER_ZONE_TARGETS.get(hazard_zone_id, DISASTER_ZONE_TARGETS["hazard_kuttanad"])
    default_base = preset["base"]
    candidates = []

    if default_base in nodes:
        candidates.append({
            "id": default_base,
            "name": nodes[default_base]["name"],
            "isDefaultBase": True,
            "survivors": 0,
            "desc": "Designated Highland Emergency Sanctuary & HQ Command"
        })

    for item in preset["distressNodes"]:
        nid = item["id"]
        if nid in nodes and nid != default_base:
            candidates.append({
                "id": nid,
                "name": nodes[nid]["name"],
                "isDefaultBase": False,
                "survivors": item.get("survivors", 100),
                "desc": item.get("desc", "Distress relief outpost")
            })
    return candidates

def compute_disaster_region_tsp(
    nodes: Dict[str, Any],
    edges: List[Dict[str, Any]],
    hazard_zone_id: str = "hazard_kuttanad",
    base_node_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Computes the shortest possible Travelling Salesman Problem rescue vehicle tour
    visiting all distress locations in the chosen disaster region and returning to base.
    Guarantees the global minimum Hamiltonian cycle for N <= 10 via Branch & Bound.
    """
    preset = DISASTER_ZONE_TARGETS.get(hazard_zone_id, DISASTER_ZONE_TARGETS["hazard_kuttanad"])
    default_base = preset["base"]
    start_id = base_node_id or default_base
    if start_id not in nodes:
        start_id = default_base if default_base in nodes else list(nodes.keys())[0]

    # Gather all candidate nodes in this region: default base + distress nodes
    candidate_list = get_region_candidate_nodes(hazard_zone_id, nodes)
    all_candidate_ids = [c["id"] for c in candidate_list]
    if start_id not in all_candidate_ids and start_id in nodes:
        all_candidate_ids.insert(0, start_id)

    # Tour nodes: chosen start_id must be index 0, followed by all other candidate nodes
    tour_nodes = [start_id]
    for nid in all_candidate_ids:
        if nid != start_id and nid not in tour_nodes:
            tour_nodes.append(nid)

    target_items = preset["distressNodes"]
    distress_map = {item["id"]: item for item in target_items}

    N = len(tour_nodes)
    cost_matrix = [[0.0] * N for _ in range(N)]
    path_cache = {}

    # Calculate all-pairs shortest road distance between tour nodes via Dijkstra
    for i in range(N):
        for j in range(i + 1, N):
            u_id = tour_nodes[i]
            v_id = tour_nodes[j]
            dist_km, path_nodes, polyline = _dijkstra_shortest_path(nodes, edges, u_id, v_id)
            cost_matrix[i][j] = dist_km
            cost_matrix[j][i] = dist_km
            path_cache[(u_id, v_id)] = (dist_km, path_nodes, polyline)
            path_cache[(v_id, u_id)] = (dist_km, list(reversed(path_nodes)), list(reversed(polyline)))

    # Solve TSP with guaranteed shortest route (Branch & Bound for N <= 10)
    # Solve TSP
    orig_indices, tour_indices, initial_dist, optimal_dist, imp_dist, imp_pct, iterations, is_exact = solve_tsp_optimal(cost_matrix, start_idx=0)
    
    # Map tour indices back to node IDs
    ordered_node_ids = [tour_nodes[idx] for idx in tour_indices]
    orig_node_ids = [tour_nodes[idx] for idx in orig_indices]

    # Build detailed legs
    legs = []
    total_km = 0.0
    all_polyline = []
    
    for k in range(len(ordered_node_ids) - 1):
        u_id = ordered_node_ids[k]
        v_id = ordered_node_ids[k + 1]
        dist_km, path_nodes, polyline = path_cache.get((u_id, v_id), (cost_matrix[tour_indices[k]][tour_indices[k+1]], [u_id, v_id], []))
        total_km += dist_km

        legs.append({
            "legIndex": k + 1,
            "fromId": u_id,
            "fromName": nodes[u_id]["name"] if u_id in nodes else u_id,
            "toId": v_id,
            "toName": nodes[v_id]["name"] if v_id in nodes else v_id,
            "distanceKm": dist_km,
            "pathNodes": path_nodes,
            "polyline": polyline
        })
        if polyline:
            all_polyline.extend(polyline)

    # Estimate total mission duration: average speed 38 km/h during disaster + 12 min per rescue stop
    stop_count = max(0, N - 1)
    driving_minutes = (total_km / 38.0) * 60.0
    operation_minutes = stop_count * 12.0
    total_minutes = round(driving_minutes + operation_minutes)

    # Build rescue stops metadata
    rescue_stops = []
    total_survivors = 0
    running_dist = 0.0
    for order_idx, nid in enumerate(ordered_node_ids):
        node = nodes.get(nid, {})
        is_base = (nid == start_id and (order_idx == 0 or order_idx == len(ordered_node_ids) - 1))
        info = distress_map.get(nid, {})
        survivors = info.get("survivors", 0) if not is_base else 0
        total_survivors += survivors

        leg_dist = legs[order_idx - 1]["distanceKm"] if order_idx > 0 and order_idx - 1 < len(legs) else 0.0
        running_dist += leg_dist

        rescue_stops.append({
            "step": order_idx + 1,
            "nodeId": nid,
            "id": nid,
            "name": node.get("name", nid),
            "lat": node.get("lat", 0.0),
            "lng": node.get("lng", 0.0),
            "elevation": node.get("elevation", 10.0),
            "isBase": is_base,
            "priority": info.get("priority", "Base Command" if is_base else "Standard"),
            "survivors": survivors,
            "desc": info.get("desc", "Safe haven staging command" if is_base else "Distress outpost"),
            "legDistance": round(leg_dist, 1),
            "cumulativeDistance": round(running_dist, 1)
        })

    return {
        "hazardZoneId": hazard_zone_id,
        "hazardZoneName": preset["name"],
        "disasterType": preset["type"],
        "baseNodeId": start_id,
        "baseNodeName": nodes[start_id]["name"] if start_id in nodes else start_id,
        "startNodeId": start_id,
        "startNodeName": nodes[start_id]["name"] if start_id in nodes else start_id,
        "candidateNodes": candidate_list,
        "tourNodeIds": ordered_node_ids,
        "originalTour": orig_node_ids,
        "optimizedTour": ordered_node_ids,
        "originalDistance": initial_dist,
        "optimizedDistance": optimal_dist,
        "improvementDistance": imp_dist,
        "improvementPercent": imp_pct,
        "legs": legs,
        "totalDistanceKm": round(total_km, 1),
        "totalDurationMin": total_minutes,
        "estimatedTravelTime": total_minutes,
        "estimatedTimeMin": total_minutes,
        "totalStops": stop_count,
        "stopCount": stop_count,
        "stopsCount": stop_count,
        "totalSurvivorsRelieved": total_survivors,
        "stops": rescue_stops,
        "rescueStops": rescue_stops,
        "tour": rescue_stops,
        "fullPolyline": all_polyline,
        "matrixTable": {
            "nodeIds": tour_nodes,
            "nodeNames": [nodes[nid]["name"] if nid in nodes else nid for nid in tour_nodes],
            "costMatrix": cost_matrix
        },
        "optimization": {
            "algorithm": "Branch & Bound (Proven Shortest Tour)" if is_exact else "2-Opt Local Search",
            "isExactOptimal": is_exact,
            "originalDistanceKm": initial_dist,
            "initialDistanceKm": initial_dist,
            "optimalDistanceKm": optimal_dist,
            "improvementDistanceKm": imp_dist,
            "reductionPercent": imp_pct,
            "improvementPercent": imp_pct,
            "twoOptIterations": iterations
        },
        "improvementPercent": imp_pct,
        "nnDistanceKm": initial_dist
    }
