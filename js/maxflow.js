/**
 * Kerala SafeRoute - Maximum Flow & Minimum Cut (Edmonds-Karp Algorithm)
 * 
 * Computes maximum evacuation vehicle throughput from a threatened source
 * sector to a safe highland terminal, and pinpoints the bottleneck minimum cut.
 */

class EdmondsKarpMaxFlow {
  /**
   * Run Edmonds-Karp algorithm
   * 
   * @param {Array<string>} nodes - List of node IDs
   * @param {Array<Object>} directedEdges - List of edges { u, v, capacity, name }
   * @param {string} source - Source node ID (threatened zone)
   * @param {string} sink - Sink node ID (safe zone)
   * @returns {Object} { maxFlow, augmentingPaths, minCutEdges, residualGraph, steps }
   */
  static computeMaxFlow(nodes, directedEdges, source, sink) {
    const steps = [];
    const capacity = {};
    const flow = {};
    const residual = {};
    const adj = {};

    // 1. Initialize structures
    nodes.forEach(u => {
      capacity[u] = {};
      flow[u] = {};
      residual[u] = {};
      adj[u] = [];
      nodes.forEach(v => {
        capacity[u][v] = 0;
        flow[u][v] = 0;
        residual[u][v] = 0;
      });
    });

    // Populate capacities and graph adjacency (both forward and backward edges)
    directedEdges.forEach(e => {
      capacity[e.u][e.v] = (capacity[e.u][e.v] || 0) + e.capacity;
      residual[e.u][e.v] = (residual[e.u][e.v] || 0) + e.capacity;
      
      if (!adj[e.u].includes(e.v)) adj[e.u].push(e.v);
      if (!adj[e.v].includes(e.u)) adj[e.v].push(e.u); // Reverse edge in residual graph
    });

    let maxFlow = 0;
    const augmentingPaths = [];
    let iteration = 0;

    steps.push({
      iteration: 0,
      action: `Initialized network flow with source '${source}' and evacuation sink '${sink}'. Initial flow: 0 veh/hr.`,
      path: null,
      flowIncrement: 0,
      currentMaxFlow: 0
    });

    // BFS to find shortest augmenting path in terms of edge count
    const findAugmentingPath = () => {
      const parent = {};
      const visited = new Set([source]);
      const queue = [source];

      while (queue.length > 0) {
        const u = queue.shift();

        if (u === sink) break;

        for (const v of adj[u]) {
          // If unvisited and has positive residual capacity
          if (!visited.has(v) && residual[u][v] > 0) {
            visited.add(v);
            parent[v] = u;
            queue.push(v);
          }
        }
      }

      // Check if sink was reached
      if (!visited.has(sink)) return null;

      // Reconstruct path and find bottleneck capacity
      const path = [];
      let bottleneck = Infinity;
      let curr = sink;

      while (curr !== source) {
        const prev = parent[curr];
        path.unshift({ u: prev, v: curr });
        bottleneck = Math.min(bottleneck, residual[prev][curr]);
        curr = prev;
      }

      return { path, bottleneck };
    };

    // Run Edmonds-Karp iterations
    while (true) {
      iteration++;
      const result = findAugmentingPath();
      if (!result) {
        steps.push({
          iteration: iteration,
          action: "No further augmenting paths exist in the residual graph. Maximum flow achieved.",
          path: null,
          flowIncrement: 0,
          currentMaxFlow: maxFlow
        });
        break;
      }

      const { path, bottleneck } = result;
      maxFlow += bottleneck;

      // Update flows and residual graph
      path.forEach(({ u, v }) => {
        flow[u][v] += bottleneck;
        flow[v][u] -= bottleneck;
        residual[u][v] -= bottleneck;
        residual[v][u] += bottleneck;
      });

      const pathString = [path[0].u, ...path.map(p => p.v)].join(" → ");
      augmentingPaths.push({
        pathString,
        path,
        bottleneck,
        cumulativeFlow: maxFlow
      });

      steps.push({
        iteration: iteration,
        action: `Augmenting Path Found: [${pathString}] with bottleneck capacity ${bottleneck} veh/hr. Added to total flow.`,
        path: pathString,
        flowIncrement: bottleneck,
        currentMaxFlow: maxFlow
      });
    }

    // 2. Identify the Minimum Cut (Max-Flow Min-Cut Theorem)
    // Run BFS on residual graph to find all vertices reachable from source
    const reachableSet = new Set([source]);
    const queue = [source];

    while (queue.length > 0) {
      const u = queue.shift();
      for (const v of adj[u]) {
        if (!reachableSet.has(v) && residual[u][v] > 0) {
          reachableSet.add(v);
          queue.push(v);
        }
      }
    }

    // The min-cut consists of all original edges going from reachableSet to non-reachableSet
    const minCutEdges = [];
    let minCutCapacity = 0;

    directedEdges.forEach(e => {
      if (reachableSet.has(e.u) && !reachableSet.has(e.v)) {
        minCutEdges.push(e);
        minCutCapacity += e.capacity;
      }
    });

    return {
      maxFlow,
      minCutCapacity,
      augmentingPaths,
      minCutEdges,
      reachablePartition: Array.from(reachableSet),
      unreachablePartition: nodes.filter(n => !reachableSet.has(n)),
      flowDistribution: flow,
      residualCapacity: residual,
      steps
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EdmondsKarpMaxFlow };
}
