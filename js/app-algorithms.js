/**
 * Kerala SafeRoute - Interactive Algorithm Calculations Workbench Controller
 * Dynamically computes and renders:
 * 1. Dijkstra's Shortest & Safest Path
 * 2. Minimum Spanning Tree (Kruskal's & Prim's)
 * 3. Maximum Flow / Minimum Cut (Edmonds-Karp)
 */

document.addEventListener("DOMContentLoaded", () => {
  // =========================================================================
  // 1. DIJKSTRA SAMPLE GRAPH DEFINITION & LOGIC
  // =========================================================================
  const dijkstraGraph = {
    nodes: {
      "A": { id: "A", name: "A (Waterfront Town)", x: 70, y: 180, elevation: 2.5 },
      "B": { id: "B", name: "B (Bridge Causeway)", x: 200, y: 70, elevation: 3.0 },
      "C": { id: "C", name: "C (Inland Highway)", x: 200, y: 290, elevation: 12.0 },
      "D": { id: "D", name: "D (Lowland Overpass)", x: 340, y: 70, elevation: 3.5 },
      "E": { id: "E", name: "E (Suburban Ridge)", x: 340, y: 290, elevation: 15.0 },
      "T": { id: "T", name: "T (Highland Shelter)", x: 470, y: 180, elevation: 22.0 }
    },
    edges: [
      { id: "e_ab", u: "A", v: "B", distance: 5.0, riskWeight: 14.0, name: "A-B (Coastal Floodway)" },
      { id: "e_ac", u: "A", v: "C", distance: 7.0, riskWeight: 8.5,  name: "A-C (High-Ground Arterial)" },
      { id: "e_bc", u: "B", v: "C", distance: 4.0, riskWeight: 7.0,  name: "B-C (Connecting Link)" },
      { id: "e_bd", u: "B", v: "D", distance: 6.0, riskWeight: 15.0, name: "B-D (Submerged Canal)" },
      { id: "e_ce", u: "C", v: "E", distance: 6.5, riskWeight: 7.5,  name: "C-E (Elevated Bypass)" },
      { id: "e_de", u: "D", v: "E", distance: 4.5, riskWeight: 8.0,  name: "D-E (Cross Junction)" },
      { id: "e_dt", u: "D", v: "T", distance: 6.0, riskWeight: 12.0, name: "D-T (Northern Approach)" },
      { id: "e_et", u: "E", v: "T", distance: 5.5, riskWeight: 6.0,  name: "E-T (Highland Ascent)" }
    ]
  };

  // Dijkstra DOM elements
  const dijkstraStartSelect = document.getElementById("dijkstra-start-node");
  const dijkstraEndSelect = document.getElementById("dijkstra-end-node");
  const dijkstraCostMode = document.getElementById("dijkstra-cost-mode");
  const dijkstraRunBtn = document.getElementById("btn-run-dijkstra");
  const dijkstraSvg = document.getElementById("dijkstra-svg");
  const dijkstraResultRoute = document.getElementById("dijkstra-result-route");
  const dijkstraResultDist = document.getElementById("dijkstra-result-dist");
  const dijkstraResultCost = document.getElementById("dijkstra-result-cost");
  const dijkstraExplanation = document.getElementById("dijkstra-explanation");
  const dijkstraStepsContainer = document.getElementById("dijkstra-steps-container");

  function renderDijkstraSvg(highlightPathEdges = [], visitedNodes = []) {
    dijkstraSvg.innerHTML = "";
    const isRiskMode = dijkstraCostMode.value === "combined";

    // 1. Draw Edges
    dijkstraGraph.edges.forEach(edge => {
      const uNode = dijkstraGraph.nodes[edge.u];
      const vNode = dijkstraGraph.nodes[edge.v];
      const isPathEdge = highlightPathEdges.some(pe => 
        (pe.u === edge.u && pe.v === edge.v) || (pe.u === edge.v && pe.v === edge.u)
      );

      const weightDisplay = isRiskMode 
        ? `${edge.riskWeight} (Risk)` 
        : `${edge.distance} km`;

      // Line
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", uNode.x);
      line.setAttribute("y1", uNode.y);
      line.setAttribute("x2", vNode.x);
      line.setAttribute("y2", vNode.y);
      line.setAttribute("class", `svg-edge ${isPathEdge ? 'highlight-path' : ''}`);
      dijkstraSvg.appendChild(line);

      // Label background & text
      const midX = (uNode.x + vNode.x) / 2;
      const midY = (uNode.y + vNode.y) / 2;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", midX - 32);
      rect.setAttribute("y", midY - 9);
      rect.setAttribute("width", 64);
      rect.setAttribute("height", 18);
      rect.setAttribute("class", "svg-edge-label-bg");
      dijkstraSvg.appendChild(rect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY);
      text.setAttribute("class", `svg-edge-label-text ${isPathEdge ? 'active' : ''}`);
      text.textContent = weightDisplay;
      dijkstraSvg.appendChild(text);
    });

    // 2. Draw Nodes
    Object.values(dijkstraGraph.nodes).forEach(node => {
      const isSource = node.id === dijkstraStartSelect.value;
      const isTarget = node.id === dijkstraEndSelect.value;
      const isVisited = visitedNodes.includes(node.id);

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", node.x);
      circle.setAttribute("y", node.y);
      circle.setAttribute("r", 20);

      let circleClass = "svg-node-circle";
      if (isSource) circleClass += " source";
      else if (isTarget) circleClass += " target";
      else if (isVisited) circleClass += " visited";
      circle.setAttribute("class", circleClass);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", node.x);
      text.setAttribute("y", node.y);
      text.setAttribute("class", "svg-node-label");
      text.textContent = node.id;

      const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subText.setAttribute("x", node.x);
      subText.setAttribute("y", node.y + 32);
      subText.setAttribute("class", "svg-node-sublabel");
      subText.textContent = `+${node.elevation}m`;

      group.appendChild(circle);
      group.appendChild(text);
      group.appendChild(subText);
      dijkstraSvg.appendChild(group);
    });
  }

  function runDijkstraCalculation() {
    const source = dijkstraStartSelect.value;
    const target = dijkstraEndSelect.value;
    const isRiskMode = dijkstraCostMode.value === "combined";

    // Prepare graph format for DijkstraRouter
    const formattedNodes = {};
    Object.values(dijkstraGraph.nodes).forEach(n => {
      formattedNodes[n.id] = { ...n, type: n.id === target ? 'shelter' : 'intersection' };
    });

    const formattedEdges = dijkstraGraph.edges.map(e => ({
      ...e,
      distance_km: e.distance,
      elevation: (dijkstraGraph.nodes[e.u].elevation + dijkstraGraph.nodes[e.v].elevation) / 2
    }));

    // Perform Dijkstra with custom weights
    const distances = {};
    const previous = {};
    const unvisited = new Set(Object.keys(formattedNodes));
    const visited = new Set();
    const steps = [];

    Object.keys(formattedNodes).forEach(id => {
      distances[id] = Infinity;
      previous[id] = null;
    });
    distances[source] = 0;

    steps.push({
      step: 0,
      title: `Initialized source node '${source}'`,
      desc: `Set tentative cost of ${source} to 0; all other nodes set to ∞.`,
      distances: { ...distances }
    });

    let iter = 0;
    while (unvisited.size > 0) {
      iter++;
      let current = null;
      let minCost = Infinity;

      for (const node of unvisited) {
        if (distances[node] < minCost) {
          minCost = distances[node];
          current = node;
        }
      }

      if (current === null || minCost === Infinity) break;
      if (current === target) {
        visited.add(current);
        unvisited.delete(current);
        steps.push({
          step: iter,
          title: `Reached destination node '${target}'`,
          desc: `Optimal path confirmed with total ${isRiskMode ? 'combined cost' : 'metric distance'} of ${minCost.toFixed(1)}.`,
          distances: { ...distances }
        });
        break;
      }

      visited.add(current);
      unvisited.delete(current);

      // Relax incident edges
      const incidentEdges = formattedEdges.filter(e => e.u === current || e.v === current);
      const updates = [];

      incidentEdges.forEach(edge => {
        const neighbor = edge.u === current ? edge.v : edge.u;
        if (!visited.has(neighbor)) {
          const edgeCost = isRiskMode ? edge.riskWeight : edge.distance;
          const tentativeCost = distances[current] + edgeCost;
          if (tentativeCost < distances[neighbor]) {
            const oldCost = distances[neighbor];
            distances[neighbor] = tentativeCost;
            previous[neighbor] = { from: current, edge };
            updates.push(`Updated ${neighbor}: ${isFinite(oldCost) ? oldCost.toFixed(1) : '∞'} → ${tentativeCost.toFixed(1)} via ${edge.name}`);
          }
        }
      });

      steps.push({
        step: iter,
        title: `Visited Node '${current}' (Cost: ${minCost.toFixed(1)})`,
        desc: updates.length > 0 ? updates.join("; ") : "No neighbor costs reduced.",
        distances: { ...distances }
      });
    }

    // Reconstruct path
    const path = [];
    const pathEdges = [];
    let curr = target;
    while (curr !== null) {
      path.unshift(curr);
      const prev = previous[curr];
      if (prev) {
        pathEdges.unshift(prev.edge);
        curr = prev.from;
      } else {
        curr = null;
      }
    }

    let totalPhysicalDist = 0;
    let totalRiskCost = 0;
    pathEdges.forEach(e => {
      totalPhysicalDist += e.distance;
      totalRiskCost += e.riskWeight;
    });

    // Update Result Summary UI
    dijkstraResultRoute.textContent = path.join(" → ");
    dijkstraResultDist.textContent = `${totalPhysicalDist.toFixed(1)} km`;
    dijkstraResultCost.textContent = `${(isRiskMode ? totalRiskCost : totalPhysicalDist).toFixed(1)} units`;

    if (isRiskMode && totalPhysicalDist > 17) {
      dijkstraExplanation.textContent = `Notice how Dijkstra steered around the shorter northern route (via B and D) because low elevation (2-3m) carried high flood penalties. The safest route climbs to the inland ridge (C & E) at +15m elevation, minimizing disaster exposure!`;
    } else {
      dijkstraExplanation.textContent = `Route follows strictly the shortest metric distance between ${source} and ${target}.`;
    }

    // Render Steps
    dijkstraStepsContainer.innerHTML = "";
    steps.forEach(s => {
      const stepDiv = document.createElement("div");
      stepDiv.className = "step-row highlight";

      const distStr = Object.entries(s.distances)
        .map(([k, v]) => `${k}:${isFinite(v) ? v.toFixed(1) : '∞'}`)
        .join(" | ");

      stepDiv.innerHTML = `
        <div class="step-header-text">
          <span>Step ${s.step}: ${s.title}</span>
        </div>
        <div class="step-desc-text">${s.desc}</div>
        <div style="font-family: var(--font-mono); font-size: 10px; color:#94a3b8; margin-top:2px;">Tentative Costs: [ ${distStr} ]</div>
      `;
      dijkstraStepsContainer.appendChild(stepDiv);
    });

    // Render SVG with path highlighted
    renderDijkstraSvg(pathEdges, Array.from(visited));
  }

  // =========================================================================
  // 2. MINIMUM SPANNING TREE (MST) SAMPLE GRAPH & LOGIC
  // =========================================================================
  const mstGraph = {
    nodes: ["HQ", "HOSP", "CAMP", "RADIO", "DEPOT", "POWER"],
    nodePositions: {
      "HQ":    { x: 90,  y: 180, label: "Emergency HQ" },
      "HOSP":  { x: 210, y: 70,  label: "Base Hospital" },
      "CAMP":  { x: 210, y: 290, label: "Relief Camp" },
      "RADIO": { x: 350, y: 70,  label: "Radio Tower" },
      "DEPOT": { x: 350, y: 290, label: "Supply Depot" },
      "POWER": { x: 470, y: 180, label: "Power Grid" }
    },
    edges: [
      { id: "e1", u: "HQ",    v: "HOSP",  weight: 4.2, name: "HQ - Hospital" },
      { id: "e2", u: "HQ",    v: "CAMP",  weight: 3.5, name: "HQ - Camp" },
      { id: "e3", u: "HOSP",  v: "CAMP",  weight: 5.1, name: "Hospital - Camp" },
      { id: "e4", u: "HOSP",  v: "RADIO", weight: 3.8, name: "Hospital - Radio" },
      { id: "e5", u: "CAMP",  v: "DEPOT", weight: 4.6, name: "Camp - Depot" },
      { id: "e6", u: "RADIO", v: "DEPOT", weight: 3.2, name: "Radio - Depot" },
      { id: "e7", u: "RADIO", v: "POWER", weight: 5.5, name: "Radio - Power" },
      { id: "e8", u: "DEPOT", v: "POWER", weight: 2.8, name: "Depot - Power" },
      { id: "e9", u: "HQ",    v: "RADIO", weight: 7.0, name: "HQ - Radio Direct" }
    ]
  };

  const mstAlgoSelect = document.getElementById("mst-algo-select");
  const mstStartSelect = document.getElementById("mst-start-node");
  const mstRunBtn = document.getElementById("btn-run-mst");
  const mstSvg = document.getElementById("mst-svg");
  const mstResultWeight = document.getElementById("mst-result-weight");
  const mstResultCount = document.getElementById("mst-result-count");
  const mstResultEdges = document.getElementById("mst-result-edges");
  const mstStepsContainer = document.getElementById("mst-steps-container");

  function renderMstSvg(selectedEdges = []) {
    mstSvg.innerHTML = "";

    // 1. Draw Edges
    mstGraph.edges.forEach(edge => {
      const uPos = mstGraph.nodePositions[edge.u];
      const vPos = mstGraph.nodePositions[edge.v];
      const isMst = selectedEdges.some(e => 
        (e.u === edge.u && e.v === edge.v) || (e.u === edge.v && e.v === edge.u)
      );

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", uPos.x);
      line.setAttribute("y1", uPos.y);
      line.setAttribute("x2", vPos.x);
      line.setAttribute("y2", vPos.y);
      line.setAttribute("class", `svg-edge ${isMst ? 'highlight-mst' : ''}`);
      mstSvg.appendChild(line);

      // Label
      const midX = (uPos.x + vPos.x) / 2;
      const midY = (uPos.y + vPos.y) / 2;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", midX - 22);
      rect.setAttribute("y", midY - 9);
      rect.setAttribute("width", 44);
      rect.setAttribute("height", 18);
      rect.setAttribute("class", "svg-edge-label-bg");
      mstSvg.appendChild(rect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY);
      text.setAttribute("class", `svg-edge-label-text ${isMst ? 'active' : ''}`);
      text.textContent = `${edge.weight} km`;
      mstSvg.appendChild(text);
    });

    // 2. Draw Nodes
    mstGraph.nodes.forEach(nodeId => {
      const pos = mstGraph.nodePositions[nodeId];
      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pos.x);
      circle.setAttribute("y", pos.y);
      circle.setAttribute("r", 22);
      circle.setAttribute("class", "svg-node-circle mst-tree");

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", pos.x);
      text.setAttribute("y", pos.y);
      text.setAttribute("class", "svg-node-label");
      text.textContent = nodeId;

      const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subText.setAttribute("x", pos.x);
      subText.setAttribute("y", pos.y + 32);
      subText.setAttribute("class", "svg-node-sublabel");
      subText.textContent = pos.label;

      group.appendChild(circle);
      group.appendChild(text);
      group.appendChild(subText);
      mstSvg.appendChild(group);
    });
  }

  function updateBackendBadge(isPython) {
    const badge = document.getElementById("algo-backend-badge");
    if (badge) {
      if (isPython) {
        badge.className = "backend-chip python";
        badge.textContent = " Python 3.13 NetworkX Backend";
      } else {
        badge.className = "backend-chip fallback";
        badge.textContent = " Browser Client Engine";
      }
    }
  }

  async function runMstCalculation() {
    const algorithm = mstAlgoSelect.value;
    const start = mstStartSelect.value;
    let result = null;

    try {
      const resp = await fetch("/api/mst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          algorithm: algorithm,
          startNode: start,
          nodes: mstGraph.nodes,
          edges: mstGraph.edges
        })
      });
      if (resp.ok) {
        result = await resp.json();
        updateBackendBadge(true);
      }
    } catch (err) {
      updateBackendBadge(false);
    }

    if (!result) {
      if (algorithm === "kruskal") {
        result = MSTCalculator.runKruskal(mstGraph.nodes, mstGraph.edges);
      } else {
        result = MSTCalculator.runPrim(mstGraph.nodes, mstGraph.edges, start);
      }
    }

    // Update Result Highlights
    mstResultWeight.textContent = `${result.totalWeight} km`;
    mstResultCount.textContent = `${result.mstEdges.length} edges (connects all 6 hubs)`;
    mstResultEdges.textContent = result.mstEdges.map(e => `(${e.u} ↔ ${e.v})`).join(", ");

    // Populate Steps Log
    mstStepsContainer.innerHTML = "";
    result.steps.forEach(s => {
      const stepDiv = document.createElement("div");
      let statusClass = "step-row";
      if (s.status === "accepted") statusClass += " accepted";
      else if (s.status === "rejected") statusClass += " rejected";
      else if (s.status === "completed") statusClass += " highlight";

      stepDiv.className = statusClass;
      stepDiv.innerHTML = `
        <div class="step-header-text">
          <span>Iteration ${s.iteration}</span>
          <span class="step-badge">${s.status?.toUpperCase() || 'INFO'}</span>
        </div>
        <div class="step-desc-text">${s.action}</div>
        ${s.totalMSTWeight ? `<div style="font-family: var(--font-mono); font-size: 10px; color:#34d399; margin-top:2px;">Cumulative Tree Weight: ${s.totalMSTWeight} km</div>` : ''}
      `;
      mstStepsContainer.appendChild(stepDiv);
    });

    renderMstSvg(result.mstEdges);
  }

  // =========================================================================
  // 3. MAXIMUM FLOW / MINIMUM CUT SAMPLE GRAPH & LOGIC (EDMONDS-KARP)
  // =========================================================================
  const flowGraph = {
    nodes: ["S", "A", "B", "C", "D", "T"],
    nodePositions: {
      "S": { x: 70,  y: 180, label: "Threatened Sector S" },
      "A": { x: 200, y: 90,  label: "North Arterial" },
      "B": { x: 200, y: 270, label: "South Arterial" },
      "C": { x: 350, y: 90,  label: "Expressway North" },
      "D": { x: 350, y: 270, label: "Expressway South" },
      "T": { x: 480, y: 180, label: "Safe Highland T" }
    },
    edges: [
      { id: "e_sa", u: "S", v: "A", capacity: 1200, name: "S → A (Coastal Exit North)" },
      { id: "e_sb", u: "S", v: "B", capacity: 1500, name: "S → B (Coastal Exit South)" },
      { id: "e_ab", u: "A", v: "B", capacity: 400,  name: "A → B (Cross Bypass)" },
      { id: "e_ac", u: "A", v: "C", capacity: 900,  name: "A → C (Canal Bridge Link)" },
      { id: "e_bd", u: "B", v: "D", capacity: 1400, name: "B → D (Southern Ring Road)" },
      { id: "e_cd", u: "C", v: "D", capacity: 300,  name: "C → D (Interchange Ramp)" },
      { id: "e_ct", u: "C", v: "T", capacity: 1100, name: "C → T (Highland Inbound North)" },
      { id: "e_dt", u: "D", v: "T", capacity: 1600, name: "D → T (Highland Inbound South)" }
    ]
  };

  const flowRunBtn = document.getElementById("btn-run-maxflow");
  const flowSvg = document.getElementById("flow-svg");
  const flowResultMax = document.getElementById("flow-result-max");
  const flowResultCut = document.getElementById("flow-result-cut");
  const flowResultBottleneck = document.getElementById("flow-result-bottleneck");
  const flowInterpretation = document.getElementById("flow-interpretation");
  const flowStepsContainer = document.getElementById("flow-steps-container");

  function renderFlowSvg(flowDistribution = {}, minCutEdges = []) {
    flowSvg.innerHTML = "";

    // Define Arrow Marker in SVG Defs
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `
      <marker id="arrow" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b"/>
      </marker>
      <marker id="arrow-active" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8"/>
      </marker>
      <marker id="arrow-cut" viewBox="0 0 10 10" refX="28" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e"/>
      </marker>
    `;
    flowSvg.appendChild(defs);

    // 1. Draw Directed Edges
    flowGraph.edges.forEach(edge => {
      const uPos = flowGraph.nodePositions[edge.u];
      const vPos = flowGraph.nodePositions[edge.v];
      const edgeFlow = (flowDistribution[edge.u] && flowDistribution[edge.u][edge.v]) || 0;
      const isCutEdge = minCutEdges.some(e => e.u === edge.u && e.v === edge.v);
      const isSaturated = edgeFlow === edge.capacity;

      let edgeClass = "svg-edge";
      let markerId = "arrow";

      if (isCutEdge) {
        edgeClass += " highlight-bottleneck";
        markerId = "arrow-cut";
      } else if (edgeFlow > 0) {
        edgeClass += " highlight-path";
        markerId = "arrow-active";
      }

      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", uPos.x);
      line.setAttribute("y1", uPos.y);
      line.setAttribute("x2", vPos.x);
      line.setAttribute("y2", vPos.y);
      line.setAttribute("class", edgeClass);
      line.setAttribute("marker-end", `url(#${markerId})`);
      flowSvg.appendChild(line);

      // Label background & text: Flow / Capacity
      const midX = (uPos.x + vPos.x) / 2;
      const midY = (uPos.y + vPos.y) / 2;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("x", midX - 34);
      rect.setAttribute("y", midY - 9);
      rect.setAttribute("width", 68);
      rect.setAttribute("height", 18);
      rect.setAttribute("class", "svg-edge-label-bg");
      if (isCutEdge) rect.setAttribute("stroke", "#f43f5e");
      flowSvg.appendChild(rect);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", midX);
      text.setAttribute("y", midY);
      text.setAttribute("class", `svg-edge-label-text ${isCutEdge ? 'active' : ''}`);
      if (isCutEdge) text.style.fill = "#fb7185";
      text.textContent = `${edgeFlow}/${edge.capacity}`;
      flowSvg.appendChild(text);
    });

    // 2. Draw Nodes
    flowGraph.nodes.forEach(nodeId => {
      const pos = flowGraph.nodePositions[nodeId];
      const isSource = nodeId === "S";
      const isSink = nodeId === "T";

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", pos.x);
      circle.setAttribute("y", pos.y);
      circle.setAttribute("r", 22);

      let circleClass = "svg-node-circle";
      if (isSource) circleClass += " source";
      if (isSink) circleClass += " target";
      circle.setAttribute("class", circleClass);

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", pos.x);
      text.setAttribute("y", pos.y);
      text.setAttribute("class", "svg-node-label");
      text.textContent = nodeId;

      const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      subText.setAttribute("x", pos.x);
      subText.setAttribute("y", pos.y + 32);
      subText.setAttribute("class", "svg-node-sublabel");
      subText.textContent = pos.label;

      group.appendChild(circle);
      group.appendChild(text);
      group.appendChild(subText);
      flowSvg.appendChild(group);
    });
  }

  async function runFlowCalculation() {
    let result = null;

    try {
      const resp = await fetch("/api/maxflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "S",
          sink: "T",
          nodes: flowGraph.nodes,
          edges: flowGraph.edges
        })
      });
      if (resp.ok) {
        result = await resp.json();
        updateBackendBadge(true);
      }
    } catch (err) {
      updateBackendBadge(false);
    }

    if (!result) {
      result = EdmondsKarpMaxFlow.computeMaxFlow(
        flowGraph.nodes,
        flowGraph.edges,
        "S",
        "T"
      );
    }

    // Update Result Highlights
    flowResultMax.textContent = `${result.maxFlow.toLocaleString()} veh/hr`;
    flowResultCut.textContent = `${result.minCutCapacity.toLocaleString()} veh/hr (Exact theorem match)`;

    const cutList = result.minCutEdges.map(e => `[${e.u} → ${e.v} (${e.capacity})]`).join(" + ");
    flowResultBottleneck.textContent = cutList;

    flowInterpretation.innerHTML = `
      <strong>Operational Evacuation Takeaway:</strong><br>
      The network has a hard maximum throughput of <strong>${result.maxFlow.toLocaleString()} vehicles/hour</strong>.
      The minimum cut edges (${cutList}) are 100% saturated.
      Widening other roads or increasing speed on non-cut corridors will provide <strong>0% evacuation speed improvement</strong>.
      Traffic police must prioritize creating contra-flow lanes or clearing blockages specifically on these cut bottleneck edges.
    `;

    // Populate Steps Log
    flowStepsContainer.innerHTML = "";
    result.steps.forEach(s => {
      const stepDiv = document.createElement("div");
      stepDiv.className = `step-row ${s.flowIncrement > 0 ? 'highlight' : ''}`;

      stepDiv.innerHTML = `
        <div class="step-header-text">
          <span>Iteration ${s.iteration}: ${s.path ? `Augmenting Path: ${s.path}` : 'Search Complete'}</span>
          <span class="step-badge">${s.flowIncrement > 0 ? `+${s.flowIncrement} veh/hr` : 'MAX REACHED'}</span>
        </div>
        <div class="step-desc-text">${s.action}</div>
        <div style="font-family: var(--font-mono); font-size: 10px; color:#38bdf8; margin-top:2px;">Cumulative Evacuation Flow: ${s.currentMaxFlow.toLocaleString()} veh/hr</div>
      `;
      flowStepsContainer.appendChild(stepDiv);
    });

    renderFlowSvg(result.flowDistribution, result.minCutEdges);
  }

  // =========================================================================
  // Tab Switchers & Event Handlers
  // =========================================================================
  const tabButtons = document.querySelectorAll(".algo-tab-btn");
  const algoCards = document.querySelectorAll(".algo-card");

  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      algoCards.forEach(c => c.style.display = "none");

      btn.classList.add("active");
      const targetCard = document.getElementById(btn.dataset.target);
      if (targetCard) targetCard.style.display = "flex";
    });
  });

  // Attach button triggers
  dijkstraRunBtn.addEventListener("click", runDijkstraCalculation);
  dijkstraCostMode.addEventListener("change", runDijkstraCalculation);
  dijkstraStartSelect.addEventListener("change", runDijkstraCalculation);
  dijkstraEndSelect.addEventListener("change", runDijkstraCalculation);

  mstRunBtn.addEventListener("click", runMstCalculation);
  mstAlgoSelect.addEventListener("change", (e) => {
    mstStartSelect.disabled = e.target.value === "kruskal";
    runMstCalculation();
  });

  flowRunBtn.addEventListener("click", runFlowCalculation);

  // Initial runs to populate all 3 views cleanly
  renderDijkstraSvg();
  runDijkstraCalculation();

  renderMstSvg();
  runMstCalculation();

  renderFlowSvg();
  runFlowCalculation();

  // Probe Python backend health
  fetch("/api/health")
    .then(r => r.json())
    .then(data => {
      if (data.status === "online") updateBackendBadge(true);
    })
    .catch(() => updateBackendBadge(false));
});
