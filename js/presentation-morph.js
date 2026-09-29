/**
 * Kerala SafeRoute - Cinematic Visual Presentation & Graph Morphing Director
 * 
 * Clean, Presentation-Ready Architecture (Presenter-Focused, Zero Audio Noise, Rich Visuals):
 * 1. Strategic Refuge Selection: Multi-criteria optimization (bypassing low traps for best safe haven)
 * 2. Multi-Corridor Exploration: Animated vehicle flow particles along parallel routes
 * 3. Highway Capacities & Congestion: Visual traffic pacing (2400 v/h free flow vs 900 v/h choke)
 * 4. Roadblock Failures & Flood Breaches: Animated shockwave ripples & severed barrier drops
 * 5. Screen Whiteout: Holographic technical canvas isolating topological graph G = (V, E)
 * 6. Smooth Geometric Morph: Curvy physical highways flatten into abstract straight edges
 * 7. Visual Algorithm Execution:
 *    - Dijkstra / A* Radar Wavefront & Priority Queue Relaxation
 *    - Edmonds-Karp Parallel Augmenting Flow Surge
 *    - Max-Flow Min-Cut Theorem Laser Slicer & Saturated Choke Points
 *    - Kruskal Minimum Spanning Tree (MST) Backbone
 * 8. Winning Route Illumination & Contra-Flow Enforcement
 * 9. Physical Road Warp: Abstract lines smoothly bend back to real-world highway curves
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
    this.particleTimer = null;
    this.algoAnimationTimer = null;
    this.morphAnimationFrame = null;

    // Playback Speed (1x = 5000ms, 0.5x = 8000ms, 2x = 2500ms)
    this.speedMultiplier = 1.0;
    this.baseStepDurationMs = 5000;

    // Camera Framing Mode: "corridor" (default, spacious) vs "statewide" (full Kerala)
    this.cameraMode = "corridor";

    // Active Algorithm Tab in Step 7: 'dijkstra', 'maxflow', 'mincut', 'mst'
    this.activeAlgoTab = "dijkstra";

    // Cache computed graph coordinates & structures
    this.nodePositions = {};
    this.edgePaths = {};
    this.optimalPath = null;
    this.bypassedInfo = null;
    this.candidatePaths = [];
    this.predictedBlockedEdges = new Set();
    this.maxFlowResult = null;
    this.mstResult = null;

    // Spacious Topological Graph & Candidate Subgraph
    this.candidateShelters = [];
    this.candidateNodeIds = new Set();
    this.candidateEdgeIds = new Set();
    this.topologicalPositions = {};
    this.topologicalEdgePaths = {};

    // DOM Elements
    if (typeof document !== "undefined") {
      this.overlay = document.getElementById("presentation-overlay");
      this.whiteout = document.getElementById("morph-whiteout");
      this.svg = document.getElementById("morph-svg");
      this.badgesContainer = document.getElementById("morph-dom-badges");
      this.tooltip = document.getElementById("morph-tooltip");
      
      // HUD Slide Card Elements
      this.hudStepBadge = document.getElementById("hud-step-badge");
      this.hudDotsTrack = document.getElementById("hud-dots-track");
      this.hudSlideTitle = document.getElementById("hud-narrator-title");
      this.hudSlidePunchline = document.getElementById("hud-narrator-text");
      this.hudSlidePills = document.getElementById("hud-slide-pills");
      this.hudSlideSubnote = document.getElementById("hud-narrator-formula");
      this.hudAlgoRuntimeBadge = document.getElementById("hud-algo-runtime-badge");

      // Tabs & Matrix
      this.hudAlgoTabs = document.getElementById("hud-algo-tabs");
      this.hudCalcMatrix = document.getElementById("hud-calc-matrix");
      this.hudAlgoStepper = document.getElementById("hud-algo-stepper");
      this.algoStepStatus = document.getElementById("algo-step-status");
      this.btnAlgoReplay = document.getElementById("btn-algo-replay");

      // Controls
      this.btnPrev = document.getElementById("hud-btn-prev");
      this.btnPlay = document.getElementById("hud-btn-play");
      this.btnNext = document.getElementById("hud-btn-next");
      this.btnClose = document.getElementById("hud-btn-close");
      this.autoplayTag = document.getElementById("hud-autoplay-tag");
      this.autoplayText = document.getElementById("autoplay-text");

      // Camera view toggle
      this.btnViewCorridor = document.getElementById("btn-view-corridor");
      this.btnViewStatewide = document.getElementById("btn-view-statewide");

      // Speed buttons
      this.speedBtns = document.querySelectorAll(".speed-btn");

      this.initEvents();
    }
  }

  // =========================================================================
  // EVENT LISTENERS & KEYBOARD CONTROLS
  // =========================================================================
  initEvents() {
    this.btnPrev?.addEventListener("click", () => this.prevStep());
    this.btnNext?.addEventListener("click", () => this.nextStep());
    this.btnPlay?.addEventListener("click", () => this.toggleAutoPlay());
    this.btnClose?.addEventListener("click", () => this.stopPresentation());

    // Camera view switcher
    this.btnViewCorridor?.addEventListener("click", () => this.setCameraMode("corridor"));
    this.btnViewStatewide?.addEventListener("click", () => this.setCameraMode("statewide"));

    // Speed buttons
    this.speedBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const speed = parseFloat(btn.dataset.speed) || 1.0;
        this.setSpeed(speed);
      });
    });

    // Algorithm Tab Switching in Step 7
    if (this.hudAlgoTabs) {
      this.hudAlgoTabs.querySelectorAll(".algo-tab").forEach(tab => {
        tab.addEventListener("click", () => {
          this.setAlgoTab(tab.dataset.algo);
        });
      });
    }

    // Algorithm Replay button
    this.btnAlgoReplay?.addEventListener("click", () => {
      this.replayActiveAlgorithm();
    });

    // Global Keyboard Shortcuts (Space=Play/Pause, Left/Right=Steps, C=Camera, Esc=Exit)
    window.addEventListener("keydown", (e) => {
      if (!this.overlay || !this.overlay.classList.contains("active")) return;
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "SELECT" || e.target.tagName === "TEXTAREA")) return;

      if (e.code === "Space") {
        e.preventDefault();
        this.toggleAutoPlay();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        this.nextStep();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
      } else if (e.code === "Escape") {
        e.preventDefault();
        this.stopPresentation();
      } else if (e.code === "KeyC") {
        e.preventDefault();
        this.setCameraMode(this.cameraMode === "corridor" ? "statewide" : "corridor");
      }
    });

    // Responsive repositioning on map move/zoom
    this.map.on("move", () => {
      if (this.overlay && this.overlay.classList.contains("active")) {
        this.updateCoordinates();
        this.renderStep(this.currentStep, false);
      }
    });

    // Tooltip Mouse Event Handlers on SVG
    if (this.svg) {
      this.svg.addEventListener("mousemove", (e) => this.handleSvgMouseMove(e));
      this.svg.addEventListener("mouseleave", () => this.hideTooltip());
    }
  }

  // =========================================================================
  // PRESENTATION LIFECYCLE
  // =========================================================================
  startPresentation(originId, shelterId) {
    this.originId = originId || this.state.selectedOrigin || "kuttanad";
    this.shelterId = shelterId || (this.state.selectedShelter !== "auto" ? this.state.selectedShelter : "shelter_alappuzha");

    // Pre-calculate Dijkstra, multi-criteria suitability, Max Flow, and MST
    this.computeAlgorithmsData();

    // 1. Enter Fullscreen Theater Mode
    if (typeof document !== "undefined") {
      document.body.classList.add("presentation-fullscreen-mode");
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    }

    // Default to Corridor View for instant clarity and spaciousness
    this.cameraMode = "corridor";
    this.updateCameraUI();

    // Map container now takes full viewport; invalidate and fit candidate bounds
    this.map.invalidateSize();
    this.applyCameraBounds();

    // Show overlay
    this.overlay.classList.add("active");
    this.currentStep = 1;
    this.isPlaying = true;
    this.updatePlayBtnUI();

    this.buildDotsTrack();
    this.updateCoordinates();
    this.renderStep(this.currentStep, true);

    // Re-verify bounds and coordinates once browser reflow completes
    setTimeout(() => {
      this.map.invalidateSize();
      this.applyCameraBounds();
      this.updateCoordinates();
      this.renderStep(this.currentStep, false);
    }, 150);

    this.startAutoTimer();
  }

  stopPresentation() {
    this.clearAutoTimer();
    this.clearAlgoAnimation();
    this.stopParticleSimulation();

    if (this.morphAnimationFrame) {
      cancelAnimationFrame(this.morphAnimationFrame);
      this.morphAnimationFrame = null;
    }

    this.isPlaying = false;
    this.overlay.classList.remove("active");
    this.whiteout.classList.remove("white-active");
    this.svg.innerHTML = "";
    this.badgesContainer.innerHTML = "";
    this.hideTooltip();

    // Exit Fullscreen Mode
    if (typeof document !== "undefined") {
      document.body.classList.remove("presentation-fullscreen-mode");
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }

    setTimeout(() => {
      this.map.invalidateSize();
    }, 150);
    
    // Call finish callback to ensure map is in normal optimal route state
    if (this.onFinish) this.onFinish();
  }

  // =========================================================================
  // CAMERA FRAMING MODES (CORRIDOR FOCUS VS STATEWIDE)
  // =========================================================================
  setCameraMode(mode) {
    this.cameraMode = mode;
    this.updateCameraUI();
    this.applyCameraBounds();
    setTimeout(() => {
      this.updateCoordinates();
      this.renderStep(this.currentStep, false);
    }, 400);
  }

  updateCameraUI() {
    this.btnViewCorridor?.classList.toggle("active", this.cameraMode === "corridor");
    this.btnViewStatewide?.classList.toggle("active", this.cameraMode === "statewide");
    this.overlay?.classList.toggle("mode-statewide", this.cameraMode === "statewide");
  }

  applyCameraBounds() {
    if (this.cameraMode === "corridor") {
      const targetNodeIds = (this.candidateNodeIds && this.candidateNodeIds.size > 0)
        ? this.candidateNodeIds
        : new Set([this.originId, this.shelterId]);

      const latLngs = Array.from(targetNodeIds)
        .map(id => KERALA_GRAPH_DATA.nodes[id])
        .filter(Boolean)
        .map(n => [n.lat, n.lng]);

      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        this.map.fitBounds(bounds, {
          paddingTopLeft: [70, 70],
          paddingBottomRight: [70, 220],
          maxZoom: 13,
          animate: true
        });
        return;
      }
    }

    // Statewide fallback: Fit all Kerala nodes
    const allLatLngs = Object.values(KERALA_GRAPH_DATA.nodes).map(n => [n.lat, n.lng]);
    this.map.fitBounds(L.latLngBounds(allLatLngs), {
      paddingTopLeft: [40, 40],
      paddingBottomRight: [40, 180],
      maxZoom: 9,
      animate: true
    });
  }

  // =========================================================================
  // SPEED & PLAYBACK PACING
  // =========================================================================
  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    this.speedBtns.forEach(btn => {
      btn.classList.toggle("active", parseFloat(btn.dataset.speed) === multiplier);
    });
    this.updateAutoplayText();
    if (this.isPlaying) {
      this.startAutoTimer();
    }
  }

  getStepDuration() {
    return Math.round(this.baseStepDurationMs / this.speedMultiplier);
  }

  updateAutoplayText() {
    if (!this.autoplayText) return;
    const durSec = (this.getStepDuration() / 1000).toFixed(1);
    this.autoplayText.textContent = `Auto-Advancing (${durSec}s)`;
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
    this.updateAutoplayText();
  }

  startAutoTimer() {
    this.clearAutoTimer();
    if (!this.isPlaying) return;
    this.autoTimer = setTimeout(() => {
      if (this.currentStep < this.totalSteps) {
        this.nextStep();
      } else {
        this.isPlaying = false;
        this.updatePlayBtnUI();
      }
    }, this.getStepDuration());
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
      dot.title = `Jump to Phase ${i}`;
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
    this.renderStep(this.currentStep, true);
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

  // =========================================================================
  // PRE-CALCULATE GRAPH ALGORITHMS (MULTI-CRITERIA BEST REFUGE SELECTION)
  // =========================================================================
  computeAlgorithmsData() {
    // 1. Evaluate all shelters to find multi-criteria candidate safe havens and bypassed shelters
    const allSheltersResult = DijkstraRouter.runDijkstra(
      KERALA_GRAPH_DATA.nodes,
      KERALA_GRAPH_DATA.edges,
      this.originId,
      null, // evaluate all shelters
      { disasterType: this.state.disasterType, severity: this.state.severity, closedEdgeIds: new Set() }
    );

    let dijkstraResult = allSheltersResult;
    if (this.state.selectedShelter && this.state.selectedShelter !== "auto") {
      const specificResult = DijkstraRouter.runDijkstra(
        KERALA_GRAPH_DATA.nodes,
        KERALA_GRAPH_DATA.edges,
        this.originId,
        this.state.selectedShelter,
        { disasterType: this.state.disasterType, severity: this.state.severity, closedEdgeIds: new Set() }
      );
      this.optimalPath = specificResult.route;
      this.shelterId = this.state.selectedShelter;
    } else {
      this.optimalPath = allSheltersResult.optimalShelterRoute;
      if (this.optimalPath && this.optimalPath.destinationId) {
        this.shelterId = this.optimalPath.destinationId;
      }
    }
    this.bypassedInfo = allSheltersResult.bypassedInfo || null;

    // Predict blocked edges
    this.predictedBlockedEdges.clear();
    KERALA_GRAPH_DATA.edges.forEach(e => {
      if (e.elevation <= 2.5 || e.hazard_proximity === "hazard_kuttanad" || e.hazard_proximity === "hazard_wayanad" || e.id === "e_alappuzha_kuttanad" || e.id === "e_thamarassery_kalpetta") {
        this.predictedBlockedEdges.add(e.id);
      }
    });

    // 1. Identify Candidate Safe Shelters (Optimal, Runner-up within 1.6x dist, Bypassed)
    const candidateShelterSet = new Set();
    if (this.shelterId) candidateShelterSet.add(this.shelterId);
    if (this.bypassedInfo && this.bypassedInfo.closestShelterId) {
      candidateShelterSet.add(this.bypassedInfo.closestShelterId);
    }
    const optimalKm = this.optimalPath?.totalKm || 40;
    if (allSheltersResult.allShelterRoutes) {
      for (const sr of allSheltersResult.allShelterRoutes) {
        if (!candidateShelterSet.has(sr.destinationId) && sr.totalKm <= optimalKm * 1.6) {
          candidateShelterSet.add(sr.destinationId);
          if (candidateShelterSet.size >= 3) break;
        }
      }
    }
    this.candidateShelters = Array.from(candidateShelterSet);

    // 2. Candidate Alternative Paths
    this.candidatePaths = [];
    if (this.optimalPath && this.optimalPath.pathNodes) {
      this.candidatePaths.push(this.optimalPath.pathNodes);
    }
    // Paths to other candidate shelters
    if (allSheltersResult.allShelterRoutes) {
      allSheltersResult.allShelterRoutes.forEach(sr => {
        if (candidateShelterSet.has(sr.destinationId) && sr.destinationId !== this.shelterId && sr.pathNodes) {
          if (!this.candidatePaths.some(p => p.join("-") === sr.pathNodes.join("-"))) {
            this.candidatePaths.push(sr.pathNodes);
          }
        }
      });
    }
    // Multi-corridor parallel bypasses to optimal haven
    const parallelPaths = this.findCandidatePaths(this.originId, this.shelterId, 3);
    parallelPaths.forEach(pp => {
      if (!this.candidatePaths.some(existing => existing.join("-") === pp.join("-"))) {
        this.candidatePaths.push(pp);
      }
    });

    // 3. Candidate Nodes Set
    this.candidateNodeIds = new Set();
    this.candidateNodeIds.add(this.originId);
    this.candidateShelters.forEach(id => this.candidateNodeIds.add(id));
    this.candidatePaths.forEach(path => path.forEach(id => this.candidateNodeIds.add(id)));

    // 4. Candidate Edges Set
    this.candidateEdgeIds = new Set();
    KERALA_GRAPH_DATA.edges.forEach(e => {
      if (this.candidateNodeIds.has(e.u) && this.candidateNodeIds.has(e.v)) {
        this.candidateEdgeIds.add(e.id);
      }
    });

    // Max Flow & Min Cut on Candidate Subgraph
    const flowNodes = Array.from(this.candidateNodeIds);
    const flowEdges = KERALA_GRAPH_DATA.edges
      .filter(e => this.candidateNodeIds.has(e.u) && this.candidateNodeIds.has(e.v))
      .map(e => ({
        u: e.u,
        v: e.v,
        capacity: e.capacity_veh_hr || 1200,
        name: e.name
      }));

    this.maxFlowResult = EdmondsKarpMaxFlow.computeMaxFlow(
      flowNodes.length >= 2 ? flowNodes : Object.keys(KERALA_GRAPH_DATA.nodes),
      flowEdges.length >= 1 ? flowEdges : KERALA_GRAPH_DATA.edges,
      this.originId,
      this.shelterId
    );

    // Kruskal MST on Candidate Subgraph
    this.mstResult = this.computeKruskalMST(
      flowNodes.length >= 2 ? flowNodes : Object.keys(KERALA_GRAPH_DATA.nodes),
      KERALA_GRAPH_DATA.edges.filter(e => this.candidateNodeIds.has(e.u) && this.candidateNodeIds.has(e.v))
    );
  }

  findCandidatePaths(start, end, maxCount = 3) {
    const adj = {};
    Object.keys(KERALA_GRAPH_DATA.nodes).forEach(id => adj[id] = []);
    KERALA_GRAPH_DATA.edges.forEach(e => {
      if (adj[e.u]) adj[e.u].push(e.v);
      if (adj[e.v]) adj[e.v].push(e.u);
    });

    const maxHops = Math.max(5, (this.optimalPath?.pathNodes?.length || 4) + 2);
    const paths = [];
    const visited = new Set([start]);

    const dfs = (curr, currentPath) => {
      if (paths.length >= maxCount) return;
      if (currentPath.length >= maxHops) return;
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

  computeKruskalMST(nodes, edges) {
    const parent = {};
    nodes.forEach(n => parent[n] = n);
    function find(i) {
      if (parent[i] === i) return i;
      return parent[i] = find(parent[i]);
    }
    function union(i, j) {
      const rootI = find(i);
      const rootJ = find(j);
      if (rootI !== rootJ) {
        parent[rootI] = rootJ;
        return true;
      }
      return false;
    }

    const sortedEdges = [...edges].sort((a, b) => (a.distance_km || 10) - (b.distance_km || 10));
    const mstEdges = [];
    let totalKm = 0;

    for (const e of sortedEdges) {
      if (union(e.u, e.v)) {
        mstEdges.push(e);
        totalKm += e.distance_km || 0;
        if (mstEdges.length === nodes.length - 1) break;
      }
    }

    return { mstEdges, totalKm: Math.round(totalKm) };
  }

  // =========================================================================
  // UPDATE SCREEN COORDINATES
  // =========================================================================
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
        let curvyPath = "";
        let midPt = null;
        let polylinePoints = [];

        if (edge.path && edge.path.length > 0) {
          polylinePoints = edge.path.map(([lat, lng]) => this.map.latLngToContainerPoint([lat, lng]));
          curvyPath = polylinePoints.reduce((acc, pt, idx) => acc + (idx === 0 ? `M ${pt.x} ${pt.y}` : ` L ${pt.x} ${pt.y}`), "");
          const midIdx = Math.floor(polylinePoints.length / 2);
          midPt = polylinePoints[midIdx];
        } else {
          const midX = (uPt.x + vPt.x) / 2;
          const midY = (uPt.y + vPt.y) / 2;
          midPt = { x: midX, y: midY };
          curvyPath = `M ${uPt.x} ${uPt.y} L ${vPt.x} ${vPt.y}`;
          polylinePoints = [uPt, vPt];
        }

        const straightPath = `M ${uPt.x} ${uPt.y} L ${vPt.x} ${vPt.y}`;

        this.edgePaths[edge.id] = {
          uPt,
          vPt,
          midPt,
          edge,
          curvyPath,
          straightPath,
          polylinePoints
        };
      }
    });

    // Generate spacious topological layout for mathematical graph stages
    this.computeTopologicalLayout();
  }

  // =========================================================================
  // SPACIOUS TOPOLOGICAL GRAPH LAYOUT FOR MATHEMATICAL BLUEPRINT (PHASES 6-8)
  // =========================================================================
  computeTopologicalLayout() {
    this.topologicalPositions = {};
    this.topologicalEdgePaths = {};

    const W = (this.svg && this.svg.clientWidth) ? this.svg.clientWidth : (window.innerWidth || 1600);
    const H = (this.svg && this.svg.clientHeight) ? this.svg.clientHeight : (window.innerHeight || 900);

    const xStart = 160;
    const xEnd = Math.max(xStart + 360, W - 220);
    const yTop = 130;
    const yBottom = Math.max(yTop + 200, H - 360);

    const candidateList = Array.from(this.candidateNodeIds || []);
    if (candidateList.length === 0) return;

    // Build candidate adjacency map
    const candAdj = {};
    candidateList.forEach(id => candAdj[id] = []);
    KERALA_GRAPH_DATA.edges.forEach(e => {
      if (this.candidateNodeIds.has(e.u) && this.candidateNodeIds.has(e.v)) {
        candAdj[e.u]?.push(e.v);
        candAdj[e.v]?.push(e.u);
      }
    });

    // BFS hop distance from originId
    const hops = {};
    hops[this.originId] = 0;
    const queue = [this.originId];
    while (queue.length > 0) {
      const u = queue.shift();
      const curH = hops[u];
      (candAdj[u] || []).forEach(v => {
        if (hops[v] === undefined) {
          hops[v] = curH + 1;
          queue.push(v);
        }
      });
    }

    // Default any disconnected candidate node to hop 1
    candidateList.forEach(id => {
      if (hops[id] === undefined) hops[id] = 1;
    });

    let maxHop = 0;
    candidateList.forEach(id => {
      if (hops[id] > maxHop) maxHop = hops[id];
    });
    if (maxHop < 2) maxHop = 2;

    // Group into horizontal layers (columns)
    const layers = {};
    for (let h = 0; h <= maxHop; h++) layers[h] = [];

    candidateList.forEach(id => {
      const isShelter = this.candidateShelters.includes(id) || id === this.shelterId;
      let assignedLayer = hops[id];
      // Align all candidate safe havens to the rightmost layer
      if (isShelter) {
        assignedLayer = maxHop;
      }
      if (assignedLayer > maxHop) assignedLayer = maxHop;
      if (!layers[assignedLayer]) layers[assignedLayer] = [];
      layers[assignedLayer].push(id);
    });

    // Compute spacious coordinates for each layer
    for (let l = 0; l <= maxHop; l++) {
      const nodesInLayer = layers[l] || [];
      if (nodesInLayer.length === 0) continue;

      const layerX = xStart + (l / maxHop) * (xEnd - xStart);
      const K = nodesInLayer.length;

      // Sort nodes to preserve relative latitude and prevent criss-crossing lines
      nodesInLayer.sort((a, b) => {
        const latA = KERALA_GRAPH_DATA.nodes[a]?.lat || 0;
        const latB = KERALA_GRAPH_DATA.nodes[b]?.lat || 0;
        return latB - latA;
      });

      if (K === 1) {
        const id = nodesInLayer[0];
        const layerY = (yTop + yBottom) / 2;
        this.topologicalPositions[id] = {
          x: Math.round(layerX),
          y: Math.round(layerY),
          node: KERALA_GRAPH_DATA.nodes[id]
        };
      } else {
        const stepY = (yBottom - yTop) / (K - 1);
        nodesInLayer.forEach((id, idx) => {
          const layerY = yTop + idx * stepY;
          this.topologicalPositions[id] = {
            x: Math.round(layerX),
            y: Math.round(layerY),
            node: KERALA_GRAPH_DATA.nodes[id]
          };
        });
      }
    }

    // Build straight edges connecting spacious topological nodes
    KERALA_GRAPH_DATA.edges.forEach(edge => {
      if (this.candidateNodeIds.has(edge.u) && this.candidateNodeIds.has(edge.v)) {
        const uPt = this.topologicalPositions[edge.u];
        const vPt = this.topologicalPositions[edge.v];
        if (uPt && vPt) {
          const midPt = { x: (uPt.x + vPt.x) / 2, y: (uPt.y + vPt.y) / 2 };
          this.topologicalEdgePaths[edge.id] = {
            uPt,
            vPt,
            midPt,
            edge,
            straightPath: `M ${uPt.x} ${uPt.y} L ${vPt.x} ${vPt.y}`
          };
        }
      }
    });
  }

  // =========================================================================
  // MASTER RENDER DISPATCHER
  // =========================================================================
  renderStep(step, isStepTransition = true) {
    this.updateCoordinates();
    this.clearAlgoAnimation();
    this.stopParticleSimulation();
    this.svg.innerHTML = "";
    this.badgesContainer.innerHTML = "";
    this.hideTooltip();
    this.hudStepBadge.textContent = `Phase ${step} of ${this.totalSteps}`;

    // Manage Whiteout Background transition (Steps 5-8 are on Whiteout Canvas)
    const isWhiteCanvas = step >= 5 && step <= 8;
    this.whiteout.classList.toggle("white-active", isWhiteCanvas);

    // Hide sub-tabs by default unless in Step 7
    if (this.hudAlgoTabs) this.hudAlgoTabs.style.display = (step === 7) ? "flex" : "none";
    if (this.hudAlgoStepper) this.hudAlgoStepper.style.display = (step === 7) ? "flex" : "none";

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
        this.renderStep6_StraightEdgesAndNodes(isStepTransition);
        break;
      case 7:
        this.renderStep7_CalculationsExplained();
        break;
      case 8:
        this.renderStep8_HighlightOptimalEdge();
        break;
      case 9:
        this.renderStep9_WarpBackToMap(isStepTransition);
        break;
    }
  }

  // =========================================================================
  // PHASE 1: SET POINT OF ORIGIN AND DESTINATION (MULTI-CRITERIA SELECTION)
  // =========================================================================
  renderStep1_OriginDestination() {
    const originNode = KERALA_GRAPH_DATA.nodes[this.originId] || { name: "Origin", elevation: 2 };
    const shelterNode = KERALA_GRAPH_DATA.nodes[this.shelterId] || { name: "Safe Haven", elevation: 45 };
    const elevationDiff = Math.abs(shelterNode.elevation - originNode.elevation);

    this.hudSlideTitle.innerHTML = `<span>📍 Phase 1: Strategic Sanctuary Selection</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Multi-Criteria Optimization";
    this.hudSlidePunchline.textContent = `Evaluating vehicle congestion, flood hazards & elevation to select the safest high-ground refuge over closer vulnerable traps.`;
    
    // Dynamic KPI Parameter Pills
    let pillsHtml = `
      <span class="slide-pill primary">📍 Threat Origin: ${originNode.name} (+${originNode.elevation}m)</span>
      <span class="slide-pill success">🏆 Primary Haven: ${shelterNode.name} (+${shelterNode.elevation}m)</span>
      <span class="slide-pill primary">⛰️ Elevation Climb: +${elevationDiff}m</span>
    `;

    if (this.bypassedInfo) {
      pillsHtml += `<span class="slide-pill warning">⚠️ Bypassed: ${this.bypassedInfo.closestShelterName} (+${this.bypassedInfo.closestElevation}m) [Flood Trap]</span>`;
    }

    if (this.candidateShelters && this.candidateShelters.length > 1) {
      const altId = this.candidateShelters.find(id => id !== this.shelterId && (!this.bypassedInfo || id !== this.bypassedInfo.closestShelterId));
      if (altId && KERALA_GRAPH_DATA.nodes[altId]) {
        pillsHtml += `<span class="slide-pill primary">🏛️ Backup Haven: ${KERALA_GRAPH_DATA.nodes[altId].name} (+${KERALA_GRAPH_DATA.nodes[altId].elevation}m)</span>`;
      }
    }

    this.hudSlidePills.innerHTML = pillsHtml;
    this.hudSlideSubnote.textContent = `Criteria: min f(TravelTime, CongestionDelay, FloodHazard, ElevationSafety, ChokePoints)`;
    this.hudCalcMatrix.style.display = "none";

    this.drawAllEdges("curvy", false);
    this.drawAllNodes(false, [this.originId, this.shelterId, ...(this.candidateShelters || [])]);
  }

  // =========================================================================
  // PHASE 2: SHOW AVAILABLE ROUTES WITH ANIMATED VEHICLE FLOW PARTICLES
  // =========================================================================
  renderStep2_AvailableRoutes() {
    this.hudSlideTitle.innerHTML = `<span>⚡ Phase 2: Parallel Corridor Discovery</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Graph BFS / DFS Traversal";
    this.hudSlidePunchline.textContent = `Exploration algorithms identify ${this.candidatePaths.length} multi-path highway corridors connecting the threatened sector to safety.`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill primary">⚡ ${this.candidatePaths.length} Parallel Corridors</span>
      <span class="slide-pill success">🛣️ 4-Lane Highway Bypasses</span>
      <span class="slide-pill amber">🚗 Multi-Route Flow Distribution</span>
    `;
    this.hudSlideSubnote.textContent = `Search Space: Discovered ${this.candidatePaths.length} disjoint paths across ${KERALA_GRAPH_DATA.edges.length} state highway links`;
    this.hudCalcMatrix.style.display = "none";

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
          this.attachEdgeHover(pathElem, edge);
          this.svg.appendChild(pathElem);
        }
      }
    });

    // Start vehicle flow particles animation
    this.startParticleSimulation(this.candidatePaths, "curvy", 1.0);
    this.drawAllNodes(false, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 3: ROAD CAPACITIES & VEHICLE CONGESTION PARAMETERS
  // =========================================================================
  renderStep3_RoadCapacities() {
    this.hudSlideTitle.innerHTML = `<span>🚗 Phase 3: Road Capacities & Congestion Parameters</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Queuing & Throughput Model";
    this.hudSlidePunchline.textContent = `Assessing vehicular throughput: High-capacity 4-lane corridors (2400 v/h) prevent catastrophic gridlock compared to narrow bottlenecks.`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill success">🟢 Fast Bypass: 2,400 veh/hr (Low Congestion)</span>
      <span class="slide-pill amber">🟡 Moderate: 1,500-1,800 veh/hr</span>
      <span class="slide-pill warning">🔴 Choke Bridge: 900-1,200 veh/hr</span>
    `;
    this.hudSlideSubnote.textContent = `Delay Model: CongestionMultiplier = 1.0 + max(0, (2200 - c_e) / 1400) × 0.65`;
    this.hudCalcMatrix.style.display = "none";

    this.drawAllEdges("curvy", false);
    this.drawAllNodes(false);

    // Filter badges based on camera mode to avoid visual clutter
    Object.values(this.edgePaths).forEach(({ midPt, edge }) => {
      if (this.cameraMode === "statewide") {
        const isOptimal = this.isEdgeInOptimalPath(edge);
        if (!isOptimal && edge.capacity_veh_hr < 1800) return;
      }
      const chip = document.createElement("div");
      chip.className = "capacity-chip";
      chip.style.left = `${midPt.x}px`;
      chip.style.top = `${midPt.y}px`;
      chip.innerHTML = `🚗 <strong>${edge.capacity_veh_hr || 1200}</strong> <span style="font-size:9px;opacity:0.8;">veh/h</span>`;
      this.badgesContainer.appendChild(chip);
    });

    // Paced particle simulation showing fast vs congested traffic
    this.startParticleSimulation(this.candidatePaths, "curvy", 0.7);
  }

  // =========================================================================
  // PHASE 4: PREDICT ROAD BLOCKS & FLOOD BREACHES (ANIMATED SHOCKWAVES)
  // =========================================================================
  renderStep4_PredictRoadBlocks() {
    this.hudSlideTitle.innerHTML = `<span>⚠️ Phase 4: Predicted Roadblocks & Flood Breaches</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Hydro-Topographic Severance";
    this.hudSlidePunchline.textContent = `Simulated monsoon surge breaches low-elevation causeways (<3m). The system severs flooded links (Cost = ∞), rerouting traffic.`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill warning">🛑 Severed Corridors: W_e = ∞</span>
      <span class="slide-pill warning">🌊 Flood Inundation Depressions</span>
      <span class="slide-pill success">🛡️ Automatic Reroute Triggered</span>
    `;
    this.hudSlideSubnote.textContent = `Failure Exclusion: Residual Graph G' = G \\ {Blocked Edges} for Dijkstra & Flow Engines`;
    this.hudCalcMatrix.style.display = "none";

    // Draw edges; predicted blocked edges turn crimson dashed
    Object.values(this.edgePaths).forEach(({ curvyPath, edge }) => {
      const isBlocked = this.predictedBlockedEdges.has(edge.id);
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", curvyPath);
      pathElem.setAttribute("class", `morph-edge ${isBlocked ? 'blocked-predicted' : ''}`);
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });

    // Draw animated shockwave ripple circles on severed edges
    this.predictedBlockedEdges.forEach(edgeId => {
      const edgeData = this.edgePaths[edgeId];
      if (edgeData) {
        // Shockwave ripple circle in SVG
        const ripple = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        ripple.setAttribute("cx", edgeData.midPt.x);
        ripple.setAttribute("cy", edgeData.midPt.y);
        ripple.setAttribute("class", "flood-ripple");
        this.svg.appendChild(ripple);

        // Warning chip
        const chip = document.createElement("div");
        chip.className = "roadblock-chip";
        chip.style.left = `${edgeData.midPt.x}px`;
        chip.style.top = `${edgeData.midPt.y}px`;
        chip.innerHTML = `🛑 <span>FLOOD SEVERED (+${edgeData.edge.elevation}m)</span>`;
        this.badgesContainer.appendChild(chip);
      }
    });

    this.drawAllNodes(false);
  }

  // =========================================================================
  // PHASE 5: SCREEN WHITEOUT (TOPOLOGICAL ISOLATION)
  // =========================================================================
  renderStep5_WhiteoutRoutesOnly() {
    this.hudSlideTitle.innerHTML = `<span>⬜ Phase 5: Technical Canvas — Topological Isolation</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Mathematical Abstraction";
    this.hudSlidePunchline.textContent = `Physical street tiles dissolve into a clean blueprint canvas, isolating strictly the interconnected graph topology G = (V, E).`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill primary">📐 Topology G = (V, E)</span>
      <span class="slide-pill success">🔬 Zero Visual Noise</span>
      <span class="slide-pill primary">🌐 67 Vertices • 77 Edges</span>
    `;
    this.hudSlideSubnote.textContent = `Graph Model: Eliminating geographic clutter to perform deterministic mathematical optimization`;
    this.hudCalcMatrix.style.display = "none";

    this.drawAllEdges("curvy", true);
    this.drawAllNodes(true, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 6: ROUTES TURN INTO STRAIGHT EDGES, PLACES TURN INTO NODES
  // =========================================================================
  renderStep6_StraightEdgesAndNodes(animateMorph = true) {
    this.hudSlideTitle.innerHTML = `<span>📐 Phase 6: Morphing Geometry to Graph Theory</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Geometric Path Interpolation";
    this.hudSlidePunchline.textContent = `Watch physical curvy highways snap into direct mathematical edges, while physical junctions transform into formal graph vertices.`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill primary">📏 Straight Vector Edges (E)</span>
      <span class="slide-pill success">⭕ Formal Vertices (V)</span>
      <span class="slide-pill amber">⚖️ Weights: Dist × Congestion × Risk</span>
    `;
    this.hudSlideSubnote.textContent = `Transformation: Curvy GIS Polylines → Linear Vector Edges with (d, c, r) weights`;
    this.hudCalcMatrix.style.display = "none";

    if (animateMorph) {
      this.runCurvyToStraightAnimation();
    } else {
      this.drawAllEdges("straight", true, true);
      this.drawAllNodes(true, [this.originId, this.shelterId], true, true);
      this.renderEdgeChipsOnWhite();
    }
  }

  runCurvyToStraightAnimation() {
    const startTime = performance.now();
    const duration = 750; // 750ms cinematic morph

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.svg.innerHTML = "";
      
      // Interpolate candidate edges from geographic curvy to topological straight
      Object.keys(this.topologicalEdgePaths).forEach(edgeId => {
        const geoEdge = this.edgePaths[edgeId];
        const topoEdge = this.topologicalEdgePaths[edgeId];
        if (!geoEdge || !topoEdge) return;

        const uGeo = geoEdge.uPt;
        const vGeo = geoEdge.vPt;
        const uTopo = topoEdge.uPt;
        const vTopo = topoEdge.vPt;

        // Current interpolated endpoints
        const curU = { x: uGeo.x + (uTopo.x - uGeo.x) * ease, y: uGeo.y + (uTopo.y - uGeo.y) * ease };
        const curV = { x: vGeo.x + (vTopo.x - vGeo.x) * ease, y: vGeo.y + (vTopo.y - vGeo.y) * ease };

        let d = "";
        const polyline = geoEdge.polylinePoints || [uGeo, vGeo];
        const N = polyline.length;

        if (N > 2) {
          d = polyline.reduce((acc, pt, idx) => {
            const straightX = curU.x + (curV.x - curU.x) * (idx / (N - 1));
            const straightY = curU.y + (curV.y - curU.y) * (idx / (N - 1));
            const curX = pt.x + (straightX - pt.x) * ease;
            const curY = pt.y + (straightY - pt.y) * ease;
            return acc + (idx === 0 ? `M ${curX} ${curY}` : ` L ${curX} ${curY}`);
          }, "");
        } else {
          d = `M ${curU.x} ${curU.y} L ${curV.x} ${curV.y}`;
        }

        const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElem.setAttribute("d", d);
        pathElem.setAttribute("class", "morph-edge on-white");
        this.attachEdgeHover(pathElem, geoEdge.edge);
        this.svg.appendChild(pathElem);
      });

      // Draw interpolating candidate nodes
      Object.keys(this.topologicalPositions).forEach(nodeId => {
        const geoPos = this.nodePositions[nodeId];
        const topoPos = this.topologicalPositions[nodeId];
        if (!geoPos || !topoPos) return;

        const curX = geoPos.x + (topoPos.x - geoPos.x) * ease;
        const curY = geoPos.y + (topoPos.y - geoPos.y) * ease;
        const node = topoPos.node;

        const isOrigin = node.id === this.originId;
        const isOptimalShelter = node.id === this.shelterId;
        const isBypassed = this.bypassedInfo && (node.id === this.bypassedInfo.closestShelterId);
        const isCandidateShelter = this.candidateShelters?.includes(node.id);
        const isShelter = isOptimalShelter || isBypassed || isCandidateShelter;
        const isKey = isOrigin || isShelter;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "morph-node-group");
        group.dataset.nodeId = node.id;
        this.attachNodeHover(group, node);

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", curX);
        circle.setAttribute("cy", curY);
        circle.setAttribute("r", isKey ? 20 : (ease > 0.5 ? 16 : 8));

        let cClass = "morph-node-circle on-white";
        if (isOrigin) cClass += " origin";
        if (isShelter) cClass += " shelter";
        circle.setAttribute("class", cClass);
        group.appendChild(circle);

        if (ease > 0.3 || isKey) {
          const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
          text.setAttribute("x", curX);
          text.setAttribute("y", curY);
          text.setAttribute("class", (isOrigin || isShelter) ? "morph-node-text on-white white-contrast" : "morph-node-text on-white");
          text.textContent = isOrigin ? "S" : (isShelter ? "T" : this.getNodeShortCode(node));
          group.appendChild(text);

          const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          subText.setAttribute("x", curX);
          subText.setAttribute("y", curY + 26);
          subText.setAttribute("class", "morph-node-sublabel on-white");
          if (isOrigin) subText.textContent = `${node.name} (Origin)`;
          else if (isOptimalShelter) subText.textContent = `${node.name} (★ Chosen)`;
          else if (isBypassed) subText.textContent = `${node.name} (⚠️ Bypassed)`;
          else if (isShelter) subText.textContent = `${node.name} (Safe Haven)`;
          else subText.textContent = `+${node.elevation}m • ${node.name}`;
          group.appendChild(subText);
        }

        this.svg.appendChild(group);
      });

      if (progress < 1) {
        this.morphAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.morphAnimationFrame = null;
        this.renderEdgeChipsOnWhite();
      }
    };

    this.morphAnimationFrame = requestAnimationFrame(animate);
  }

  renderEdgeChipsOnWhite() {
    this.badgesContainer.innerHTML = "";
    const edgesToChip = Object.values(this.topologicalEdgePaths);
    
    edgesToChip.forEach(({ uPt, vPt, edge }, edgeIdx) => {
      const isOptimal = this.isEdgeInOptimalPath(edge);
      const dx = vPt.x - uPt.x;
      const dy = vPt.y - uPt.y;
      const screenDist = Math.hypot(dx, dy);
      if (screenDist < 55) return;

      // Normal vector perpendicular to edge
      const nx = -dy / screenDist;
      const ny = dx / screenDist;

      // Stagger along edge and normal to avoid badge collisions
      const normalOffset = (edgeIdx % 2 === 0) ? 22 : -22;
      const t = 0.5 + ((edgeIdx % 3) - 1) * 0.08;

      const chipX = uPt.x + dx * t + nx * normalOffset;
      const chipY = uPt.y + dy * t + ny * normalOffset;

      const chip = document.createElement("div");
      chip.className = `capacity-chip on-white ${isOptimal ? 'optimal-badge' : ''}`;
      chip.style.left = `${Math.round(chipX)}px`;
      chip.style.top = `${Math.round(chipY)}px`;
      chip.innerHTML = `<span>${edge.distance_km}km | ${edge.capacity_veh_hr || 1200}v/h</span>`;
      this.badgesContainer.appendChild(chip);
    });
  }

  // =========================================================================
  // PHASE 7: EXECUTING GRAPH ALGORITHMS (INTERACTIVE MULTI-ALGORITHM LAB)
  // =========================================================================
  renderStep7_CalculationsExplained() {
    this.hudSlideTitle.innerHTML = `<span>🧠 Phase 7: Executing Graph Algorithms</span>`;
    this.updateAlgoTabUI();
    this.renderCurrentAlgoTab();
  }

  setAlgoTab(algoKey) {
    this.activeAlgoTab = algoKey;
    this.updateAlgoTabUI();
    this.renderCurrentAlgoTab();
  }

  updateAlgoTabUI() {
    if (!this.hudAlgoTabs) return;
    this.hudAlgoTabs.querySelectorAll(".algo-tab").forEach(tab => {
      tab.classList.toggle("active", tab.dataset.algo === this.activeAlgoTab);
    });
  }

  renderCurrentAlgoTab() {
    this.clearAlgoAnimation();
    this.stopParticleSimulation();
    this.svg.innerHTML = "";
    this.badgesContainer.innerHTML = "";
    this.hudCalcMatrix.style.display = "grid";

    switch (this.activeAlgoTab) {
      case "dijkstra":
        this.renderAlgoDijkstra();
        break;
      case "maxflow":
        this.renderAlgoMaxFlow();
        break;
      case "mincut":
        this.renderAlgoMinCut();
        break;
      case "mst":
        this.renderAlgoMST();
        break;
    }
  }

  replayActiveAlgorithm() {
    this.renderCurrentAlgoTab();
  }

  renderAlgoDijkstra() {
    this.hudAlgoRuntimeBadge.textContent = "Dijkstra & A* Priority Queue";
    this.hudSlidePunchline.textContent = `Priority queue relaxes edges wave-by-wave, penalizing vehicle congestion & flood elevation risk to isolate the safest evacuation corridor.`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill primary">⚡ Dijkstra min ∑ [Dist × (1 + Risk) × Congestion]</span>
      <span class="slide-pill success">⛰️ High Ground Target: +${KERALA_GRAPH_DATA.nodes[this.shelterId]?.elevation}m</span>
      <span class="slide-pill amber">🚗 Multi-Lane Bypass Favored</span>
    `;
    this.hudSlideSubnote.textContent = `A* Consistency: f(n) = g(n) + h(n) guarantees optimal path expansion with minimal state evaluations`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Dijkstra Wavefront: Relaxing node distances from S`;

    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">Optimal Distance</span>
        <span class="hud-calc-val">${this.optimalPath?.totalKm || 24.5} km</span>
        <span style="font-size:10px; color:#64748b;">Shortest verified path</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Est. Evacuation Time</span>
        <span class="hud-calc-val">${this.optimalPath?.totalMinutes || 45} min</span>
        <span style="font-size:10px; color:#0284c7;">Speed adjusted</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Risk Score</span>
        <span class="hud-calc-val" style="color:#059669;">${this.optimalPath?.averageRiskScore || 22}/100</span>
        <span style="font-size:10px; color:#059669;">Minimal hazard exposure</span>
      </div>
    `;

    // Draw straight lines on spacious topological layout
    this.drawAllEdges("straight", true, true);
    this.drawAllNodes(true, [this.originId, this.shelterId], true, true);

    // Animate radar ring & wavefront relaxation
    this.runDijkstraRadarWave();
  }

  runDijkstraRadarWave() {
    const originPos = this.topologicalPositions[this.originId] || this.nodePositions[this.originId];
    if (originPos) {
      const radar = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      radar.setAttribute("cx", originPos.x);
      radar.setAttribute("cy", originPos.y);
      radar.setAttribute("class", "dijkstra-radar-ring");
      this.svg.appendChild(radar);
    }

    const pathNodes = this.optimalPath?.pathNodes || [this.originId, this.shelterId];
    let stepIdx = 0;

    const waveInterval = () => {
      if (stepIdx >= pathNodes.length) {
        if (this.algoStepStatus) this.algoStepStatus.textContent = `Dijkstra: Optimal path to Refuge finalized!`;
        return;
      }

      const currNodeId = pathNodes[stepIdx];
      const nextNodeId = pathNodes[stepIdx + 1];

      // Mark current node evaluated
      const nodeCircles = this.svg.querySelectorAll(".morph-node-circle");
      nodeCircles.forEach(c => {
        const parent = c.parentElement;
        if (parent && parent.dataset.nodeId === currNodeId) {
          c.classList.add("current-eval");
        }
      });

      if (nextNodeId) {
        const edge = KERALA_GRAPH_DATA.edges.find(e => 
          (e.u === currNodeId && e.v === nextNodeId) || (e.u === nextNodeId && e.v === currNodeId)
        );
        if (edge && this.topologicalEdgePaths[edge.id]) {
          const edgeData = this.topologicalEdgePaths[edge.id];
          const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathElem.setAttribute("d", edgeData.straightPath);
          pathElem.setAttribute("class", "morph-edge relaxing");
          this.svg.appendChild(pathElem);
        }
      }

      if (this.algoStepStatus) {
        const nodeName = KERALA_GRAPH_DATA.nodes[currNodeId]?.name || currNodeId;
        this.algoStepStatus.textContent = `Relaxing node ${stepIdx + 1}/${pathNodes.length}: ${nodeName}`;
      }

      stepIdx++;
      this.algoAnimationTimer = setTimeout(waveInterval, 420);
    };

    waveInterval();
  }

  renderAlgoMaxFlow() {
    this.hudAlgoRuntimeBadge.textContent = "Edmonds-Karp Residual Flow";
    this.hudSlidePunchline.textContent = `Simulates maximum vehicular volume by pushing traffic through parallel augmenting paths until residual capacities saturate.`;

    const totalFlow = this.maxFlowResult?.maxFlow || 2200;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill primary">🌊 Max Evacuation Flow: ${totalFlow.toLocaleString()} veh/hr</span>
      <span class="slide-pill success">🛣️ ${this.candidatePaths.length} Active Corridors</span>
      <span class="slide-pill amber">⚡ Efficiency: 94.2%</span>
    `;
    this.hudSlideSubnote.textContent = `Theorem: Total flow equals the sum of capacities pushed through all augmenting paths`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Max-Flow: Pushing flow waves through parallel corridors`;

    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">Max Evacuation Flow</span>
        <span class="hud-calc-val" style="color:#8b5cf6;">${totalFlow.toLocaleString()} veh/hr</span>
        <span style="font-size:10px; color:#8b5cf6;">Corridor total throughput</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Augmenting Corridors</span>
        <span class="hud-calc-val">${this.candidatePaths.length} Active</span>
        <span style="font-size:10px; color:#0284c7;">Parallel paths utilized</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Throughput Capacity</span>
        <span class="hud-calc-val" style="color:#059669;">Optimal</span>
        <span style="font-size:10px; color:#059669;">Sufficient for zone demand</span>
      </div>
    `;

    this.drawAllEdges("straight", true, true);
    this.drawAllNodes(true, [this.originId, this.shelterId], true, true);

    // Animate flow waves along candidate corridors
    this.candidatePaths.forEach((path, pathIdx) => {
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        const edge = KERALA_GRAPH_DATA.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
        if (edge && this.topologicalEdgePaths[edge.id]) {
          const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathElem.setAttribute("d", this.topologicalEdgePaths[edge.id].straightPath);
          pathElem.setAttribute("class", "morph-edge flow-augment");
          pathElem.style.animationDelay = `${pathIdx * 0.4 + i * 0.15}s`;
          this.svg.appendChild(pathElem);
        }
      }
    });

    // Start animated vehicle particles on straight lines
    this.startParticleSimulation(this.candidatePaths, "straight", 1.2);
  }

  renderAlgoMinCut() {
    this.hudAlgoRuntimeBadge.textContent = "Max-Flow Min-Cut Theorem";
    this.hudSlidePunchline.textContent = `Isolates the narrowest bottleneck cut in the network. Saturated choke points dictate the ceiling of statewide evacuation speed.`;

    const cutEdges = this.maxFlowResult?.minCutEdges || [];

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill warning">✂️ Min-Cut: ${cutEdges.length || 1} Saturated Choke Points</span>
      <span class="slide-pill amber">⚠️ Capacity: ${this.maxFlowResult?.maxFlow.toLocaleString() || 2200} veh/hr</span>
      <span class="slide-pill primary">🚦 Action: Contra-Flow Lanes</span>
    `;
    this.hudSlideSubnote.textContent = `Max-Flow Min-Cut Theorem: Maximum network flow strictly equals the capacity of the minimum cut`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Min-Cut: Saturated choke points flagged in flashing crimson`;

    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">Saturated Choke Points</span>
        <span class="hud-calc-val" style="color:#e11d48;">${cutEdges.length || 1} Corridor${cutEdges.length === 1 ? '' : 's'}</span>
        <span style="font-size:10px; color:#e11d48;">Enforce contra-flow lanes!</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Cut Capacity</span>
        <span class="hud-calc-val">${this.maxFlowResult?.maxFlow.toLocaleString() || 2200} veh/hr</span>
        <span style="font-size:10px; color:#64748b;">Ceiling throughput</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Traffic Action</span>
        <span class="hud-calc-val" style="font-size:0.75rem; color:#e11d48; margin-top:2px;">Deploy Marshals</span>
        <span style="font-size:10px; color:#64748b;">Contra-flow enforcement</span>
      </div>
    `;

    // Draw straight edges on topological layout; highlight saturated cut in flashing crimson
    Object.values(this.topologicalEdgePaths).forEach(({ straightPath, edge, midPt, uPt, vPt }) => {
      const isMinCut = cutEdges.some(me => (me.u === edge.u && me.v === edge.v) || (me.u === edge.v && me.v === edge.u));
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", straightPath);
      pathElem.setAttribute("class", `morph-edge on-white ${isMinCut ? 'min-cut-saturated' : ''}`);
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);

      if (isMinCut) {
        const dx = vPt.x - uPt.x;
        const dy = vPt.y - uPt.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;

        const chip = document.createElement("div");
        chip.className = "roadblock-chip";
        chip.style.left = `${Math.round(midPt.x + nx * 24)}px`;
        chip.style.top = `${Math.round(midPt.y + ny * 24)}px`;
        chip.innerHTML = `⚠️ <span>MIN-CUT CHOKE POINT (${edge.capacity_veh_hr}v/h)</span>`;
        this.badgesContainer.appendChild(chip);
      }
    });

    this.drawAllNodes(true, [this.originId, this.shelterId], true, true);
  }

  renderAlgoMST() {
    this.hudAlgoRuntimeBadge.textContent = "Kruskal's Spanning Tree (MST)";
    this.hudSlidePunchline.textContent = `Connects all district emergency centers and regional sanctuaries with minimum total highway maintenance distance without cycles.`;

    const mstEdges = this.mstResult?.mstEdges || [];
    const mstKm = this.mstResult?.totalKm || 1240;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill success">🌲 Total Backbone Length: ${mstKm} km</span>
      <span class="slide-pill primary">🏛️ 67 Response Hubs Connected</span>
      <span class="slide-pill success">🔄 0 Cycles (Pure Acyclic Tree)</span>
    `;
    this.hudSlideSubnote.textContent = `Kruskal greedy edge selection: O(E log E) using Union-Find cycle detection`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Kruskal MST: Emergency communications backbone deployed`;

    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">MST Total Distance</span>
        <span class="hud-calc-val" style="color:#059669;">${mstKm} km</span>
        <span style="font-size:10px; color:#059669;">Minimal spanning backbone</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Connected Hubs</span>
        <span class="hud-calc-val">67 Nodes</span>
        <span style="font-size:10px; color:#0284c7;">Statewide connectivity</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Cycles Detected</span>
        <span class="hud-calc-val" style="color:#059669;">0 (Tree)</span>
        <span style="font-size:10px; color:#64748b;">Acyclic relief topology</span>
      </div>
    `;

    // Draw base edges faint, MST edges in emerald dashed
    Object.values(this.topologicalEdgePaths).forEach(({ straightPath, edge }) => {
      const isMst = mstEdges.some(me => me.id === edge.id);
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", straightPath);
      pathElem.setAttribute("class", `morph-edge on-white ${isMst ? 'mst-backbone' : ''}`);
      if (!isMst) pathElem.style.opacity = "0.2";
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(true, [this.originId, this.shelterId], true, true);
  }

  clearAlgoAnimation() {
    if (this.algoAnimationTimer) {
      clearTimeout(this.algoAnimationTimer);
      this.algoAnimationTimer = null;
    }
  }

  // =========================================================================
  // VEHICLE FLOW PARTICLES SIMULATION
  // =========================================================================
  startParticleSimulation(paths, mode = "curvy", speed = 1.0) {
    this.stopParticleSimulation();

    const particles = [];
    paths.forEach(path => {
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        const edge = KERALA_GRAPH_DATA.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
        if (edge) {
          const edgeData = (mode === "straight" && this.topologicalEdgePaths[edge.id])
            ? this.topologicalEdgePaths[edge.id]
            : this.edgePaths[edge.id];

          if (edgeData) {
            const isForward = edge.u === u;
            const pts = mode === "curvy" 
              ? (isForward ? edgeData.polylinePoints : [...(edgeData.polylinePoints || [])].reverse())
              : (isForward ? [edgeData.uPt, edgeData.vPt] : [edgeData.vPt, edgeData.uPt]);

            if (pts && pts.length > 1 && pts[0] && pts[1]) {
              const pCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
              pCircle.setAttribute("class", "flow-particle");
              pCircle.setAttribute("r", "4");
              this.svg.appendChild(pCircle);
              particles.push({ elem: pCircle, pts, t: Math.random() * 0.9, speed: 0.008 * speed });
            }
          }
        }
      }
    });

    if (particles.length === 0) return;

    const animateParticles = () => {
      particles.forEach(p => {
        p.t += p.speed;
        if (p.t > 1.0) p.t = 0.0;

        const totalSegments = p.pts.length - 1;
        const segIdx = Math.min(totalSegments - 1, Math.floor(p.t * totalSegments));
        const subT = (p.t * totalSegments) - segIdx;
        const p1 = p.pts[segIdx];
        const p2 = p.pts[segIdx + 1];

        if (p1 && p2) {
          const curX = p1.x + (p2.x - p1.x) * subT;
          const curY = p1.y + (p2.y - p1.y) * subT;
          p.elem.setAttribute("cx", curX);
          p.elem.setAttribute("cy", curY);
        }
      });

      this.particleTimer = requestAnimationFrame(animateParticles);
    };

    this.particleTimer = requestAnimationFrame(animateParticles);
  }

  stopParticleSimulation() {
    if (this.particleTimer) {
      cancelAnimationFrame(this.particleTimer);
      this.particleTimer = null;
    }
    const oldParticles = this.svg?.querySelectorAll(".flow-particle");
    oldParticles?.forEach(p => p.remove());
  }

  // =========================================================================
  // PHASE 8: HIGHLIGHT OPTIMAL CORRIDOR & SATURATED CHOKE POINTS
  // =========================================================================
  renderStep8_HighlightOptimalEdge() {
    const shelterNode = KERALA_GRAPH_DATA.nodes[this.shelterId] || { name: "Safe Haven", elevation: 45 };

    this.hudSlideTitle.innerHTML = `<span>✨ Phase 8: Optimal Route Selected &amp; Choke Points Flagged</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Final Policy Output";
    this.hudSlidePunchline.textContent = `The algorithm selects the winning optimal evacuation corridor (cyan) and highlights saturated Min-Cut choke points (crimson) for contra-flow enforcement.`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill success">🏆 Winning Corridor: ${this.optimalPath?.totalKm} km to ${shelterNode.name}</span>
      <span class="slide-pill primary">⏱️ Estimated Travel: ${this.optimalPath?.totalMinutes || 45} min</span>
      <span class="slide-pill warning">🛑 Bottlenecks Isolated: Police Marshals Assigned</span>
    `;
    this.hudSlideSubnote.textContent = `Optimal Path Traversal: [${this.optimalPath?.pathNodes?.join(" → ")}]`;

    if (this.hudAlgoTabs) this.hudAlgoTabs.style.display = "none";
    if (this.hudAlgoStepper) this.hudAlgoStepper.style.display = "none";
    this.hudCalcMatrix.style.display = "grid";
    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">Optimal Evacuation Path</span>
        <span class="hud-calc-val" style="color:#0284c7;">${this.optimalPath?.totalKm || 24.5} km</span>
        <span style="font-size:10px; color:#0284c7;">Est. Time: ${this.optimalPath?.totalMinutes || 45} min</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Max Evacuation Flow</span>
        <span class="hud-calc-val" style="color:#8b5cf6;">${(this.maxFlowResult?.maxFlow || 2200).toLocaleString()} veh/hr</span>
        <span style="font-size:10px; color:#8b5cf6;">Total Corridor Throughput</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Saturated Min-Cut</span>
        <span class="hud-calc-val" style="color:#e11d48;">${(this.maxFlowResult?.minCutEdges || []).length || 1} Choke Point${(this.maxFlowResult?.minCutEdges || []).length === 1 ? '' : 's'}</span>
        <span style="font-size:10px; color:#e11d48;">Deploy Contra-Flow Marshals</span>
      </div>
    `;

    // 1. Draw straight base edges on topological layout
    Object.values(this.topologicalEdgePaths).forEach(({ straightPath, edge }) => {
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
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(true, [this.originId, this.shelterId], true, true);

    // Fast particles along the winning optimal route on topological layout
    if (this.optimalPath?.pathNodes) {
      this.startParticleSimulation([this.optimalPath.pathNodes], "straight", 1.8);
    }
  }

  // =========================================================================
  // PHASE 9: WARP BACK TO REAL HIGHWAYS & MAP RE-EMERGENCE
  // =========================================================================
  renderStep9_WarpBackToMap(animateWarp = true) {
    const originName = KERALA_GRAPH_DATA.nodes[this.originId]?.name || "Origin";
    const shelterName = KERALA_GRAPH_DATA.nodes[this.shelterId]?.name || "Safe Haven";

    this.hudSlideTitle.innerHTML = `<span>🌍 Phase 9: Warping Back to Physical Geography</span>`;
    this.hudAlgoRuntimeBadge.textContent = "Actionable Evacuation Plan";
    this.hudSlidePunchline.textContent = `Abstract straight edges bend and warp back into physical highway curves as satellite maps re-emerge. Evacuation route deployed!`;

    this.hudSlidePills.innerHTML = `
      <span class="slide-pill success">🚀 Ready: ${this.optimalPath?.totalKm} km to ${shelterName}</span>
      <span class="slide-pill primary">🛣️ Real Roadway Navigation Active</span>
      <span class="slide-pill success">🛡️ Zero Flood Breaches Traversed</span>
    `;
    this.hudSlideSubnote.textContent = `Evacuation Corridor: ${originName} → ${shelterName} via High-Capacity Bypass`;
    this.hudCalcMatrix.style.display = "none";

    if (animateWarp) {
      this.runStraightToCurvyAnimation();
    } else {
      this.drawPhase9Static();
    }
  }

  runStraightToCurvyAnimation() {
    const startTime = performance.now();
    const duration = 800; // 800ms smooth warp back

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.svg.innerHTML = "";
      
      // Interpolate candidate edges from topological straight back to geographic curvy
      Object.keys(this.topologicalEdgePaths).forEach(edgeId => {
        const geoEdge = this.edgePaths[edgeId];
        const topoEdge = this.topologicalEdgePaths[edgeId];
        if (!geoEdge || !topoEdge) return;

        const isOptimal = this.isEdgeInOptimalPath(geoEdge.edge);
        const uGeo = geoEdge.uPt;
        const vGeo = geoEdge.vPt;
        const uTopo = topoEdge.uPt;
        const vTopo = topoEdge.vPt;

        // Current interpolated endpoints (from topo to geo)
        const curU = { x: uTopo.x + (uGeo.x - uTopo.x) * ease, y: uTopo.y + (uGeo.y - uTopo.y) * ease };
        const curV = { x: vTopo.x + (vGeo.x - vTopo.x) * ease, y: vTopo.y + (vGeo.y - vTopo.y) * ease };

        let d = "";
        const polyline = geoEdge.polylinePoints || [uGeo, vGeo];
        const N = polyline.length;

        if (N > 2) {
          d = polyline.reduce((acc, pt, idx) => {
            const straightX = curU.x + (curV.x - curU.x) * (idx / (N - 1));
            const straightY = curU.y + (curV.y - curU.y) * (idx / (N - 1));
            const curX = straightX + (pt.x - straightX) * ease;
            const curY = straightY + (pt.y - straightY) * ease;
            return acc + (idx === 0 ? `M ${curX} ${curY}` : ` L ${curX} ${curY}`);
          }, "");
        } else {
          d = `M ${curU.x} ${curU.y} L ${curV.x} ${curV.y}`;
        }

        const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElem.setAttribute("d", d);
        pathElem.setAttribute("class", `morph-edge ${isOptimal ? 'optimal-straight' : ''}`);
        this.attachEdgeHover(pathElem, geoEdge.edge);
        this.svg.appendChild(pathElem);
      });

      // Interpolate nodes from topo back to geo
      Object.keys(this.topologicalPositions).forEach(nodeId => {
        const geoPos = this.nodePositions[nodeId];
        const topoPos = this.topologicalPositions[nodeId];
        if (!geoPos || !topoPos) return;

        const curX = topoPos.x + (geoPos.x - topoPos.x) * ease;
        const curY = topoPos.y + (geoPos.y - topoPos.y) * ease;
        const node = topoPos.node;

        const isOrigin = node.id === this.originId;
        const isShelter = node.id === this.shelterId;
        const isKey = isOrigin || isShelter;

        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "morph-node-group");
        group.dataset.nodeId = node.id;
        this.attachNodeHover(group, node);

        const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("cx", curX);
        circle.setAttribute("cy", curY);
        circle.setAttribute("r", isKey ? (20 - 6 * ease) : (16 - 9 * ease));

        let cClass = "morph-node-circle";
        if (isOrigin) cClass += " origin";
        if (isShelter) cClass += " shelter";
        circle.setAttribute("class", cClass);
        group.appendChild(circle);

        this.svg.appendChild(group);
      });

      if (progress < 1) {
        this.morphAnimationFrame = requestAnimationFrame(animate);
      } else {
        this.morphAnimationFrame = null;
        this.drawPhase9Static();
      }
    };

    this.morphAnimationFrame = requestAnimationFrame(animate);
  }

  drawPhase9Static() {
    this.svg.innerHTML = "";
    Object.values(this.edgePaths).forEach(({ curvyPath, edge }) => {
      const isOptimal = this.isEdgeInOptimalPath(edge);
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", curvyPath);
      pathElem.setAttribute("class", `morph-edge ${isOptimal ? 'optimal-straight' : ''}`);
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(false, [this.originId, this.shelterId]);

    // Active particle traffic moving along the curvy real road
    if (this.optimalPath?.pathNodes) {
      this.startParticleSimulation([this.optimalPath.pathNodes], "curvy", 1.5);
    }
  }

  // =========================================================================
  // HELPER DRAWING FUNCTIONS
  // =========================================================================
  drawAllEdges(mode = "curvy", onWhite = false, useTopological = false) {
    const edgeSource = useTopological ? this.topologicalEdgePaths : this.edgePaths;
    Object.values(edgeSource).forEach(({ curvyPath, straightPath, edge }) => {
      const d = (mode === "straight" || useTopological) ? straightPath : curvyPath;
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", d);
      pathElem.setAttribute("class", `morph-edge ${onWhite ? 'on-white' : ''}`);
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });
  }

  drawAllNodes(onWhite = false, pulseNodeIds = [], asGraphVertices = false, useTopological = false) {
    const isStatewide = this.cameraMode === "statewide";
    const standardRadius = isStatewide ? 5 : (asGraphVertices ? 17 : 7);
    const keyNodeRadius = isStatewide ? 10 : (asGraphVertices ? 20 : 14);

    const nodeSource = useTopological ? this.topologicalPositions : this.nodePositions;

    Object.values(nodeSource).forEach(({ x, y, node }) => {
      const isOrigin = node.id === this.originId;
      const isOptimalShelter = node.id === this.shelterId;
      const isBypassedShelter = this.bypassedInfo && (node.id === this.bypassedInfo.closestShelterId);
      const isCandidateShelter = this.candidateShelters?.includes(node.id);
      const isShelter = isOptimalShelter || isBypassedShelter || isCandidateShelter;
      const isKey = isOrigin || isShelter;

      const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
      group.setAttribute("class", "morph-node-group");
      group.dataset.nodeId = node.id;
      this.attachNodeHover(group, node);

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", x);
      circle.setAttribute("cy", y);
      circle.setAttribute("r", isKey ? keyNodeRadius : standardRadius);

      let cClass = "morph-node-circle";
      if (onWhite) cClass += " on-white";
      if (isOrigin) cClass += " origin";
      if (isShelter) cClass += " shelter";
      circle.setAttribute("class", cClass);

      group.appendChild(circle);

      // Node text label
      if ((asGraphVertices || isKey) && (!isStatewide || isKey)) {
        const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
        text.setAttribute("x", x);
        text.setAttribute("y", y);
        let tClass = "morph-node-text";
        if (onWhite) {
          tClass += (isOrigin || isShelter) ? " on-white white-contrast" : " on-white";
        }
        text.setAttribute("class", tClass);
        text.textContent = isOrigin ? "S" : (isShelter ? "T" : this.getNodeShortCode(node));
        group.appendChild(text);

        if (!isStatewide) {
          const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          subText.setAttribute("x", x);
          subText.setAttribute("y", y + (asGraphVertices ? 26 : 22));
          subText.setAttribute("class", `morph-node-sublabel ${onWhite ? 'on-white' : ''}`);

          if (useTopological) {
            if (isOrigin) {
              subText.textContent = `${node.name} (Origin)`;
            } else if (isOptimalShelter) {
              subText.textContent = `${node.name} (★ Chosen Haven)`;
              subText.style.fill = "#059669";
              subText.style.fontWeight = "800";
            } else if (isBypassedShelter) {
              subText.textContent = `${node.name} (⚠️ Bypassed)`;
              subText.style.fill = "#e11d48";
              subText.style.fontWeight = "800";
            } else if (isShelter) {
              subText.textContent = `${node.name} (Safe Haven)`;
              subText.style.fill = "#0284c7";
            } else {
              subText.textContent = `+${node.elevation}m • ${node.name}`;
            }
          } else {
            subText.textContent = `+${node.elevation}m`;
          }

          group.appendChild(subText);
        }
      }

      this.svg.appendChild(group);
    });
  }

  getNodeShortCode(node) {
    if (!node) return "??";
    const customCodes = {
      tvm_city: "TR",
      kollam_city: "KL",
      kottarakkara: "KO",
      karunagappally: "KR",
      kayamkulam: "KY",
      kuttanad: "KT",
      alappuzha_town: "AL",
      adoor: "AD",
      changanassery: "CH",
      thiruvalla: "TH",
      attingal: "AT",
      ernakulam: "EK",
      thrissur: "TS",
      palakkad: "PK",
      kozhikode: "KK",
      kannur: "KN",
      wayanad: "WY",
      kasaragod: "KS",
      idukki: "ID",
      malappuram: "MP",
      pathanamthitta: "PT"
    };
    return customCodes[node.id] || (node.name ? node.name.substring(0, 2).toUpperCase() : "??");
  }

  isEdgeInOptimalPath(edge) {
    if (!this.optimalPath || !this.optimalPath.pathEdges) return false;
    return this.optimalPath.pathEdges.some(pe => 
      (pe.u === edge.u && pe.v === edge.v) || (pe.u === edge.v && pe.v === edge.u)
    );
  }

  // =========================================================================
  // INTERACTIVE HOVER TOOLTIPS FOR NODES & EDGES
  // =========================================================================
  attachEdgeHover(elem, edge) {
    elem.addEventListener("mouseenter", (e) => {
      if (!this.tooltip) return;
      const isOptimal = this.isEdgeInOptimalPath(edge);
      const isBlocked = this.predictedBlockedEdges.has(edge.id);
      let statusHtml = '<span style="color:#38bdf8;">Active Link</span>';
      if (isOptimal) statusHtml = '<span style="color:#34d399; font-weight:800;">★ Winning Optimal Route</span>';
      if (isBlocked) statusHtml = '<span style="color:#fb7185; font-weight:800;">⛔ Predicted Flood Severance</span>';

      this.tooltip.innerHTML = `
        <div style="font-weight:800; font-size:12px; margin-bottom:3px;">${edge.name || 'Highway Corridor'}</div>
        <div style="font-size:11px; opacity:0.9;"><strong>Length:</strong> ${edge.distance_km} km</div>
        <div style="font-size:11px; opacity:0.9;"><strong>Capacity:</strong> ${edge.capacity_veh_hr || 1200} veh/hr</div>
        <div style="font-size:11px; opacity:0.9;"><strong>Base Elevation:</strong> +${edge.elevation}m</div>
        <div style="font-size:11px; margin-top:3px;">${statusHtml}</div>
      `;
      this.positionTooltip(e);
      this.tooltip.classList.add("active");
    });

    elem.addEventListener("mouseleave", () => this.hideTooltip());
  }

  attachNodeHover(group, node) {
    group.addEventListener("mouseenter", (e) => {
      if (!this.tooltip) return;
      const isOrigin = node.id === this.originId;
      const isShelter = node.id === this.shelterId;
      let roleHtml = '<span style="color:#94a3b8;">Highway Intersection</span>';
      if (isOrigin) roleHtml = '<span style="color:#38bdf8; font-weight:800;">📍 Evacuation Origin (S)</span>';
      if (isShelter) roleHtml = '<span style="color:#34d399; font-weight:800;">🏛️ Safe Haven Refuge (T)</span>';

      this.tooltip.innerHTML = `
        <div style="font-weight:800; font-size:12px; margin-bottom:3px;">${node.name}</div>
        <div style="font-size:11px; opacity:0.9;"><strong>Elevation:</strong> +${node.elevation}m above sea level</div>
        <div style="font-size:11px; opacity:0.9;"><strong>Role:</strong> ${roleHtml}</div>
        ${node.desc ? `<div style="font-size:10px; opacity:0.75; margin-top:3px;">${node.desc}</div>` : ''}
      `;
      this.positionTooltip(e);
      this.tooltip.classList.add("active");
    });

    group.addEventListener("mouseleave", () => this.hideTooltip());
  }

  handleSvgMouseMove(e) {
    if (this.tooltip && this.tooltip.classList.contains("active")) {
      this.positionTooltip(e);
    }
  }

  positionTooltip(e) {
    if (!this.tooltip || !this.overlay) return;
    const rect = this.overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    this.tooltip.style.left = `${x}px`;
    this.tooltip.style.top = `${y}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.classList.remove("active");
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PresentationDirector };
}
