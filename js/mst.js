/**
 * Kerala SafeRoute - Minimum Spanning Tree (MST) Algorithms
 * 
 * Implements both Kruskal's and Prim's algorithms with step-by-step logging.
 * Disaster Application: Establishes a minimum-cost emergency communication
 * lifeline or road clearance network connecting all critical shelters and hubs.
 */

class DisjointSet {
  constructor(elements) {
    this.parent = {};
    this.rank = {};
    elements.forEach(el => {
      this.parent[el] = el;
      this.rank[el] = 0;
    });
  }

  find(i) {
    if (this.parent[i] === i) {
      return i;
    }
    this.parent[i] = this.find(this.parent[i]); // Path compression
    return this.parent[i];
  }

  union(i, j) {
    const rootI = this.find(i);
    const rootJ = this.find(j);

    if (rootI === rootJ) return false;

    // Union by rank
    if (this.rank[rootI] < this.rank[rootJ]) {
      this.parent[rootI] = rootJ;
    } else if (this.rank[rootI] > this.rank[rootJ]) {
      this.parent[rootJ] = rootI;
    } else {
      this.parent[rootJ] = rootI;
      this.rank[rootI]++;
    }
    return true;
  }
}

class MSTCalculator {
  /**
   * Kruskal's Algorithm
   * 
   * @param {Array<string>} nodeIds - List of node IDs
   * @param {Array<Object>} edges - List of edge objects { u, v, weight, name }
   * @returns {Object} MST edges, total weight, steps log
   */
  static runKruskal(nodeIds, edges) {
    const steps = [];
    const mstEdges = [];
    let totalWeight = 0;

    // 1. Sort all edges by ascending weight
    const sortedEdges = [...edges].sort((a, b) => a.weight - b.weight);
    const dsu = new DisjointSet(nodeIds);

    steps.push({
      iteration: 0,
      action: `Initialized Kruskal's Algorithm. Sorted ${sortedEdges.length} available edges by weight.`,
      accepted: true,
      currentWeight: 0,
      edgeInfo: null
    });

    let edgeCounter = 0;
    for (const edge of sortedEdges) {
      edgeCounter++;
      const rootU = dsu.find(edge.u);
      const rootV = dsu.find(edge.v);

      if (rootU !== rootV) {
        // Safe to add, no cycle
        dsu.union(rootU, rootV);
        mstEdges.push(edge);
        totalWeight += edge.weight;

        steps.push({
          iteration: edgeCounter,
          edgeId: edge.id || `${edge.u}-${edge.v}`,
          edge: edge,
          action: `ACCEPTED Edge (${edge.u} ↔ ${edge.v}, weight: ${edge.weight}). Nodes belong to separate components; no cycle formed.`,
          status: 'accepted',
          totalMSTWeight: Math.round(totalWeight * 10) / 10,
          currentMSTCount: mstEdges.length
        });

        // MST complete when we have V - 1 edges
        if (mstEdges.length === nodeIds.length - 1) {
          steps.push({
            iteration: edgeCounter + 1,
            action: `MST Complete! Formed connected tree with ${mstEdges.length} edges spanning all ${nodeIds.length} nodes.`,
            status: 'completed',
            totalMSTWeight: Math.round(totalWeight * 10) / 10
          });
          break;
        }
      } else {
        // Cycle detected
        steps.push({
          iteration: edgeCounter,
          edgeId: edge.id || `${edge.u}-${edge.v}`,
          edge: edge,
          action: `REJECTED Edge (${edge.u} ↔ ${edge.v}, weight: ${edge.weight}). Both nodes already connected; adding would create a redundant cycle.`,
          status: 'rejected',
          totalMSTWeight: Math.round(totalWeight * 10) / 10,
          currentMSTCount: mstEdges.length
        });
      }
    }

    const isConnected = mstEdges.length === nodeIds.length - 1;

    return {
      algorithm: "Kruskal's Algorithm",
      mstEdges,
      totalWeight: Math.round(totalWeight * 10) / 10,
      isConnected,
      steps
    };
  }

  /**
   * Prim's Algorithm
   * 
   * @param {Array<string>} nodeIds - List of node IDs
   * @param {Array<Object>} edges - List of edge objects { u, v, weight, name }
   * @param {string} startNode - Starting node ID
   * @returns {Object} MST edges, total weight, steps log
   */
  static runPrim(nodeIds, edges, startNode = null) {
    if (!startNode || !nodeIds.includes(startNode)) {
      startNode = nodeIds[0];
    }

    const steps = [];
    const mstEdges = [];
    let totalWeight = 0;

    const inMST = new Set([startNode]);

    // Build adjacency list
    const adj = {};
    nodeIds.forEach(id => adj[id] = []);
    edges.forEach(edge => {
      adj[edge.u].push({ target: edge.v, edge });
      adj[edge.v].push({ target: edge.u, edge });
    });

    steps.push({
      iteration: 0,
      action: `Initialized Prim's Algorithm starting from hub '${startNode}'. Tree initialized with 1 node.`,
      status: 'accepted',
      currentWeight: 0,
      mstNodes: Array.from(inMST)
    });

    let stepNum = 0;
    while (inMST.size < nodeIds.length) {
      stepNum++;
      let minEdge = null;
      let minWeight = Infinity;
      let nextNode = null;

      // Find the lowest weight edge crossing from inMST to outside
      for (const u of inMST) {
        for (const item of adj[u]) {
          const v = item.target;
          if (!inMST.has(v) && item.edge.weight < minWeight) {
            minWeight = item.edge.weight;
            minEdge = item.edge;
            nextNode = v;
          }
        }
      }

      if (!minEdge) {
        // Disconnected graph
        steps.push({
          iteration: stepNum,
          action: "No remaining crossing edges found. Graph is disconnected.",
          status: 'rejected'
        });
        break;
      }

      inMST.add(nextNode);
      mstEdges.push(minEdge);
      totalWeight += minEdge.weight;

      steps.push({
        iteration: stepNum,
        edgeId: minEdge.id || `${minEdge.u}-${minEdge.v}`,
        edge: minEdge,
        action: `SELECTED Crossing Edge (${minEdge.u} ↔ ${minEdge.v}, weight: ${minEdge.weight}). Added node '${nextNode}' to the growing spanning tree.`,
        status: 'accepted',
        totalMSTWeight: Math.round(totalWeight * 10) / 10,
        mstNodes: Array.from(inMST)
      });
    }

    return {
      algorithm: "Prim's Algorithm",
      mstEdges,
      totalWeight: Math.round(totalWeight * 10) / 10,
      isConnected: inMST.size === nodeIds.length,
      steps
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { MSTCalculator, DisjointSet };
}
