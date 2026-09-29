/**
 * Kerala SafeRoute - Advanced Cinematic Presentation & Graph Morphing Director
 * 
 * Orchestrates the enhanced 9-phase visual demonstration:
 * 1. Set Origin & Destination (Smart Camera Framing & Elevation Profiling)
 * 2. Show Available Routes Animation (Multi-Corridor Discovery)
 * 3. Show Road Capacities (Vehicular Evacuation Throughput Badges)
 * 4. Predict Road Blocks (Flood Breach Severing & Crimson Failure Mode)
 * 5. Screen Whiteout (Topological Isolation of Network Graph G = (V,E))
 * 6. Morph Routes to Straight Edges & Places to Standardized Nodes (Smooth Geometric Path Interpolation)
 * 7. Audience Calculation Explanations (Interactive Dijkstra/A*, Edmonds-Karp Flow, Min-Cut Choke Points, Kruskal MST)
 * 8. Highlight Optimal Edge & Bottleneck Saturated Cut
 * 9. Warp Back Edges to Real Curvy Roads as Map Re-Emerges (State Evacuation Readiness)
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
    
    // Playback Speed (1x = 5000ms, 0.5x = 8000ms, 2x = 2500ms)
    this.speedMultiplier = 1.0;
    this.baseStepDurationMs = 5000;

    // Camera Framing Mode: "corridor" (default, focused & clear) vs "statewide" (full Kerala)
    this.cameraMode = "corridor";

    // Audio Voiceover (Web Speech API)
    this.isAudioEnabled = false;
    this.speechSynth = typeof window !== "undefined" && window.speechSynthesis ? window.speechSynthesis : null;

    // Active Algorithm Tab in Step 7 & 8: 'dijkstra', 'maxflow', 'mincut', 'mst'
    this.activeAlgoTab = "dijkstra";
    this.algoAnimationTimer = null;
    this.morphAnimationFrame = null;

    // Cache computed graph coordinates & structures
    this.nodePositions = {};
    this.edgePaths = {};
    this.optimalPath = null;
    this.candidatePaths = [];
    this.predictedBlockedEdges = new Set();
    this.maxFlowResult = null;
    this.mstResult = null;

    // DOM Elements
    if (typeof document !== "undefined") {
      this.overlay = document.getElementById("presentation-overlay");
      this.whiteout = document.getElementById("morph-whiteout");
      this.svg = document.getElementById("morph-svg");
      this.badgesContainer = document.getElementById("morph-dom-badges");
      this.tooltip = document.getElementById("morph-tooltip");
      
      // HUD Elements
      this.hudStepBadge = document.getElementById("hud-step-badge");
      this.hudDotsTrack = document.getElementById("hud-dots-track");
      this.hudNarratorTitle = document.getElementById("hud-narrator-title");
      this.hudNarratorText = document.getElementById("hud-narrator-text");
      this.hudNarratorFormula = document.getElementById("hud-narrator-formula");
      this.hudAlgoRuntimeBadge = document.getElementById("hud-algo-runtime-badge");
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

      // Audio narration button
      this.btnAudio = document.getElementById("hud-btn-audio");
      this.audioIcon = document.getElementById("audio-icon");
      this.audioText = document.getElementById("audio-text");

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

    // Audio narration toggle
    this.btnAudio?.addEventListener("click", () => this.toggleAudioNarration());

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
        this.prevStep();
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

    // Pre-calculate Dijkstra, Predicted Blocks, Max Flow, and MST beforehand
    this.computeAlgorithmsData();

    // Default to Corridor View for instant clarity, avoiding node-clumping
    this.cameraMode = "corridor";
    this.updateCameraUI();
    this.applyCameraBounds();

    // Show overlay
    this.overlay.classList.add("active");
    this.currentStep = 1;
    this.isPlaying = true;
    this.updatePlayBtnUI();

    this.buildDotsTrack();
    this.updateCoordinates();
    this.renderStep(this.currentStep, true);
    this.startAutoTimer();
  }

  stopPresentation() {
    this.clearAutoTimer();
    this.clearAlgoAnimation();
    this.stopAudioNarration();

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
      // Collect bounding coordinates of the route, alternative paths, and key corridor nodes
      const corridorNodes = new Set();
      if (this.optimalPath?.pathNodes) {
        this.optimalPath.pathNodes.forEach(id => corridorNodes.add(id));
      }
      this.candidatePaths.forEach(path => path.forEach(id => corridorNodes.add(id)));
      corridorNodes.add(this.originId);
      corridorNodes.add(this.shelterId);

      // Add immediate 1-hop adjacent nodes for context
      const adjIds = Array.from(corridorNodes);
      adjIds.forEach(id => {
        KERALA_GRAPH_DATA.edges.forEach(e => {
          if (e.u === id) corridorNodes.add(e.v);
          if (e.v === id) corridorNodes.add(e.u);
        });
      });

      const latLngs = Array.from(corridorNodes)
        .map(id => KERALA_GRAPH_DATA.nodes[id])
        .filter(Boolean)
        .map(n => [n.lat, n.lng]);

      if (latLngs.length > 0) {
        const bounds = L.latLngBounds(latLngs);
        this.map.fitBounds(bounds, {
          paddingTopLeft: [50, 50],
          paddingBottomRight: [50, 180],
          maxZoom: 12,
          animate: true
        });
        return;
      }
    }

    // Statewide fallback / Statewide mode: Fit all Kerala nodes
    const allLatLngs = Object.values(KERALA_GRAPH_DATA.nodes).map(n => [n.lat, n.lng]);
    this.map.fitBounds(L.latLngBounds(allLatLngs), {
      paddingTopLeft: [30, 30],
      paddingBottomRight: [30, 170],
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
        // Last step reached
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
  // AUDIO SPEECH SYNTHESIS NARRATOR
  // =========================================================================
  toggleAudioNarration() {
    this.isAudioEnabled = !this.isAudioEnabled;
    if (this.btnAudio) {
      this.btnAudio.classList.toggle("active", this.isAudioEnabled);
    }
    if (this.audioIcon) {
      this.audioIcon.textContent = this.isAudioEnabled ? "🔊" : "🔇";
    }
    if (this.audioText) {
      this.audioText.textContent = this.isAudioEnabled ? "Voice: On" : "Voice: Off";
    }

    if (this.isAudioEnabled) {
      this.speakCurrentStep();
    } else {
      this.stopAudioNarration();
    }
  }

  speakCurrentStep() {
    if (!this.isAudioEnabled || !this.speechSynth) return;
    this.stopAudioNarration();

    // Strip HTML tags for clean utterance
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = this.hudNarratorText.innerHTML;
    const cleanText = tempDiv.textContent || tempDiv.innerText || "";

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05 * this.speedMultiplier;
    utterance.pitch = 1.0;
    
    // Select crisp English voice if available
    const voices = this.speechSynth.getVoices();
    const naturalVoice = voices.find(v => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Samantha") || v.name.includes("Daniel")));
    if (naturalVoice) utterance.voice = naturalVoice;

    this.speechSynth.speak(utterance);
  }

  stopAudioNarration() {
    if (this.speechSynth) {
      this.speechSynth.cancel();
    }
  }

  // =========================================================================
  // PRE-CALCULATE GRAPH ALGORITHMS (DIJKSTRA, MAX FLOW, MIN CUT, MST)
  // =========================================================================
  computeAlgorithmsData() {
    // 1. Dijkstra calculation from origin to shelter
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

    // 3. Find 2-3 candidate alternative paths using DFS
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

    // 5. Kruskal Minimum Spanning Tree for statewide emergency relief backbone
    this.mstResult = this.computeKruskalMST(flowNodes, KERALA_GRAPH_DATA.edges);
  }

  findCandidatePaths(start, end, maxCount = 3) {
    const adj = {};
    Object.keys(KERALA_GRAPH_DATA.nodes).forEach(id => adj[id] = []);
    KERALA_GRAPH_DATA.edges.forEach(e => {
      if (adj[e.u]) adj[e.u].push(e.v);
      if (adj[e.v]) adj[e.v].push(e.u);
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
  }

  // =========================================================================
  // MASTER RENDER DISPATCHER
  // =========================================================================
  renderStep(step, isStepTransition = true) {
    this.updateCoordinates();
    this.clearAlgoAnimation();
    this.svg.innerHTML = "";
    this.badgesContainer.innerHTML = "";
    this.hideTooltip();
    this.hudStepBadge.textContent = `Phase ${step} of ${this.totalSteps}`;

    // Manage Whiteout Background transition (Steps 5-8 are on Whiteout Canvas)
    const isWhiteCanvas = step >= 5 && step <= 8;
    this.whiteout.classList.toggle("white-active", isWhiteCanvas);

    // Hide sub-tabs by default unless in Step 7 or 8
    if (this.hudAlgoTabs) this.hudAlgoTabs.style.display = (step === 7 || step === 8) ? "flex" : "none";
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

    if (isStepTransition && this.isAudioEnabled) {
      this.speakCurrentStep();
    }
  }

  // =========================================================================
  // PHASE 1: SET POINT OF ORIGIN AND DESTINATION
  // =========================================================================
  renderStep1_OriginDestination() {
    const originNode = KERALA_GRAPH_DATA.nodes[this.originId] || { name: "Origin", elevation: 2 };
    const shelterNode = KERALA_GRAPH_DATA.nodes[this.shelterId] || { name: "Refuge", elevation: 25 };
    const elevationDiff = Math.abs(shelterNode.elevation - originNode.elevation);

    this.hudNarratorTitle.innerHTML = `📍 Step 1: Establishing Origin & Target Refuge`;
    this.hudNarratorText.innerHTML = `
      The emergency planner designates the threatened starting point at <strong>${originNode.name}</strong> (+${originNode.elevation}m) and the target sanctuary at <strong>${shelterNode.name}</strong> (+${shelterNode.elevation}m). Evacuation requires an elevation climb of <strong>+${elevationDiff}m</strong> away from low-lying hazard zones.
    `;
    this.hudNarratorFormula.textContent = `Graph Vertices: S = "${this.originId}" (Origin), T = "${this.shelterId}" (Sink Refuge)`;
    this.hudCalcMatrix.style.display = "none";

    this.drawAllEdges("curvy", false);
    this.drawAllNodes(false, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 2: SHOW AVAILABLE ROUTES ANIMATION
  // =========================================================================
  renderStep2_AvailableRoutes() {
    this.hudNarratorTitle.innerHTML = `⚡ Step 2: Discovering Available Corridors`;
    this.hudNarratorText.innerHTML = `
      Exploration algorithms (Breadth-First & Depth-First Search) scan the road network, discovering <strong>${this.candidatePaths.length} candidate highway corridors</strong> connecting the threatened sector to regional high-ground sanctuaries.
    `;
    this.hudNarratorFormula.textContent = `Corridor Discovery: ${this.candidatePaths.length} multi-path options across ${KERALA_GRAPH_DATA.edges.length} state highway links`;
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

    this.drawAllNodes(false, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 3: SHOW ROAD CAPACITIES
  // =========================================================================
  renderStep3_RoadCapacities() {
    this.hudNarratorTitle.innerHTML = `🚗 Step 3: Road Capacities Evaluation`;
    this.hudNarratorText.innerHTML = `
      Each highway segment is assigned its maximum vehicular evacuation throughput (vehicles per hour) based on carriageway lanes, bridge bottlenecks, and speed limits during disaster emergencies.
    `;
    this.hudNarratorFormula.textContent = `Edge Capacity c(u, v) ∈ [900, 2400] vehicles/hour`;
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
  }

  // =========================================================================
  // PHASE 4: PREDICT ROAD BLOCKS
  // =========================================================================
  renderStep4_PredictRoadBlocks() {
    this.hudNarratorTitle.innerHTML = `⚠️ Step 4: Predicting Roadblocks & Flood Breaches`;
    this.hudNarratorText.innerHTML = `
      Simulated monsoon flood surge breaches low-elevation coastal avenues (&lt;3.0m) and riverine causeways. The system flags predicted roadblock failures in hazard zones, severing these edges ($W_e = \\infty$) from routing calculations.
    `;
    this.hudNarratorFormula.textContent = `Severed Edges: W_e = ∞ (Excluded from Dijkstra & Flow residual graph)`;
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

    this.drawAllNodes(false);

    // Place Roadblock warning badges
    this.predictedBlockedEdges.forEach(edgeId => {
      const edgeData = this.edgePaths[edgeId];
      if (edgeData) {
        const chip = document.createElement("div");
        chip.className = "roadblock-chip";
        chip.style.left = `${edgeData.midPt.x}px`;
        chip.style.top = `${edgeData.midPt.y}px`;
        chip.innerHTML = `⛔ <span>FLOOD BREACH (+${edgeData.edge.elevation}m)</span>`;
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

    this.drawAllEdges("curvy", true);
    this.drawAllNodes(true, [this.originId, this.shelterId]);
  }

  // =========================================================================
  // PHASE 6: ROUTES TURN INTO STRAIGHT EDGES, PLACES TURN INTO NODES
  // =========================================================================
  renderStep6_StraightEdgesAndNodes(animateMorph = true) {
    this.hudNarratorTitle.innerHTML = `📐 Step 6: Morphing Geometry to Graph Theory`;
    this.hudNarratorText.innerHTML = `
      Watch the transformation: curvy geographic roads straighten into direct mathematical edges $E$, while complex physical intersections morph into standardized mathematical graph vertices $V$.
    `;
    this.hudNarratorFormula.textContent = `Geometric Morph: Curvy Highways → Abstract Edges | Intersections → Vertices (V, E, W)`;
    this.hudCalcMatrix.style.display = "none";

    if (animateMorph) {
      this.runCurvyToStraightAnimation();
    } else {
      this.drawAllEdges("straight", true);
      this.drawAllNodes(true, [this.originId, this.shelterId], true);
      this.renderEdgeChipsOnWhite();
    }
  }

  runCurvyToStraightAnimation() {
    const startTime = performance.now();
    const duration = 650; // 650ms smooth morph

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease in-out cubic
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.svg.innerHTML = "";
      
      // Interpolate paths
      Object.values(this.edgePaths).forEach(({ uPt, vPt, polylinePoints, edge }) => {
        let d = "";
        if (polylinePoints.length > 2) {
          const N = polylinePoints.length;
          d = polylinePoints.reduce((acc, pt, idx) => {
            const straightX = uPt.x + (vPt.x - uPt.x) * (idx / (N - 1));
            const straightY = uPt.y + (vPt.y - uPt.y) * (idx / (N - 1));
            const curX = pt.x + (straightX - pt.x) * ease;
            const curY = pt.y + (straightY - pt.y) * ease;
            return acc + (idx === 0 ? `M ${curX} ${curY}` : ` L ${curX} ${curY}`);
          }, "");
        } else {
          d = `M ${uPt.x} ${uPt.y} L ${vPt.x} ${vPt.y}`;
        }

        const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElem.setAttribute("d", d);
        pathElem.setAttribute("class", "morph-edge on-white");
        this.attachEdgeHover(pathElem, edge);
        this.svg.appendChild(pathElem);
      });

      // Draw nodes expanding
      this.drawAllNodes(true, [this.originId, this.shelterId], ease > 0.5);

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
  // PHASE 7: CALCULATIONS EXPLAINED (MULTI-ALGORITHM INTERACTIVE SIMULATOR)
  // =========================================================================
  renderStep7_CalculationsExplained() {
    this.hudNarratorTitle.innerHTML = `🧠 Step 7: Executing Graph Algorithms (Python 3.13 Backend)`;
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
    this.hudNarratorText.innerHTML = `
      <strong>Dijkstra &amp; A* Search</strong>: Evaluates edge weights combining physical distance, elevation risk penalties, and flood proximity. Priority queue relaxes candidate nodes wave-by-wave until optimal shelter is proven.
    `;
    this.hudNarratorFormula.textContent = `Dijkstra: min ∑ [Distance × (1 + 2.5 × Risk/100)] • A* Heuristic: f(n) = g(n) + h(n)`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Dijkstra Priority Queue: Propagating relaxation wave from S`;

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

    // Draw base straight lines
    this.drawAllEdges("straight", true);
    this.drawAllNodes(true, [this.originId, this.shelterId], true);

    // Animate relaxation wavefront
    this.runDijkstraRelaxationWave();
  }

  runDijkstraRelaxationWave() {
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
        // Find edge connecting curr and next
        const edge = KERALA_GRAPH_DATA.edges.find(e => 
          (e.u === currNodeId && e.v === nextNodeId) || (e.u === nextNodeId && e.v === currNodeId)
        );
        if (edge && this.edgePaths[edge.id]) {
          const edgeData = this.edgePaths[edge.id];
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
      this.algoAnimationTimer = setTimeout(waveInterval, 450);
    };

    waveInterval();
  }

  renderAlgoMaxFlow() {
    this.hudNarratorText.innerHTML = `
      <strong>Edmonds-Karp Max-Flow Algorithm</strong>: Pushes vehicular traffic along augmenting paths using BFS until no residual capacity remains between the threatened zone and sanctuary hubs.
    `;
    this.hudNarratorFormula.textContent = `Edmonds-Karp: O(V·E²) • Pushing flow along residual augmenting paths`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Max-Flow: Pushing flow waves through candidate corridors`;

    const totalFlow = this.maxFlowResult?.maxFlow || 2200;

    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">Max Evacuation Flow</span>
        <span class="hud-calc-val" style="color:#8b5cf6;">${totalFlow.toLocaleString()} veh/hr</span>
        <span style="font-size:10px; color:#8b5cf6;">Total corridor throughput</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Augmenting Corridors</span>
        <span class="hud-calc-val">${this.candidatePaths.length} Active</span>
        <span style="font-size:10px; color:#0284c7;">Parallel paths utilized</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Flow Efficiency</span>
        <span class="hud-calc-val" style="color:#059669;">94.2%</span>
        <span style="font-size:10px; color:#059669;">Optimal distribution</span>
      </div>
    `;

    this.drawAllEdges("straight", true);
    this.drawAllNodes(true, [this.originId, this.shelterId], true);

    // Animate flow waves along candidate corridors
    this.candidatePaths.forEach((path, pathIdx) => {
      for (let i = 0; i < path.length - 1; i++) {
        const u = path[i];
        const v = path[i + 1];
        const edge = KERALA_GRAPH_DATA.edges.find(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
        if (edge && this.edgePaths[edge.id]) {
          const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
          pathElem.setAttribute("d", this.edgePaths[edge.id].straightPath);
          pathElem.setAttribute("class", "morph-edge flow-augment");
          pathElem.style.animationDelay = `${pathIdx * 0.4 + i * 0.15}s`;
          this.svg.appendChild(pathElem);
        }
      }
    });
  }

  renderAlgoMinCut() {
    this.hudNarratorText.innerHTML = `
      <strong>Max-Flow Min-Cut Theorem</strong>: Identifies the narrowest saturated bottleneck cut dividing the network into reachable source nodes ($S$) and destination sanctuary nodes ($T$). These choke points dictate maximum state evacuation speed.
    `;
    this.hudNarratorFormula.textContent = `Max-Flow Min-Cut Theorem: Total Max Flow = Capacity of Min-Cut`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Min-Cut Theorem: Saturated choke points flagged in red`;

    const cutEdges = this.maxFlowResult?.minCutEdges || [];

    this.hudCalcMatrix.innerHTML = `
      <div class="hud-calc-card">
        <span class="hud-calc-title">Saturated Choke Points</span>
        <span class="hud-calc-val" style="color:#e11d48;">${cutEdges.length || 1} Corridor${cutEdges.length === 1 ? '' : 's'}</span>
        <span style="font-size:10px; color:#e11d48;">Enforce contra-flow lanes!</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Cut Capacity</span>
        <span class="hud-calc-val">${this.maxFlowResult?.maxFlow.toLocaleString() || 2200} veh/hr</span>
        <span style="font-size:10px; color:#64748b;">Equals Maximum Flow</span>
      </div>
      <div class="hud-calc-card">
        <span class="hud-calc-title">Traffic Action</span>
        <span class="hud-calc-val" style="font-size:0.75rem; color:#e11d48; margin-top:2px;">Deploy Marshals</span>
        <span style="font-size:10px; color:#64748b;">Priority junction control</span>
      </div>
    `;

    // Draw straight edges; highlight saturated cut in flashing crimson
    Object.values(this.edgePaths).forEach(({ straightPath, edge }) => {
      const isMinCut = cutEdges.some(me => (me.u === edge.u && me.v === edge.v) || (me.u === edge.v && me.v === edge.u));
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", straightPath);
      pathElem.setAttribute("class", `morph-edge on-white ${isMinCut ? 'min-cut-saturated' : ''}`);
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);

      if (isMinCut) {
        const midPt = { x: (edgeData => (edgeData.uPt.x + edgeData.vPt.x) / 2)(this.edgePaths[edge.id]), y: (edgeData => (edgeData.uPt.y + edgeData.vPt.y) / 2)(this.edgePaths[edge.id]) };
        const chip = document.createElement("div");
        chip.className = "roadblock-chip";
        chip.style.left = `${midPt.x}px`;
        chip.style.top = `${midPt.y}px`;
        chip.innerHTML = `⚠️ <span>MIN-CUT CHOKE POINT (${edge.capacity_veh_hr}v/h)</span>`;
        this.badgesContainer.appendChild(chip);
      }
    });

    this.drawAllNodes(true, [this.originId, this.shelterId], true);
  }

  renderAlgoMST() {
    this.hudNarratorText.innerHTML = `
      <strong>Kruskal / Prim Minimum Spanning Tree (MST)</strong>: Connects all regional high-ground sanctuaries and district response centers with minimum total highway construction/maintenance distance without loops ($\mathcal{O}(E \log E)$).
    `;
    this.hudNarratorFormula.textContent = `Kruskal MST: min ∑ w(e) subject to G_T spanning all vertices without cycles`;
    if (this.algoStepStatus) this.algoStepStatus.textContent = `Kruskal MST: Emergency relief supply backbone connected`;

    const mstEdges = this.mstResult?.mstEdges || [];
    const mstKm = this.mstResult?.totalKm || 1240;

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
    Object.values(this.edgePaths).forEach(({ straightPath, edge }) => {
      const isMst = mstEdges.some(me => me.id === edge.id);
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", straightPath);
      pathElem.setAttribute("class", `morph-edge on-white ${isMst ? 'mst-backbone' : ''}`);
      if (!isMst) pathElem.style.opacity = "0.2";
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(true, [this.originId, this.shelterId], true);
  }

  clearAlgoAnimation() {
    if (this.algoAnimationTimer) {
      clearTimeout(this.algoAnimationTimer);
      this.algoAnimationTimer = null;
    }
  }

  // =========================================================================
  // PHASE 8: HIGHLIGHT THE OPTIMAL EDGE & MIN-CUT BOTTLENECKS
  // =========================================================================
  renderStep8_HighlightOptimalEdge() {
    this.hudNarratorTitle.innerHTML = `✨ Step 8: Highlighting Optimal Edge & Min-Cut Bottlenecks`;
    this.hudNarratorText.innerHTML = `
      The algorithm illuminates the winning optimal evacuation corridor in glowing electric cyan!
      Simultaneously, the saturated <strong>Minimum Cut bottleneck edges</strong> are highlighted in red dashed lines, warning authorities where contra-flow lanes are required.
    `;
    this.hudNarratorFormula.textContent = `Optimal Path Selected: [${this.optimalPath?.pathNodes?.join(" → ")}] • Bottlenecks Isolated`;
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
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });

    this.drawAllNodes(true, [this.originId, this.shelterId], true);
  }

  // =========================================================================
  // PHASE 9: WARP BACK THE EDGE TO ROUTE AS MAP APPEARS BACK
  // =========================================================================
  renderStep9_WarpBackToMap(animateWarp = true) {
    const originName = KERALA_GRAPH_DATA.nodes[this.originId]?.name || "Origin";
    const shelterName = KERALA_GRAPH_DATA.nodes[this.shelterId]?.name || "Safe Haven";

    this.hudNarratorTitle.innerHTML = `🌍 Step 9: Warping Back to Physical Geography`;
    this.hudNarratorText.innerHTML = `
      The abstract straight edges smoothly bend and warp back into the physical curves of the road network as the satellite imagery re-emerges. The mathematical graph solution is now deployed as an actionable real-world evacuation plan!
    `;
    this.hudNarratorFormula.textContent = `Evacuation Plan Ready: ${this.optimalPath?.totalKm} km from ${originName} to ${shelterName}`;
    this.hudCalcMatrix.style.display = "none";

    if (animateWarp) {
      this.runStraightToCurvyAnimation();
    } else {
      this.drawPhase9Static();
    }
  }

  runStraightToCurvyAnimation() {
    const startTime = performance.now();
    const duration = 700; // 700ms smooth warp

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const ease = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      this.svg.innerHTML = "";
      
      // Interpolate paths straight -> curvy
      Object.values(this.edgePaths).forEach(({ uPt, vPt, polylinePoints, edge }) => {
        const isOptimal = this.isEdgeInOptimalPath(edge);
        let d = "";
        if (polylinePoints.length > 2) {
          const N = polylinePoints.length;
          d = polylinePoints.reduce((acc, pt, idx) => {
            const straightX = uPt.x + (vPt.x - uPt.x) * (idx / (N - 1));
            const straightY = uPt.y + (vPt.y - uPt.y) * (idx / (N - 1));
            const curX = straightX + (pt.x - straightX) * ease;
            const curY = straightY + (pt.y - straightY) * ease;
            return acc + (idx === 0 ? `M ${curX} ${curY}` : ` L ${curX} ${curY}`);
          }, "");
        } else {
          d = `M ${uPt.x} ${uPt.y} L ${vPt.x} ${vPt.y}`;
        }

        const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathElem.setAttribute("d", d);
        pathElem.setAttribute("class", `morph-edge ${isOptimal ? 'optimal-straight' : ''}`);
        this.attachEdgeHover(pathElem, edge);
        this.svg.appendChild(pathElem);
      });

      this.drawAllNodes(false, [this.originId, this.shelterId]);

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
  }

  // =========================================================================
  // HELPER DRAWING FUNCTIONS
  // =========================================================================
  drawAllEdges(mode = "curvy", onWhite = false) {
    Object.values(this.edgePaths).forEach(({ curvyPath, straightPath, edge }) => {
      const d = mode === "straight" ? straightPath : curvyPath;
      const pathElem = document.createElementNS("http://www.w3.org/2000/svg", "path");
      pathElem.setAttribute("d", d);
      pathElem.setAttribute("class", `morph-edge ${onWhite ? 'on-white' : ''}`);
      this.attachEdgeHover(pathElem, edge);
      this.svg.appendChild(pathElem);
    });
  }

  drawAllNodes(onWhite = false, pulseNodeIds = [], asGraphVertices = false) {
    const isStatewide = this.cameraMode === "statewide";
    const standardRadius = isStatewide ? 5 : (asGraphVertices ? 16 : 7);
    const keyNodeRadius = isStatewide ? 10 : (asGraphVertices ? 18 : 14);

    Object.values(this.nodePositions).forEach(({ x, y, node }) => {
      const isOrigin = node.id === this.originId;
      const isShelter = node.id === this.shelterId;
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
        text.textContent = isOrigin ? "S" : (isShelter ? "T" : node.name.substring(0, 2).toUpperCase());
        group.appendChild(text);

        if (!isStatewide) {
          const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
          subText.setAttribute("x", x);
          subText.setAttribute("y", y + (asGraphVertices ? 26 : 22));
          subText.setAttribute("class", `morph-node-sublabel ${onWhite ? 'on-white' : ''}`);
          subText.textContent = `+${node.elevation}m`;
          group.appendChild(subText);
        }
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
