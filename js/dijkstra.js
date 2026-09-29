/**
 * Kerala SafeRoute - Dijkstra's Shortest & Safest Path Algorithm
 * 
 * Computes optimal evacuation routes based on combined travel distance and
 * simulated disaster risk penalties. Also provides step-by-step logs for educational analysis.
 */

class DijkstraRouter {
  /**
   * Calculate dynamic edge weight and simulated risk score
   * 
   * @param {Object} edge - Edge definition
   * @param {string} disasterType - 'flood', 'cyclone', or 'waterlogging'
   * @param {string} severity - 'low', 'moderate', or 'severe'
   * @param {Set<string>} closedEdgeIds - Set of IDs of closed roads
   * @returns {Object} { weight, riskScore, isClosed, distance }
   */
  static evaluateEdge(edge, disasterType = 'flood', severity = 'moderate', closedEdgeIds = new Set()) {
    const isClosed = closedEdgeIds.has(edge.id) || edge.is_closed === true;
    if (isClosed) {
      return {
        weight: Infinity,
        riskScore: 100,
        isClosed: true,
        distance: edge.distance_km
      };
    }

    // Severity Multipliers
    let severityMultiplier = 1.0;
    if (severity === 'moderate') severityMultiplier = 1.75;
    if (severity === 'severe') severityMultiplier = 3.0;

    // Disaster Type Affinity:
    // If disaster matches edge hazard proximity, risk increases
    let disasterAffinity = 1.0;
    if (disasterType === 'flood' && edge.hazard_proximity === 'hazard_periyar') {
      disasterAffinity = 2.4;
    } else if (disasterType === 'cyclone' && edge.hazard_proximity === 'hazard_vembanad') {
      disasterAffinity = 2.5;
    } else if (disasterType === 'waterlogging') {
      if (edge.hazard_proximity === 'hazard_edappally_canal') {
        disasterAffinity = 2.2;
      } else if (edge.elevation < 4.0) {
        disasterAffinity = 1.6;
      }
    }

    // Elevation Vulnerability Penalty: Lower ground = much higher flood risk
    const elevationPenalty = Math.max(0, (12.0 - edge.elevation) / 12.0); // 0 (high ground) to 1 (sea level)

    // Base flood susceptibility from road characteristics (0 to 1)
    const baseSusceptibility = edge.flood_susceptibility || 0.3;

    // Simulated Risk Score (Normalized Heuristic: 0 - 100)
    // Formula clearly explains heuristic components
    const rawRisk = (baseSusceptibility * 45 + elevationPenalty * 35 + (disasterAffinity > 1.0 ? 20 : 0)) * (severityMultiplier / 1.5);
    const riskScore = Math.min(99.0, Math.max(5.0, Math.round(rawRisk * 10) / 10));

    // Combined Cost = Physical Distance * (1 + Risk Penalty)
    // Risk penalty scales from 0 to 3.5x distance
    const riskPenaltyFactor = (riskScore / 100.0) * 2.5;
    const combinedWeight = edge.distance_km * (1.0 + riskPenaltyFactor);

    return {
      weight: combinedWeight,
      riskScore: riskScore,
      isClosed: false,
      distance: edge.distance_km
    };
  }

  /**
   * Run Dijkstra's algorithm from sourceNodeId to a target or all nodes
   * 
   * @param {Object} graphNodes - Map of nodes { [id]: node }
   * @param {Array} graphEdges - Array of edge objects
   * @param {string} sourceId - Starting node ID
   * @param {string|null} targetId - Optional destination node ID
   * @param {Object} options - { disasterType, severity, closedEdgeIds }
   * @returns {Object} Solution with routes, distances, risk scores, and step logs
   */
  static runDijkstra(graphNodes, graphEdges, sourceId, targetId = null, options = {}) {
    const {
      disasterType = 'flood',
      severity = 'moderate',
      closedEdgeIds = new Set()
    } = options;

    const steps = [];
    const distances = {};
    const distanceKm = {};
    const cumulativeRisk = {};
    const previous = {};
    const visited = new Set();
    const unvisited = new Set();

    // 1. Build Adjacency List
    const adj = {};
    Object.keys(graphNodes).forEach(nodeId => {
      adj[nodeId] = [];
      distances[nodeId] = Infinity;
      distanceKm[nodeId] = Infinity;
      cumulativeRisk[nodeId] = 0;
      previous[nodeId] = null;
      unvisited.add(nodeId);
    });

    graphEdges.forEach(edge => {
      const evaluation = this.evaluateEdge(edge, disasterType, severity, closedEdgeIds);
      if (!evaluation.isClosed && isFinite(evaluation.weight)) {
        if (adj[edge.u]) {
          adj[edge.u].push({ target: edge.v, edge, evaluation });
        }
        if (adj[edge.v]) {
          adj[edge.v].push({ target: edge.u, edge, evaluation });
        }
      }
    });

    if (!graphNodes[sourceId]) {
      return { error: `Source node '${sourceId}' not found in graph.` };
    }

    distances[sourceId] = 0;
    distanceKm[sourceId] = 0;
    cumulativeRisk[sourceId] = 0;

    steps.push({
      iteration: 0,
      currentNode: sourceId,
      action: `Initialized Dijkstra from ${graphNodes[sourceId].name || sourceId}. Distance set to 0.`,
      tentativeDistances: { ...distances },
      visitedNodes: Array.from(visited)
    });

    let iterationCount = 0;

    while (unvisited.size > 0) {
      iterationCount++;

      // Find unvisited node with smallest tentative distance
      let current = null;
      let minDistance = Infinity;

      for (const node of unvisited) {
        if (distances[node] < minDistance) {
          minDistance = distances[node];
          current = node;
        }
      }

      // If smallest distance is Infinity, remaining nodes are unreachable
      if (current === null || minDistance === Infinity) {
        steps.push({
          iteration: iterationCount,
          currentNode: null,
          action: "All remaining unvisited nodes are unreachable due to disconnected roads or closures.",
          tentativeDistances: { ...distances },
          visitedNodes: Array.from(visited)
        });
        break;
      }

      // If we reached the target node, we can terminate early
      if (targetId && current === targetId) {
        visited.add(current);
        unvisited.delete(current);
        steps.push({
          iteration: iterationCount,
          currentNode: current,
          action: `Destination ${graphNodes[current]?.name || current} reached with optimal cost ${minDistance.toFixed(2)}.`,
          tentativeDistances: { ...distances },
          visitedNodes: Array.from(visited)
        });
        break;
      }

      visited.add(current);
      unvisited.delete(current);

      // Relax neighbors
      const neighbors = adj[current] || [];
      const neighborUpdates = [];

      for (const neighborItem of neighbors) {
        const { target: neighbor, edge, evaluation } = neighborItem;
        if (!visited.has(neighbor)) {
          const tentativeCost = distances[current] + evaluation.weight;
          if (tentativeCost < distances[neighbor]) {
            const oldCost = distances[neighbor];
            distances[neighbor] = tentativeCost;
            distanceKm[neighbor] = distanceKm[current] + evaluation.distance;
            cumulativeRisk[neighbor] = cumulativeRisk[current] + evaluation.riskScore;
            previous[neighbor] = {
              from: current,
              edge: edge,
              evaluation: evaluation
            };

            neighborUpdates.push(
              `Relaxed ${neighbor}: cost reduced from ${isFinite(oldCost) ? oldCost.toFixed(2) : '∞'} to ${tentativeCost.toFixed(2)} (via ${edge.name})`
            );
          }
        }
      }

      steps.push({
        iteration: iterationCount,
        currentNode: current,
        nodeName: graphNodes[current]?.name || current,
        action: neighborUpdates.length > 0 
          ? `Evaluated ${neighbors.length} neighbors: ${neighborUpdates.join("; ")}`
          : `Evaluated neighbors of ${current}; no shorter paths discovered.`,
        tentativeDistances: { ...distances },
        visitedNodes: Array.from(visited)
      });
    }

    // Helper to reconstruct path to any destination
    const reconstructPath = (destinationId) => {
      if (!previous[destinationId] && destinationId !== sourceId) {
        return null; // Unreachable
      }

      const pathNodes = [];
      const pathEdges = [];
      let curr = destinationId;

      while (curr !== null) {
        pathNodes.unshift(curr);
        const prevInfo = previous[curr];
        if (prevInfo) {
          pathEdges.unshift(prevInfo.edge);
          curr = prevInfo.from;
        } else {
          curr = null;
        }
      }

      const totalKm = distanceKm[destinationId];
      const totalCost = distances[destinationId];
      const edgeCount = pathEdges.length;
      const avgRisk = edgeCount > 0 
        ? Math.round(cumulativeRisk[destinationId] / edgeCount) 
        : 0;

      return {
        reachable: true,
        sourceId,
        destinationId,
        destinationNode: graphNodes[destinationId],
        pathNodes,
        pathEdges,
        totalKm: Math.round(totalKm * 10) / 10,
        totalCost: Math.round(totalCost * 10) / 10,
        averageRiskScore: avgRisk,
        stepCount: pathNodes.length
      };
    };

    // If specific target was requested, return that route
    if (targetId) {
      const targetRoute = reconstructPath(targetId);
      return {
        sourceId,
        targetId,
        route: targetRoute,
        allDistances: distances,
        steps
      };
    }

    // Otherwise find routes to all shelters and pick the best one
    const shelterRoutes = [];
    Object.values(graphNodes)
      .filter(n => n.type === 'shelter')
      .forEach(shelter => {
        const route = reconstructPath(shelter.id);
        if (route) {
          shelterRoutes.push(route);
        }
      });

    // Sort shelters by combined cost (safest & fastest)
    shelterRoutes.sort((a, b) => a.totalCost - b.totalCost);

    return {
      sourceId,
      optimalShelterRoute: shelterRoutes.length > 0 ? shelterRoutes[0] : null,
      allShelterRoutes: shelterRoutes,
      allDistances: distances,
      steps
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DijkstraRouter };
}
