"""
Kerala SafeRoute - Minimum Spanning Tree (MST) Algorithm Engine
Implements Kruskal's (Union-Find) and Prim's (Min-Heap Priority Queue) algorithms
with educational step-by-step logs for emergency lifeline network planning.
"""

import heapq
from typing import List, Dict, Any, Optional

class DisjointSet:
    def __init__(self, elements: List[str]):
        self.parent = {el: el for el in elements}
        self.rank = {el: 0 for el in elements}

    def find(self, i: str) -> str:
        if self.parent[i] == i:
            return i
        self.parent[i] = self.find(self.parent[i])
        return self.parent[i]

    def union(self, i: str, j: str) -> bool:
        root_i = self.find(i)
        root_j = self.find(j)
        if root_i == root_j:
            return False
        if self.rank[root_i] < self.rank[root_j]:
            self.parent[root_i] = root_j
        elif self.rank[root_i] > self.rank[root_j]:
            self.parent[root_j] = root_i
        else:
            self.parent[root_j] = root_i
            self.rank[root_i] += 1
        return True

def run_kruskal(node_ids: List[str], edges: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Run Kruskal's algorithm with step logging.
    """
    steps = []
    mst_edges = []
    total_weight = 0.0

    # Sort edges by weight
    sorted_edges = sorted(edges, key=lambda e: e.get("weight", 0.0))
    dsu = DisjointSet(node_ids)

    steps.append({
        "iteration": 0,
        "action": f"Initialized Kruskal's Algorithm. Sorted {len(sorted_edges)} candidate edges by ascending weight.",
        "status": "info",
        "currentWeight": 0.0,
        "edgeInfo": None
    })

    edge_counter = 0
    for edge in sorted_edges:
        edge_counter += 1
        u, v = edge["u"], edge["v"]
        w = edge.get("weight", 0.0)
        root_u = dsu.find(u)
        root_v = dsu.find(v)

        if root_u != root_v:
            dsu.union(root_u, root_v)
            mst_edges.append(edge)
            total_weight += w

            steps.append({
                "iteration": edge_counter,
                "edgeId": edge.get("id", f"{u}-{v}"),
                "edge": edge,
                "action": f"ACCEPTED Edge ({u} ↔ {v}, weight: {w}). Nodes belong to separate components; no cycle formed.",
                "status": "accepted",
                "totalMSTWeight": round(total_weight, 1),
                "currentMSTCount": len(mst_edges)
            })

            if len(mst_edges) == len(node_ids) - 1:
                steps.append({
                    "iteration": edge_counter + 1,
                    "action": f"MST Complete! Formed spanning tree with {len(mst_edges)} edges connecting all {len(node_ids)} relief hubs.",
                    "status": "completed",
                    "totalMSTWeight": round(total_weight, 1)
                })
                break
        else:
            steps.append({
                "iteration": edge_counter,
                "edgeId": edge.get("id", f"{u}-{v}"),
                "edge": edge,
                "action": f"REJECTED Edge ({u} ↔ {v}, weight: {w}). Both nodes already in the same component; cycle avoided.",
                "status": "rejected",
                "totalMSTWeight": round(total_weight, 1),
                "currentMSTCount": len(mst_edges)
            })

    return {
        "status": "success",
        "backend": "Python 3.13 MST Engine (Kruskal)",
        "algorithm": "kruskal",
        "mstEdges": mst_edges,
        "totalWeight": round(total_weight, 1),
        "steps": steps
    }

def run_prim(node_ids: List[str], edges: List[Dict[str, Any]], start_node: Optional[str] = None) -> Dict[str, Any]:
    """
    Run Prim's algorithm with step logging.
    """
    if not node_ids:
        return {"error": "Empty node list"}

    start = start_node if (start_node and start_node in node_ids) else node_ids[0]
    steps = []
    mst_edges = []
    total_weight = 0.0

    in_tree = {start}
    # Adjacency list
    adj: Dict[str, List[Dict[str, Any]]] = {nid: [] for nid in node_ids}
    for e in edges:
        u, v = e["u"], e["v"]
        if u in adj and v in adj:
            adj[u].append(e)
            adj[v].append(e)

    # Priority queue: (weight, counter, edge, from_node, to_node)
    pq = []
    counter = 0
    for e in adj.get(start, []):
        neighbor = e["v"] if e["u"] == start else e["u"]
        counter += 1
        heapq.heappush(pq, (e.get("weight", 0.0), counter, e, start, neighbor))

    steps.append({
        "iteration": 0,
        "action": f"Initialized Prim's Algorithm from starting hub '{start}'. Added {len(pq)} incident edges to frontier.",
        "status": "info",
        "currentWeight": 0.0
    })

    iter_num = 0
    while pq and len(in_tree) < len(node_ids):
        w, _, edge, u, v = heapq.heappop(pq)
        iter_num += 1

        if v in in_tree:
            steps.append({
                "iteration": iter_num,
                "action": f"SKIPPED Edge ({u} ↔ {v}, weight: {w}) — Destination node '{v}' is already connected in the tree.",
                "status": "rejected",
                "totalMSTWeight": round(total_weight, 1)
            })
            continue

        in_tree.add(v)
        mst_edges.append(edge)
        total_weight += w

        steps.append({
            "iteration": iter_num,
            "action": f"ACCEPTED Edge ({u} ↔ {v}, weight: {w}). Added new hub '{v}' to spanning tree.",
            "status": "accepted",
            "totalMSTWeight": round(total_weight, 1),
            "currentMSTCount": len(mst_edges)
        })

        # Add newly available edges from v
        for next_edge in adj.get(v, []):
            next_node = next_edge["v"] if next_edge["u"] == v else next_edge["u"]
            if next_node not in in_tree:
                counter += 1
                heapq.heappush(pq, (next_edge.get("weight", 0.0), counter, next_edge, v, next_node))

    if len(in_tree) == len(node_ids):
        steps.append({
            "iteration": iter_num + 1,
            "action": f"Prim's Algorithm Complete! Connected all {len(node_ids)} hubs with {len(mst_edges)} minimal edges.",
            "status": "completed",
            "totalMSTWeight": round(total_weight, 1)
        })

    return {
        "status": "success",
        "backend": "Python 3.13 MST Engine (Prim)",
        "algorithm": "prim",
        "startNode": start,
        "mstEdges": mst_edges,
        "totalWeight": round(total_weight, 1),
        "steps": steps
    }
