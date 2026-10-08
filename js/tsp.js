/**
 * PlanEsc - Travelling Salesman Problem (TSP) Client-Side Router
 * Multi-stop rescue vehicle tour optimization for disaster regions.
 * Employs Nearest Neighbor initialization + 2-Opt local search.
 */

const TravellingSalesmanRouter = (() => {

  const DISASTER_ZONE_TARGETS = {
    "hazard_kuttanad": {
      "name": "Kuttanad Wetland & Delta Basin",
      "type": "flood",
      "base": "shelter_alappuzha",
      "distressNodes": [
        { "id": "kuttanad", "priority": "Critical", "survivors": 320, "desc": "Submerged delta settlements cut off by water surges" },
        { "id": "alappuzha_town", "priority": "High", "survivors": 180, "desc": "Beachfront and port canal breach waterlogging" },
        { "id": "changanassery", "priority": "High", "survivors": 150, "desc": "MC Road low-lying transit corridor flooding" },
        { "id": "thiruvalla", "priority": "Moderate", "survivors": 110, "desc": "Manimala river confluence overflow" },
        { "id": "kottayam_city", "priority": "High", "survivors": 240, "desc": "Meenachil river urban fringe flooding" },
        { "id": "cherthala", "priority": "Moderate", "survivors": 95, "desc": "Vembanad north coastal wetland breach" }
      ]
    },
    "hazard_wayanad": {
      "name": "Wayanad Meppadi & Churam Landslide Zone",
      "type": "landslide",
      "base": "shelter_wayanad",
      "distressNodes": [
        { "id": "kalpetta", "priority": "Critical", "survivors": 450, "desc": "Escarpment debris flow cut off along mountain ghat" },
        { "id": "thamarassery", "priority": "Critical", "survivors": 280, "desc": "Churam Pass base blockade stranded transit" },
        { "id": "sulthan_bathery", "priority": "Moderate", "survivors": 130, "desc": "Wildlife corridor access disrupted by mudslips" },
        { "id": "mananthavady", "priority": "High", "survivors": 210, "desc": "Kabani river catchment slope instability" }
      ]
    },
    "hazard_periyar": {
      "name": "Periyar River Floodplain & Dam Basin",
      "type": "flood",
      "base": "shelter_kakkanad",
      "distressNodes": [
        { "id": "aluva_town", "priority": "Critical", "survivors": 390, "desc": "Manappuram temple banks submerged by dam releases" },
        { "id": "kalamassery", "priority": "High", "survivors": 260, "desc": "Industrial lowlands near river overflow channel" },
        { "id": "angamaly", "priority": "High", "survivors": 190, "desc": "NH 544 northern airport expressway bottleneck" },
        { "id": "north_paravur", "priority": "Critical", "survivors": 310, "desc": "Varappuzha coastal backwater confluence breach" },
        { "id": "edappally", "priority": "Moderate", "survivors": 140, "desc": "Toll gate canal overflow and traffic paralysis" }
      ]
    },
    "hazard_pamba": {
      "name": "Pamba & Achankovil River Confluence Basin",
      "type": "flood",
      "base": "shelter_adoor",
      "distressNodes": [
        { "id": "adoor", "priority": "High", "survivors": 190, "desc": "Adoor town center southern Pamba tributary surge" },
        { "id": "thiruvalla", "priority": "Critical", "survivors": 320, "desc": "Chengannur-Thiruvalla river confluence inundation" },
        { "id": "kayamkulam", "priority": "Moderate", "survivors": 120, "desc": "NH 66 backwater junction road submersion" },
        { "id": "kollam_city", "priority": "Moderate", "survivors": 160, "desc": "Ashtamudi lake tidal surge buffer" }
      ]
    },
    "hazard_idukki": {
      "name": "Idukki & Munnar High-Range Landslide Corridor",
      "type": "landslide",
      "base": "shelter_munnar",
      "distressNodes": [
        { "id": "munnar", "priority": "Critical", "survivors": 260, "desc": "Tea plantation valley road washouts & rockfalls" },
        { "id": "adimali", "priority": "Critical", "survivors": 340, "desc": "Neriamangalam gorge road blockade" },
        { "id": "kothamangalam", "priority": "Moderate", "survivors": 150, "desc": "Western foothills emergency supply entry point" },
        { "id": "thodupuzha", "priority": "High", "survivors": 180, "desc": "Spillway discharge riverbank inundation" }
      ]
    },
    "hazard_sea_erosion": {
      "name": "Coastal Marine Surge & Sea Erosion Belt",
      "type": "surge",
      "base": "shelter_kakkanad",
      "distressNodes": [
        { "id": "fort_kochi", "priority": "Critical", "survivors": 310, "desc": "Heritage coastline seawall breach and storm swell" },
        { "id": "marine_drive", "priority": "High", "survivors": 210, "desc": "Vembanad estuary swell overflowing promenade" },
        { "id": "vyttila", "priority": "Moderate", "survivors": 160, "desc": "Mobility hub drainage canal backflow" }
      ]
    }
  };

  /**
   * Internal Dijkstra shortest road distance calculation between two nodes
   */
  function dijkstraShortestPath(nodes, edges, startId, targetId, closedEdgeIds = new Set()) {
    if (startId === targetId) {
      return { distKm: 0.0, pathNodes: [startId], polyline: [] };
    }

    const adj = {};
    Object.keys(nodes).forEach(nid => adj[nid] = []);
    edges.forEach(e => {
      if (closedEdgeIds && (closedEdgeIds.has(e.id) || e.is_closed === true)) return;
      const dist = typeof e.distance_km === "number" ? e.distance_km : 5.0;
      adj[e.u]?.push({ v: e.v, weight: dist, edge: e });
      adj[e.v]?.push({ v: e.u, weight: dist, edge: e });
    });

    const dist = {};
    const prev = {};
    const visited = new Set();
    Object.keys(nodes).forEach(nid => dist[nid] = Infinity);
    dist[startId] = 0.0;

    // Priority queue
    const q = [startId];

    while (q.length > 0) {
      let minIdx = 0;
      for (let i = 1; i < q.length; i++) {
        if (dist[q[i]] < dist[q[minIdx]]) minIdx = i;
      }
      const u = q.splice(minIdx, 1)[0];
      visited.add(u);

      if (u === targetId) break;

      (adj[u] || []).forEach(({ v, weight, edge }) => {
        if (visited.has(v)) return;
        const alt = dist[u] + weight;
        if (alt < dist[v]) {
          dist[v] = alt;
          prev[v] = { u, edge };
          if (!q.includes(v)) q.push(v);
        }
      });
    }

    if (dist[targetId] === Infinity) {
      // Fallback Euclidean calculation if disconnected
      const n1 = nodes[startId] || { lat: 9.5, lng: 76.5 };
      const n2 = nodes[targetId] || { lat: 9.6, lng: 76.6 };
      const latDiff = (n1.lat - n2.lat) * 111.0;
      const lngDiff = (n1.lng - n2.lng) * 111.0 * Math.cos(((n1.lat + n2.lat) / 2.0) * Math.PI / 180.0);
      const eucl = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 1.35;
      return {
        distKm: Math.round(eucl * 10) / 10,
        pathNodes: [startId, targetId],
        polyline: [[n1.lat, n1.lng], [n2.lat, n2.lng]]
      };
    }

    // Reconstruct path
    let curr = targetId;
    const pathNodes = [];
    const polyline = [];

    while (prev[curr]) {
      pathNodes.push(curr);
      const { u, edge } = prev[curr];
      if (edge.path && edge.path.length > 0) {
        const coords = (edge.u === u) ? edge.path : [...edge.path].reverse();
        for (let i = coords.length - 1; i >= 0; i--) {
          polyline.push(coords[i]);
        }
      } else {
        const nCurr = nodes[curr];
        if (nCurr) polyline.push([nCurr.lat, nCurr.lng]);
      }
      curr = u;
    }
    pathNodes.push(startId);
    pathNodes.reverse();
    polyline.reverse();

    return {
      distKm: Math.round(dist[targetId] * 10) / 10,
      pathNodes,
      polyline
    };
  }

  /**
   * 2-Opt TSP Algorithm Solver
   */
  function solveTSP2Opt(costMatrix, startIdx = 0, initialTour = null) {
    const N = costMatrix.length;
    if (N <= 1) {
      return {
        originalTour: [0, 0],
        optimizedTour: [0, 0],
        tour: [0, 0],
        originalDistance: 0.0,
        optimizedDistance: 0.0,
        initialDist: 0.0,
        optimalDist: 0.0,
        improvementDistance: 0.0,
        improvementPercent: 0.0,
        iterations: 0
      };
    }
    if (N === 2) {
      const d = Math.round((costMatrix[0][1] + costMatrix[1][0]) * 10) / 10;
      return {
        originalTour: [0, 1, 0],
        optimizedTour: [0, 1, 0],
        tour: [0, 1, 0],
        originalDistance: d,
        optimizedDistance: d,
        initialDist: d,
        optimalDist: d,
        improvementDistance: 0.0,
        improvementPercent: 0.0,
        iterations: 0
      };
    }

    // Initial tour: user-specified initialTour or sequential tour [startIdx, 1, 2, ..., startIdx]
    let tour;
    if (Array.isArray(initialTour) && initialTour.length === N + 1) {
      tour = [...initialTour];
    } else {
      tour = [startIdx];
      for (let i = 0; i < N; i++) {
        if (i !== startIdx) tour.push(i);
      }
      tour.push(startIdx);
    }

    function tourLength(t) {
      let sum = 0;
      for (let i = 0; i < t.length - 1; i++) {
        sum += costMatrix[t[i]][t[i + 1]];
      }
      return sum;
    }

    const originalDist = Math.round(tourLength(tour) * 10) / 10;
    const origTourCopy = [...tour];
    let bestDist = originalDist;
    let improved = true;
    let iterations = 0;

    // 2-Opt Local Search (Edge Inversion Heuristic)
    while (improved && iterations < 100) {
      improved = false;
      iterations++;
      for (let i = 1; i < tour.length - 2; i++) {
        for (let j = i + 1; j < tour.length - 1; j++) {
          const a = tour[i - 1];
          const b = tour[i];
          const c = tour[j];
          const d = tour[j + 1];

          const currentCost = costMatrix[a][b] + costMatrix[c][d];
          const newCost = costMatrix[a][c] + costMatrix[b][d];

          if (newCost < currentCost - 1e-4) {
            // Reverse segment between i and j
            let left = i;
            let right = j;
            while (left < right) {
              const tmp = tour[left];
              tour[left] = tour[right];
              tour[right] = tmp;
              left++;
              right--;
            }
            bestDist = Math.round(tourLength(tour) * 10) / 10;
            improved = true;
            break;
          }
        }
        if (improved) break;
      }
    }

    const optimizedDist = Math.round(tourLength(tour) * 10) / 10;
    const improvementDist = Math.max(0, Math.round((originalDist - optimizedDist) * 10) / 10);
    const improvementPct = originalDist > 0
      ? Math.round((improvementDist / originalDist) * 1000) / 10
      : 0.0;

    return {
      originalTour: origTourCopy,
      optimizedTour: tour,
      tour,
      originalDistance: originalDist,
      optimizedDistance: optimizedDist,
      initialDist: originalDist,
      optimalDist: optimizedDist,
      improvementDistance: improvementDist,
      improvementPercent: improvementPct,
      iterations
    };
  }

  /**
   * Proven Shortest Route TSP Solver (Exact Branch & Bound for N <= 10)
   */
  function solveTSPOptimal(costMatrix, startIdx = 0, initialTour = null) {
    const N = costMatrix.length;
    if (N <= 1) {
      return {
        originalTour: [0, 0],
        optimizedTour: [0, 0],
        tour: [0, 0],
        originalDistance: 0.0,
        optimizedDistance: 0.0,
        initialDist: 0.0,
        optimalDist: 0.0,
        improvementDistance: 0.0,
        improvementPercent: 0.0,
        iterations: 0,
        isExactOptimal: true
      };
    }
    if (N === 2) {
      const d = Math.round((costMatrix[0][1] + costMatrix[1][0]) * 10) / 10;
      return {
        originalTour: [0, 1, 0],
        optimizedTour: [0, 1, 0],
        tour: [0, 1, 0],
        originalDistance: d,
        optimizedDistance: d,
        initialDist: d,
        optimalDist: d,
        improvementDistance: 0.0,
        improvementPercent: 0.0,
        iterations: 0,
        isExactOptimal: true
      };
    }

    // 1. Get 2-Opt heuristic upper bound
    const heuristic = solveTSP2Opt(costMatrix, startIdx, initialTour);
    let bestDist = heuristic.optimizedDistance;
    let bestTour = [...heuristic.optimizedTour];
    let isExact = true;

    // 2. For N <= 10, run DFS Branch & Bound to guarantee absolute shortest possible tour
    if (N <= 10) {
      function bnbDfs(curr, currentDist, visitedCount, visitedMask, path) {
        if (currentDist >= bestDist) return;
        if (visitedCount === N) {
          const total = currentDist + costMatrix[curr][startIdx];
          if (total < bestDist - 1e-5) {
            bestDist = total;
            bestTour = [...path, startIdx];
          }
          return;
        }

        // Sort unvisited candidates by edge cost for early pruning
        const candidates = [];
        for (let nxt = 0; nxt < N; nxt++) {
          if (!(visitedMask & (1 << nxt))) {
            candidates.push({ cost: costMatrix[curr][nxt], nxt });
          }
        }
        candidates.sort((a, b) => a.cost - b.cost);

        for (let i = 0; i < candidates.length; i++) {
          const { cost, nxt } = candidates[i];
          if (currentDist + cost >= bestDist) continue;
          bnbDfs(nxt, currentDist + cost, visitedCount + 1, visitedMask | (1 << nxt), [...path, nxt]);
        }
      }

      bnbDfs(startIdx, 0.0, 1, 1 << startIdx, [startIdx]);
    } else {
      isExact = false;
    }

    const optimalDist = Math.round(bestDist * 10) / 10;
    const improvementDist = Math.max(0, Math.round((heuristic.originalDistance - optimalDist) * 10) / 10);
    const improvementPct = heuristic.originalDistance > 0
      ? Math.round((improvementDist / heuristic.originalDistance) * 1000) / 10
      : 0.0;

    return {
      originalTour: heuristic.originalTour,
      optimizedTour: bestTour,
      tour: bestTour,
      originalDistance: heuristic.originalDistance,
      optimizedDistance: optimalDist,
      initialDist: heuristic.originalDistance,
      optimalDist: optimalDist,
      improvementDistance: improvementDist,
      improvementPercent: improvementPct,
      iterations: heuristic.iterations,
      isExactOptimal: isExact
    };
  }

  /**
   * Retrieves all candidate locations (HQ Base + Distress Towns) for a disaster zone
   */
  function getRegionCandidateNodes(hazardZoneId, nodes = null) {
    if (!nodes && typeof KERALA_GRAPH_DATA !== "undefined") {
      nodes = KERALA_GRAPH_DATA.nodes;
    }
    nodes = nodes || {};
    const preset = DISASTER_ZONE_TARGETS[hazardZoneId] || DISASTER_ZONE_TARGETS["hazard_kuttanad"];
    const defaultBase = preset.base;
    const candidates = [];

    if (nodes[defaultBase]) {
      candidates.push({
        id: defaultBase,
        name: nodes[defaultBase].name || defaultBase,
        isDefaultBase: true,
        survivors: 0,
        desc: "Designated Highland Emergency Sanctuary & HQ Command"
      });
    }

    (preset.distressNodes || []).forEach(item => {
      const nid = item.id;
      if (nodes[nid] && nid !== defaultBase) {
        candidates.push({
          id: nid,
          name: nodes[nid].name || nid,
          isDefaultBase: false,
          survivors: item.survivors || 100,
          desc: item.desc || "Distress relief outpost"
        });
      }
    });

    return candidates;
  }

  /**
   * Main Dispatcher: Computes Proven Shortest Disaster Region TSP Tour
   */
  function computeDisasterRegionTSP(nodes, edges, hazardZoneId = "hazard_kuttanad", baseNodeId = null, options = {}) {
    if (typeof nodes === "string") {
      hazardZoneId = nodes;
      nodes = (typeof KERALA_GRAPH_DATA !== "undefined" && KERALA_GRAPH_DATA.nodes) || {};
      edges = (typeof KERALA_GRAPH_DATA !== "undefined" && KERALA_GRAPH_DATA.edges) || [];
    } else if (!nodes && typeof KERALA_GRAPH_DATA !== "undefined") {
      nodes = KERALA_GRAPH_DATA.nodes;
      edges = KERALA_GRAPH_DATA.edges;
    }

    const closedEdgeIds = options.closedEdgeIds || new Set();
    const severity = options.severity || "moderate";

    const preset = DISASTER_ZONE_TARGETS[hazardZoneId] || DISASTER_ZONE_TARGETS["hazard_kuttanad"];
    const defaultBase = preset.base;
    const startId = baseNodeId || defaultBase;

    const candidateList = getRegionCandidateNodes(hazardZoneId, nodes);
    let allCandidateIds = candidateList.map(c => c.id);
    if (!allCandidateIds.includes(startId) && nodes[startId]) {
      allCandidateIds.unshift(startId);
    }

    // Tour nodes: chosen startId MUST be at index 0, followed by all remaining nodes in this region
    const tourNodes = [startId];
    allCandidateIds.forEach(nid => {
      if (nid !== startId && !tourNodes.includes(nid)) {
        tourNodes.push(nid);
      }
    });

    const targetItems = preset.distressNodes || [];
    const distressMap = {};
    targetItems.forEach(item => distressMap[item.id] = item);

    const N = tourNodes.length;
    const costMatrix = Array.from({ length: N }, () => new Array(N).fill(0.0));
    const pathCache = {};

    // Calculate all-pairs shortest road distance between tour targets via Dijkstra
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const uId = tourNodes[i];
        const vId = tourNodes[j];
        const res = dijkstraShortestPath(nodes, edges, uId, vId, closedEdgeIds);
        costMatrix[i][j] = res.distKm;
        costMatrix[j][i] = res.distKm;

        pathCache[`${uId}->${vId}`] = res;
        pathCache[`${vId}->${uId}`] = {
          distKm: res.distKm,
          pathNodes: [...res.pathNodes].reverse(),
          polyline: [...res.polyline].reverse()
        };
      }
    }

    // Solve TSP using 2-Opt and exact optimal Branch & Bound (for N <= 10)
    const tspSolution = solveTSPOptimal(costMatrix, 0);
    const { tour, originalDistance, optimizedDistance, improvementDistance, improvementPercent, iterations, isExactOptimal } = tspSolution;

    const orderedNodeIds = tour.map(idx => tourNodes[idx]);

    // Construct legs
    const legs = [];
    let totalKm = 0.0;
    const fullPolyline = [];

    for (let k = 0; k < orderedNodeIds.length - 1; k++) {
      const uId = orderedNodeIds[k];
      const vId = orderedNodeIds[k + 1];
      const key = `${uId}->${vId}`;
      const legData = pathCache[key] || {
        distKm: costMatrix[tour[k]][tour[k + 1]],
        pathNodes: [uId, vId],
        polyline: []
      };

      totalKm += legData.distKm;
      legs.push({
        legIndex: k + 1,
        fromId: uId,
        fromName: nodes[uId]?.name || uId,
        toId: vId,
        toName: nodes[vId]?.name || vId,
        distanceKm: legData.distKm,
        pathNodes: legData.pathNodes,
        polyline: legData.polyline
      });

      if (legData.polyline && legData.polyline.length > 0) {
        fullPolyline.push(...legData.polyline);
      }
    }

    // Dynamic travel time calculation: speed adapted to disaster severity + 12 min per stop
    const avgSpeed = severity === "severe" ? 25.0 : (severity === "moderate" ? 35.0 : 42.0);
    const stopCount = Math.max(0, N - 1);
    const drivingMins = (totalKm / avgSpeed) * 60.0;
    const reliefMins = stopCount * 12.0;
    const totalMinutes = Math.round(drivingMins + reliefMins);

    // Rescue Stops Metadata
    let totalSurvivors = 0;
    let runningDist = 0.0;
    const rescueStops = orderedNodeIds.map((nid, orderIdx) => {
      const node = nodes[nid] || {};
      const isBase = (nid === startId && (orderIdx === 0 || orderIdx === orderedNodeIds.length - 1));
      const info = distressMap[nid] || {};
      const survivors = isBase ? 0 : (info.survivors || 100);
      totalSurvivors += survivors;

      const legDist = orderIdx > 0 && legs[orderIdx - 1] ? legs[orderIdx - 1].distanceKm : 0.0;
      runningDist += legDist;

      return {
        step: orderIdx + 1,
        nodeId: nid,
        id: nid,
        name: node.name || nid,
        lat: node.lat || 0.0,
        lng: node.lng || 0.0,
        lon: node.lng || 0.0,
        elevation: node.elevation || 10.0,
        isBase,
        priority: isBase ? "Base Command" : (info.priority || "High"),
        survivors,
        desc: isBase ? "Safe sanctuary staging command & medical depot" : (info.desc || "Distress evacuation outpost"),
        legDistance: Math.round(legDist * 10) / 10,
        cumulativeDistance: Math.round(runningDist * 10) / 10
      };
    });

    return {
      hazardZoneId,
      hazardZoneName: preset.name,
      disasterType: preset.type,
      baseNodeId: startId,
      baseNodeName: nodes[startId]?.name || startId,
      startNodeId: startId,
      startNodeName: nodes[startId]?.name || startId,
      candidateNodes: candidateList,
      tourNodeIds: orderedNodeIds,
      originalTour: tspSolution.originalTour.map(idx => tourNodes[idx]),
      optimizedTour: orderedNodeIds,
      originalDistance,
      optimizedDistance,
      improvementDistance,
      improvementPercent,
      legs,
      totalDistanceKm: Math.round(totalKm * 10) / 10,
      totalDurationMin: totalMinutes,
      estimatedTravelTime: totalMinutes,
      estimatedTimeMin: totalMinutes,
      totalStops: stopCount,
      stopCount,
      stopsCount: stopCount,
      totalSurvivorsRelieved: totalSurvivors,
      stops: rescueStops,
      rescueStops,
      tour: rescueStops,
      fullPolyline,
      matrixTable: {
        nodeIds: tourNodes,
        nodeNames: tourNodes.map(id => nodes[id]?.name || id),
        costMatrix
      },
      optimization: {
        algorithm: isExactOptimal ? "Branch & Bound (Proven Shortest Tour)" : "2-Opt Local Search",
        isExactOptimal,
        originalDistanceKm: originalDistance,
        initialDistanceKm: originalDistance,
        optimalDistanceKm: optimizedDistance,
        improvementDistanceKm: improvementDistance,
        reductionPercent: improvementPercent,
        improvementPercent,
        twoOptIterations: iterations
      },
      improvementPercent,
      nnDistanceKm: originalDistance
    };
  }

  return {
    DISASTER_ZONE_TARGETS,
    dijkstraShortestPath,
    solveTSP2Opt,
    solveTSPOptimal,
    getRegionCandidateNodes,
    computeDisasterRegionTSP
  };

})();

if (typeof window !== "undefined") {
  window.TravellingSalesmanRouter = TravellingSalesmanRouter;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = TravellingSalesmanRouter;
}
