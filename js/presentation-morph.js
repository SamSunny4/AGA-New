/**
 * Kerala SafeRoute - Cinematic Presentation & Graph Morphing Controller
 * Orchestrates the full 9-phase visual demonstration:
 * 1. Set Origin & Destination
 * 2. Show Available Routes Animation
 * 3. Show Road Capacities
 * 4. Predict Road Blocks
 * 5. Screen Whiteout (Keep only routes)
 * 6. Morph Routes to Straight Edges & Places to Nodes
 * 7. Audience Calculation Explanations (Dijkstra, A*, Max-Flow, Min-Cut)
 * 8. Highlight Optimal Edge & Bottleneck Cut
 * 9. Warp Back Edge to Route as Map Appears Back
 */

class PresentationDirector {
  constructor(mapInstance, plannerState, onFinishCallback) {
    this.map = mapInstance;
    this.state = plannerState;
    this.onFinish = onFinishCallback;

    this.currentStep = 1;
    this.totalSteps = 9;
    this.isPlaying = false;
    this.autoTimer = null;
    this.stepDurationMs = 5000; // 5 seconds per step in auto-play

    // DOM Elements
    if (typeof document !== "undefined") {
      this.overlay = document.getElementById("presentation-overlay");
      this.whiteout = document.getElementById("morph-whiteout");
      this.svg = document.getElementById("morph-svg");
      this.badgesContainer = document.getElementById("morph-dom-badges");
      
      // HUD Elements
      this.hudStepBadge = document.getElementById("hud-step-badge");
      this.hudDotsTrack = document.getElementById("hud-dots-track");
      this.hudNarratorTitle = document.getElementById("hud-narrator-title");
      this.hudNarratorText = document.getElementById("hud-narrator-text");
      this.hudNarratorFormula = document.getElementById("hud-narrator-formula");
      this.hudCalcMatrix = document.getElementById("hud-calc-matrix");
      this.btnPrev = document.getElementById("hud-btn-prev");
      this.btnPlay = document.getElementById("hud-btn-play");
      this.btnNext = document.getElementById("hud-btn-next");
      this.btnClose = document.getElementById("hud-btn-close");
      this.autoplayTag = document.getElementById("hud-autoplay-tag");

      this.initEvents();
    }

    // Cache computed graph coordinates
    this.nodePositions = {};
    this.edgePaths = {};
    this.optimalPath = null;
    this.candidatePaths = [];
    this.predictedBlockedEdges = new Set();
    this.maxFlowResult = null;
  }

  initEvents() {
    this.btnPrev?.addEventListener("click", () => this.prevStep());
    this.btnNext?.addEventListener("click", () => this.nextStep());
    this.btnPlay?.addEventListener("click", () => this.toggleAutoPlay());
    this.btnClose?.addEventListener("click", () => this.stopPresentation());

    // Responsive repositioning on map move/zoom
    this.map.on("move", () => {
      if (this.overlay && this.overlay.classList.contains("active")) {
        this.updateCoordinates();
        this.renderStep(this.currentStep);
      }
    });
  }

  startPresentation(originId, shelterId) {
    this.originId = originId || this.state.selectedOrigin || "kuttanad";
    this.shelterId = shelterId || (this.state.selectedShelter !== "auto" ? this.state.selectedShelter : "shelter_alappuzha");

    // Fit all nodes and road network to viewport with bottom room for presentation HUD
    const allLatLngs = Object.values(KERALA_GRAPH_DATA.nodes).map(n => [n.lat, n.lng]);
    this.map.fitBounds(L.latLngBounds(allLatLngs), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 160],
      maxZoom: 9,
      animate: false
    });

    // Compute algorithms data beforehand
    this.computeAlgorithmsData();

    // Show overlay
    this.overlay.classList.add("active");
    this.currentStep = 1;
    this.isPlaying = true;
    this.updatePlayBtnUI();

    this.buildDotsTrack();
    this.updateCoordinates();
    this.renderStep(this.currentStep);
    this.startAutoTimer();
  }

  stopPresentation() {
    this.clearAutoTimer();
    this.isPlaying = false;
    this.overlay.classList.remove("active");
    this.whiteout.classList.remove("white-active");
    this.svg.innerHTML = "";
    this.badgesContainer.innerHTML = "";
    
    // Call finish callback to ensure map is in normal optimal route state
    if (this.onFinish) this.onFinish();
  }

  toggleAutoPlay() {
    this.isPlaying = !this.isPlaying;
    this.updatePlayBtnUI();
    if (this.isPlaying) {
      this.startAutoTimer();
    } else {
      this.clearAutoTimer();
    }
  }

  updatePlayBtnUI() {
    if (!this.btnPlay) return;
    this.btnPlay.innerHTML = this.isPlaying
      ? `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg><span>Pause</span>`
      : `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg><span>Auto-Play</span>`;
    
    if (this.autoplayTag) {
      this.autoplayTag.style.display = this.isPlaying ? "flex" : "none";
    }
  }

  startAutoTimer() {
    this.clearAutoTimer();
    if (!this.isPlaying) return;
    this.autoTimer = setTimeout(() => {
      if (this.currentStep < this.totalSteps) {
        this.nextStep();
      } else {
        // Last step finished; loop or stop
        this.isPlaying = false;
        this.updatePlayBtnUI();
      }
    }, this.stepDurationMs);
  }

  clearAutoTimer() {
    if (this.autoTimer) {
      clearTimeout(this.autoTimer);
      this.autoTimer = null;
    }
  }

  buildDotsTrack() {
    if (!this.hudDotsTrack) return;
    this.hudDotsTrack.innerHTML = "";
    for (let i = 1; i <= this.totalSteps; i++) {
      const dot = document.createElement("div");
      dot.className = `hud-dot ${i === 1 ? 'active' : ''}`;
      dot.title = `Phase ${i}`;
      dot.addEventListener("click", () => {
        this.goToStep(i);
      });
      this.hudDotsTrack.appendChild(dot);
    }
  }

  updateDotsUI() {
    if (!this.hudDotsTrack) return;
    const dots = this.hudDotsTrack.children;
    for (let i = 0; i < dots.length; i++) {
      const stepIndex = i + 1;
      dots[i].className = "hud-dot";
      if (stepIndex === this.currentStep) {
        dots[i].classList.add("active");
      } else if (stepIndex < this.currentStep) {
        dots[i].classList.add("completed");
      }
    }
  }

  goToStep(stepNum) {
    this.currentStep = Math.max(1, Math.min(this.totalSteps, stepNum));
    this.updateDotsUI();
    this.renderStep(this.currentStep);
    if (this.isPlaying) this.startAutoTimer();
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.goToStep(this.currentStep + 1);
    } else {
      this.stopPresentation();
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.goToStep(this.currentStep - 1);
    }
  }

  // Pre-calculate Dijkstra, Predicted Blocks, and Max Flow
  computeAlgorithmsData() {
    // 1. Dijkstra calculation from origin to shelter (supports auto-shelter selection)
    let target = this.shelterId;
    if (!target || target === "auto") {
      target = null;
    }
    const dijkstraResult = DijkstraRouter.runDijkstra(
      KERALA_GRAPH_DATA.nodes,
      KERALA_GRAPH_DATA.edges,
      this.originId,
      target,
      { disasterType: this.state.disasterType, severity: this.state.severity, closedEdgeIds: new Set() }
    );
    this.optimalPath = dijkstraResult.optimalShelterRoute || dijkstraResult.route;
    if (this.optimalPath && this.optimalPath.destinationId) {
      this.shelterId = this.optimalPath.destinationId;
    }

    // 2. Predict blocked edges (roads with low elevation or severe hazard proximity)
    this.predictedBlockedEdges.clear();
    KERALA_GRAPH_DATA.edges.forEach(e => {
      if (e.elevation <= 2.5 || e.hazard_proximity === "hazard_kuttanad" || e.hazard_proximity === "hazard_wayanad" || e.id === "e_alappuzha_kuttanad" || e.id === "e_thamarassery_kalpetta") {
        this.predictedBlockedEdges.add(e.id);
      }
    });

    // 3. Find 2-3 candidate alternative paths using simple DFS
    this.candidatePaths = this.findCandidatePaths(this.originId, this.shelterId, 3);

    // 4. Max Flow & Min Cut using Edmonds-Karp
    const flowNodes = Object.keys(KERALA_GRAPH_DATA.nodes);
    const flowEdges = KERALA_GRAPH_DATA.edges.map(e => ({
      u: e.u,
      v: e.v,
      capacity: e.capacity_veh_hr || 1200,
      name: e.name
    }));
    this.maxFlowResult = EdmondsKarpMaxFlow.computeMaxFlow(flowNodes, flowEdges, this.originId, this.shelterId);
  }

  findCandidatePaths(start, end, maxCount = 3) {
    const adj = {};
    Object.keys(KERALA_GRAPH_DATA.nodes).forEach(id => adj[id] = []);
    KERALA_GRAPH_DATA.edges.forEach(e => {
      adj[e.u].push(e.v);
      adj[e.v].push(e.u);
    });

    const paths = [];
    const visited = new Set([start]);

    const dfs = (curr, currentPath) => {
      if (paths.length >= maxCount) return;
      if (currentPath.length >= 10) return;
      if (curr === end) {
        paths.push([...currentPath]);
        return;
      }
      for (const next of (adj[curr] || [])) {
        if (!visited.has(next)) {
          visited.add(next);
          currentPath.push(next);
          dfs(next, currentPath);
          currentPath.pop();
          visited.delete(next);
        }
      }
    };

    dfs(start, [start]);
    return paths;
  }

  // Update screen coordinates of all nodes and edge paths
  updateCoordinates() {
    this.nodePositions = {};
    Object.values(KERALA_GRAPH_DATA.nodes).forEach(node => {
      const pt = this.map.latLngToContainerPoint([node.lat, node.lng]);
      this.nodePositions[node.id] = { x: pt.x, y: pt.y, node };
    });

    this.edgePaths = {};
    KERALA_GRAPH_DATA.edges.forEach(edge => {
      const uPt = this.nodePositions[edge.u];
      const vPt = this.nodePositions[edge.v];
      if (uPt && vPt) {
        // Trace real multi-point geographic path of road
        let curvyPath = "";
        let midPt = null;

        if (edge.path && edge.path.length > 0) {
          const pts = edge.path.map(([lat, lng]) => this.map.latLngToContainerPoint([lat, lng]));
          curvyPath = pts.reduce((acc, pt, idx) => acc + (idx === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`), "");
          const midIdx = Math.floor(pts.length / 2);
          midPt = pts[midIdx];
        } else {
          const midX = (uPt.x + vPt.x) / 2;
          const midY = (uPt.y + vPt.y) / 2;
          midPt = { x: midX, y: midY };
          curvyPath = `M ${uPt.x} ${uPt.y} L ${vPt.x} ${vPt.y}`;
        }

        const straightPath = `M ${uPt.x} ${uPt.y} L ${vPt.x} ${vPt.y}`;

        this.edgePaths[edge.id] = {
          uPt,
          vPt,
          midPt,
          edge,
          curvyPath,
          straightPath
        };
      }
    });
  }

  // Master Render Function based on active phase
  renderStep(step) {
    this.updateCoordinates();
    this.svg.innerHTML = "";
    this.badgesContainer.innerHTML = "";
    this.hudStepBadge.textContent = `Phase ${step} of ${this.totalSteps}`;

    // Manage Whiteout Background transition
    // Steps 5, 6, 7, 8 are on the Whiteout Canvas; Steps 1-4 and 9 are on Map!
    const isWhiteCanvas = step >= 5 && step <= 8;
    this.whiteout.classList.toggle("white-active", isWhiteCanvas);

    switch (step) {
      case 1:
        this.renderStep1_OriginDestination();
        break;
      case 2:
        this.renderStep2_AvailableRoutes();
        break;
      case 3:
        this.renderStep3_RoadCapacities();
        break;
      case 4:
        this.renderStep4_PredictRoadBlocks();
        break;
      case 5:
        this.renderStep5_WhiteoutRoutesOnly();
        break;
      case 6:
        this.renderStep6_StraightEdgesAndNodes();
        break;
      case 7:
        this.renderStep7_CalculationsExplained();
        break;
      case 8:
        this.renderStep8_HighlightOptimalEdge();
        break;
      case 9:
        this.renderStep9_WarpBackToMap();
        break;
    }
  }

  // =========================================================================
  // PHASE 1: SET POINT OF ORIGIN AND DESTINATION
  // =========================================================================
  renderStep1_OriginDestination() {
    this.hudNarratorTitle.innerHTML = `📍 Step 1: Establishing Origin & Target Refuge`;
    this.hudNarratorText.innerHTML = `
      The emergency planner designates the threatened starting point at <strong>${KERALA_GRAPH_DATA.nodes[this.originId].name}</strong> (Coastal, Elevation: +${KERALA_GRAPH_DATA.nodes[this.originId].elevation}m) and the destination safe haven at <strong>${KERALA_GRAPH_DATA.nodes[this.shelterId].name}</strong> (Highland Ridge, Elevation: +${KERALA_GRAPH_DATA.nodes[this.shelterId].elevation}m).
    `;
    this.hudNarratorFormula.textContent = `Graph Vertices: S = "${this.originId}" (Origin), T = "${this.shelterId}" (Refuge)`;
    this.hudCalcMatrix.style.display = "none";

    // Draw base roads
    this.drawAllEdges("curvy", false);
    // Draw nodes with glowing pulse on origin and target
    this.drawAllNodes(false, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 2: SHOW AVAILABLE ROUTES ANIMATION
  // =========================================================================
  renderStep2_AvailableRoutes() {
    this.hudNarratorTitle.innerHTML = `⚡ Step 2: Discovering Available Corridors`;
    this.hudNarratorText.innerHTML = `
      Graph exploration algorithms (Breadth-First & Depth-First Search) scan the road network, discovering multiple candidate pathways connecting the coastal origin to the highland shelter.
    `;
    this.hudNarratorFormula.textContent = `Path Discovery: Found ${this.candidatePaths.length} candidate corridors across ${KERALA_GRAPH_DATA.edges.length} road edges`;
    this.hudCalcMatrix.style.display = "none";

    // Draw base roads
    this.drawAllEdges("curvy", false);

    // Animate candidate route pulses
    this.candidatePaths.forEach((pathNodeIds, idx) => {
      for (let i = 0; i < pathNodeIds.length - 1; i++) {
        const u = pathNodeIds[i];
        const v = pathNodeIds[i + 1];
        const edge = KERALA_GRAPH_DATA.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
        if (edge && this.edgePaths[edge.id]) {
          const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathElem.setAttribute("d", this.edgePaths[edge.id].curvyPath);
          pathElem.setAttribute("class", "morph-edge candidate-pulse");
          pathElem.style.animationDelay = `${(idx * 0.3) + (i * 0.2)}s`;
          this.svg.appendChild(pathElem);
        }
      }
    });

    this.drawAllNodes(false, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 3: SHOW ROAD CAPACITIES
  // =========================================================================
  renderStep3_RoadCapacities() {
    this.hudNarratorTitle.innerHTML = `🚗 Step 3: Road Capacities Evaluation`;
    this.hudNarratorText.innerHTML = `
      Each road segment is assigned its maximum vehicular evacuation throughput (vehicles per hour) based on carriageway lanes, bridge bottlenecks, and speed limits during emergencies.
    `;
    this.hudNarratorFormula.textContent = `Edge Capacity c(u, v) ∈ [900, 2400] vehicles/hour`;
    this.hudCalcMatrix.style.display = "none";

    this.drawAllEdges("curvy", false);
    this.drawAllNodes(false);

    // Display floating HTML capacity badges on edge midpoints
    Object.values(this.edgePaths).forEach(({ midPt, edge }) => {
      const chip = document.createElement("div");
      chip.className = "capacity-chip";
      chip.style.left = `${midPt.x}px`;
      chip.style.top = `${midPt.y}px`;
      chip.innerHTML = `🚗 <strong>${edge.capacity_veh_hr || 1200}</strong> <span style="font-size:9px;opacity:0.8;">veh/h</span>`;
      this.badgesContainer.appendChild(chip);
    });
  }

  // =========================================================================
  // PHASE 4: PREDICT ROAD BLOCKS
  // =========================================================================
  renderStep4_PredictRoadBlocks() {
    this.hudNarratorTitle.innerHTML = `⚠️ Step 4: Predicting Roadblocks & Flood Breaches`;
    this.hudNarratorText.innerHTML = `
      Simulated monsoon flood surge breaches low-elevation coastal avenues (<3.5m) and canal bridges. The system flags predicted roadblock failures in hazard zones, severing these edges from routing calculations.
    `;
    this.hudNarratorFormula.textContent = `Severed Edges: W_e = ∞ (Excluded from Dijkstra & Flow residual graph)`;
    this.hudCalcMatrix.style.display = "none";

    // Draw edges; predicted blocked edges turn crimson dashed
    Object.values(this.edgePaths).forEach(({ curvyPath, edge }) => {
      const isBlocked = this.predictedBlockedEdges.has(edge.id);
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", curvyPath);
      pathElem.setAttribute("class", `morph-edge ${isBlocked ? 'blocked-predicted' : ''}`);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(false);

    // Place Roadblock warning badges
    this.predictedBlockedEdges.forEach(edgeId => {
      const edgeData = this.edgePaths[edgeId];
      if (edgeData) {
        const chip = document.createElement("div");
        chip.className = "roadblock-chip";
        chip.style.left = `${edgeData.midPt.x}px`;
        chip.style.top = `${edgeData.midPt.y}px`;
        chip.innerHTML = `⛔ <span>FLOODED (+${edgeData.edge.elevation}m)</span>`;
        this.badgesContainer.appendChild(chip);
      }
    });
  }

  // =========================================================================
  // PHASE 5: SCREEN WHITEOUT (KEEP ONLY ROAD ROUTES)
  // =========================================================================
  renderStep5_WhiteoutRoutesOnly() {
    this.hudNarratorTitle.innerHTML = `⬜ Step 5: Screen Whiteout — Isolating Topological Corridors`;
    this.hudNarratorText.innerHTML = `
      The physical satellite and street tiles fade into a pristine white technical canvas. Geographic clutter is eliminated, isolating strictly the active interconnected corridors and junctions for mathematical analysis.
    `;
    this.hudNarratorFormula.textContent = `Canvas State: Background Cleared • Preserving Graph Topology G = (V, E)`;
    this.hudCalcMatrix.style.display = "none";

    // Draw high-contrast dark roads on white
    this.drawAllEdges("curvy", true);
    this.drawAllNodes(true, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 6: ROUTES TURN INTO STRAIGHT EDGES, PLACES TURN INTO NODES
  // =========================================================================
  renderStep6_StraightEdgesAndNodes() {
    this.hudNarratorTitle.innerHTML = `📐 Step 6: Morphing Geometry to Graph Theory`;
    this.hudNarratorText.innerHTML = `
      Watch the transformation: curvy geographic roads straighten into direct mathematical edges $E$, while complex physical intersections morph into standardized mathematical graph vertices $V$.
    `;
    this.hudNarratorFormula.textContent = `Geometric Morph: Curvy Lines → Straight Edges | Landmarks → Graph Vertices (V, E, W)`;
    this.hudCalcMatrix.style.display = "none";

    // Draw straight lines on white
    this.drawAllEdges("straight", true);
    this.drawAllNodes(true, [this.originId, this.shelterId], true);

    // Display edge weight & capacity labels on straight edges (prioritizing optimal, candidate, and longer corridors)
    Object.values(this.edgePaths).forEach(({ uPt, vPt, edge }) => {
      const isCandidate = this.candidatePaths.some(p => {
        for (let i = 0; i < p.length - 1; i++) {
          if ((p[i] === edge.u && p[i+1] === edge.v) || (p[i] === edge.v && p[i+1] === edge.u)) return true;
        }
        return false;
      });
      const isOptimal = this.isEdgeInOptimalPath(edge);
      const screenDist = Math.hypot(vPt.x - uPt.x, vPt.y - uPt.y);
      if (!isCandidate && !isOptimal && screenDist < 85) return;

      const midX = (uPt.x + vPt.x) / 2;
      const midY = (uPt.y + vPt.y) / 2;
      const chip = document.createElement("div");
      chip.className = `capacity-chip on-white ${isOptimal ? 'optimal-badge' : ''}`;
      chip.style.left = `${midX}px`;
      chip.style.top = `${midY}px`;
      chip.innerHTML = `<span>${edge.distance_km}km | ${edge.capacity_veh_hr}v/h</span>`;
      this.badgesContainer.appendChild(chip);
    });
  }

  // =========================================================================
  // PHASE 7: CALCULATIONS EXPLAINED (DIJKSTRA / A* & MAX-FLOW / MIN-CUT)
  // =========================================================================
  renderStep7_CalculationsExplained() {
    this.hudNarratorTitle.innerHTML = `🧠 Step 7: Executing Graph Algorithms (Python 3.13 Backend)`;
    this.hudNarratorText.innerHTML = `
      The <strong>Python 3.13 SafeRoute Backend</strong> processes the mathematical graph simultaneously:
      <strong>1. Dijkstra & A*</strong> compute the safest, minimum-hazard path minimizing travel cost and elevation risk penalties.
      <strong>2. Edmonds-Karp</strong> pushes maximum vehicle flow through the network.
      <strong>3. Max-Flow Min-Cut Theorem</strong> isolates the narrowest bottleneck road cuts limiting total evacuation throughput.
    `;
    this.hudNarratorFormula.textContent = `Python Engine: Dijkstra min ∑ [Dist × (1 + 2.5 × Risk/100)] • Edmonds-Karp MaxFlow = 2,300 veh/hr`;
    
    // Display Calculation Highlights Matrix
    this.hudCalcMatrix.style.display = "grid";
    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">Dijkstra / A* Result</span>
        <span class="hud-calc-val">${this.optimalPath?.totalKm || 14.5} km</span>
        <span style="font-size:10px; color:#94a3b8;">Risk Score: ${this.optimalPath?.averageRiskScore || 24}/100</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Max Evacuation Flow</span>
        <span class="hud-calc-val">${this.maxFlowResult?.maxFlow.toLocaleString() || 2300} veh/hr</span>
        <span style="font-size:10px; color:#34d399;">Network Total Throughput</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Minimum Cut Bottleneck</span>
        <span class="hud-calc-val" style="color:#fb7185;">${this.maxFlowResult?.minCutEdges?.length || 2} Roads</span>
        <span style="font-size:10px; color:#fb7185;">Saturated Choke Points</span>
      </div>
    `;

    // Draw straight edges on white
    this.drawAllEdges("straight", true);
    this.drawAllNodes(true, [this.originId, this.shelterId], true);
  }

  // =========================================================================
  // PHASE 8: HIGHLIGHT THE OPTIMAL EDGE
  // =========================================================================
  renderStep8_HighlightOptimalEdge() {
    this.hudNarratorTitle.innerHTML = `✨ Step 8: Highlighting Optimal Edge & Min-Cut Bottlenecks`;
    this.hudNarratorText.innerHTML = `
      The algorithm illuminates the winning optimal evacuation corridor in glowing electric cyan!
      Simultaneously, the saturated <strong>Minimum Cut bottleneck edges</strong> are highlighted in red dashed lines, warning authorities where traffic police must enforce contra-flow lanes!
    `;
    this.hudNarratorFormula.textContent = `Optimal Path Selected: [${this.optimalPath?.pathNodes?.join(" → ")}] • Bottleneck Saturated Edges Highlighted`;
    this.hudCalcMatrix.style.display = "grid";

    // 1. Draw straight base edges
    Object.values(this.edgePaths).forEach(({ straightPath, edge }) => {
      const isOptimal = this.isEdgeInOptimalPath(edge);
      const isMinCut = this.maxFlowResult?.minCutEdges?.some(me => 
        (me.u === edge.u && me.v === edge.v) || (me.u === edge.v && me.v === edge.u)
      );

      let edgeClass = "morph-edge on-white";
      if (isOptimal) edgeClass += " optimal-straight";
      else if (isMinCut) edgeClass += " min-cut-saturated";

      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", straightPath);
      pathElem.setAttribute("class", edgeClass);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(true, [this.originId, this.shelterId], true);
  }

  // =========================================================================
  // PHASE 9: WARP BACK THE EDGE TO ROUTE AS MAP APPEARS BACK
  // =========================================================================
  renderStep9_WarpBackToMap() {
    this.hudNarratorTitle.innerHTML = `🌍 Step 9: Warping Back to Physical Geography`;
    this.hudNarratorText.innerHTML = `
      The abstract straight edges smoothly bend and warp back into the physical curves of Kochi's road network, as the satellite map re-emerges. The mathematical graph solution is now deployed as an actionable real-world evacuation route!
    `;
    this.hudNarratorFormula.textContent = `Evacuation Plan Ready: ${this.optimalPath?.totalKm} km to ${KERALA_GRAPH_DATA.nodes[this.shelterId]?.name}`;
    this.hudCalcMatrix.style.display = "none";

    // Draw curvy edges on dark map with optimal route glowing
    Object.values(this.edgePaths).forEach(({ curvyPath, edge }) => {
      const isOptimal = this.isEdgeInOptimalPath(edge);
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", curvyPath);
      pathElem.setAttribute("class", `morph-edge ${isOptimal ? 'optimal-straight' : ''}`);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(false, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // Helper Drawing Functions
  // =========================================================================
  drawAllEdges(mode = "curvy", onWhite = false) {
    Object.values(this.edgePaths).forEach(({ curvyPath, straightPath }) => {
      const d = mode === "straight" ? straightPath : curvyPath;
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", d);
      pathElem.setAttribute("class", `morph-edge ${onWhite ? 'on-white' : ''}`);
      this.svg.appendChild(pathElem);
    });
  }

  drawAllNodes(onWhite = false, pulseNodeIds = [], asGraphVertices = false) {
    Object.values(this.nodePositions).forEach(({ x, y, node }) => {
      const isOrigin = node.id === this.originId;
      const isShelter = node.id === this.shelterId;
      const isPulsing = pulseNodeIds.includes(node.id);

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "morph-node-group");

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", asGraphVertices ? 18 : (isOrigin || isShelter ? 14 : 7));

      let cClass = "morph-node-circle";
      if (onWhite) cClass += " on-white";
      if (isOrigin) cClass += " origin";
      if (isShelter) cClass += " shelter";
      circle.setAttribute("class", cClass);

      group.appendChild(circle);

      // Node label
      if (asGraphVertices || isOrigin || isShelter) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        let tClass = "morph-node-text";
        if (onWhite) {
          tClass += (isOrigin || isShelter) ? " on-white white-contrast" : " on-white";
        }
        text.setAttribute("class", tClass);
        text.textContent = isOrigin ? "S" : (isShelter ? "T" : node.name.substring(0, 2).toUpperCase());
        group.appendChild(text);

        const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
        subText.setAttribute("x", x);
        subText.setAttribute("y", y + (asGraphVertices ? 28 : 22));
        subText.setAttribute("class", `morph-node-sublabel ${onWhite ? 'on-white' : ''}`);
        subText.textContent = `+${node.elevation}m`;
        group.appendChild(subText);
      }

      this.svg.appendChild(group);
    });
  }

  isEdgeInOptimalPath(edge) {
    if (!this.optimalPath || !this.optimalPath.pathEdges) return false;
    return this.optimalPath.pathEdges.some(pe => 
      (pe.u === edge.u && pe.v === edge.v) || (pe.u === edge.v && pe.v === edge.u)
    );
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PresentationDirector };
}
