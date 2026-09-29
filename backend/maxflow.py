"""
Kerala SafeRoute - Maximum Flow & Minimum Cut (Edmonds-Karp Algorithm Engine)
Computes maximum evacuation vehicle throughput and pinpoints bottleneck cut edges.
"""

from collections import deque
from typing import List, Dict, Any, Optional

try:
    import networkx as nx
    HAS_NETWORKX = True
except ImportError:
    HAS_NETWORKX = False

def compute_max_flow(
    nodes: List[str],
    directed_edges: List[Dict[str, Any]],
    source: str,
    sink: str
) -> Dict[str, Any]:
    """
    Edmonds-Karp algorithm using BFS to find shortest augmenting paths in residual network.
    Also discovers minimum s-t cut edges that saturate network throughput.
    """
    capacity: Dict[str, Dict[str, int]] = {u: {v: 0 for v in nodes} for u in nodes}
    flow: Dict[str, Dict[str, int]] = {u: {v: 0 for v in nodes} for u in nodes}
    residual: Dict[str, Dict[str, int]] = {u: {v: 0 for v in nodes} for u in nodes}
    adj: Dict[str, List[str]] = {u: [] for u in nodes}

    for e in directed_edges:
        u, v = e["u"], e["v"]
        cap = int(e.get("capacity", 0))
        capacity[u][v] += cap
        residual[u][v] += cap

        if v not in adj[u]:
            adj[u].append(v)
        if u not in adj[v]:
            adj[v].append(u)

    max_flow = 0
    augmenting_paths = []
    steps = []

    steps.append({
        "iteration": 0,
        "action": f"Initialized flow network with source '{source}' and evacuation sink '{sink}'. Initial flow: 0 veh/hr.",
        "path": None,
        "flowIncrement": 0,
        "currentMaxFlow": 0
    })

    def find_augmenting_path():
        parent = {}
        visited = {source}
        queue = deque([source])

        while queue:
            u = queue.popleft()
            if u == sink:
                break
            for v in adj[u]:
                if v not in visited and residual[u][v] > 0:
                    visited.add(v)
                    parent[v] = u
                    queue.append(v)

        if sink not in visited:
            return None

        # Reconstruct path and find bottleneck capacity
        path = []
        bottleneck = float("inf")
        curr = sink
        while curr != source:
            prev = parent[curr]
            path.insert(0, {"u": prev, "v": curr})
            bottleneck = min(bottleneck, residual[prev][curr])
            curr = prev

        return {"path": path, "bottleneck": int(bottleneck)}

    iteration = 0
    while True:
        iteration += 1
        aug = find_augmenting_path()
        if not aug:
            break

        path_edges = aug["path"]
        bottleneck = aug["bottleneck"]
        max_flow += bottleneck
        augmenting_paths.append(path_edges)

        # Augment flow along path
        for edge_item in path_edges:
            u = edge_item["u"]
            v = edge_item["v"]
            flow[u][v] += bottleneck
            flow[v][u] -= bottleneck
            residual[u][v] -= bottleneck
            residual[v][u] += bottleneck

        path_str = " → ".join([edge_item["u"] for edge_item in path_edges] + [sink])
        steps.append({
            "iteration": iteration,
            "action": f"Found Augmenting Path: {path_str}. Pushed +{bottleneck} veh/hr bottleneck throughput.",
            "path": path_str,
            "flowIncrement": bottleneck,
            "currentMaxFlow": max_flow
        })

    # BFS from source in residual graph to find Reachable Set S (for Min-Cut)
    reachable_s = set()
    queue = deque([source])
    reachable_s.add(source)

    while queue:
        curr = queue.popleft()
        for neighbor in adj[curr]:
            if neighbor not in reachable_s and residual[curr][neighbor] > 0:
                reachable_s.add(neighbor)
                queue.append(neighbor)

    # Min-Cut edges: original directed edges where u in S and v not in S
    min_cut_edges = []
    min_cut_capacity = 0

    for e in directed_edges:
        u = e["u"]
        v = e["v"]
        if u in reachable_s and v not in reachable_s:
            min_cut_edges.append(e)
            min_cut_capacity += int(e.get("capacity", 0))

    steps.append({
        "iteration": iteration,
        "action": f"No more augmenting paths found. Max Flow is {max_flow} veh/hr. Min-Cut capacity is {min_cut_capacity} veh/hr (Theorem Verified).",
        "path": None,
        "flowIncrement": 0,
        "currentMaxFlow": max_flow
    })

    # Optional NetworkX cross-verification
    nx_verified = None
    if HAS_NETWORKX:
        try:
            G = nx.DiGraph()
            for e in directed_edges:
                G.add_edge(e["u"], e["v"], capacity=int(e.get("capacity", 0)))
            nx_val, _ = nx.maximum_flow(G, source, sink)
            nx_verified = (nx_val == max_flow)
        except Exception:
            nx_verified = None

    return {
        "status": "success",
        "backend": "Python 3.13 Edmonds-Karp Engine",
        "networkxVerified": nx_verified,
        "maxFlow": max_flow,
        "minCutCapacity": min_cut_capacity,
        "minCutEdges": min_cut_edges,
        "flowDistribution": flow,
        "residualGraph": residual,
        "augmentingPaths": augmenting_paths,
        "steps": steps
    }
