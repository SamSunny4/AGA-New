/**
 * Kerala SafeRoute - Route Planner Application Controller
 * Handles Leaflet map interactions, controls, Dijkstra dynamic recalculation,
 * and result card rendering.
 */

document.addEventListener("DOMContentLoaded", () => {
  // Application State
  const state = {
    selectedOrigin: "fort_kochi",
    selectedShelter: "auto", // 'auto' or specific shelter ID
    disasterType: "flood",    // 'flood', 'cyclone', 'waterlogging'
    severity: "moderate",      // 'low', 'moderate', 'severe'
    closedEdges: new Set(),
    activeRouteResult: null,
    showHazards: true,
    showRoads: true,
    showShelters: true
  };

  // DOM Elements
  const originSelect = document.getElementById("origin-select");
  const shelterSelect = document.getElementById("shelter-select");
  const disasterSelect = document.getElementById("disaster-type-select");
  const severityBtns = document.querySelectorAll(".severity-btn");
  const closureTogglesContainer = document.getElementById("closure-toggles-list");
  const resetBtn = document.getElementById("btn-reset-defaults");
  const recalculateBtn = document.getElementById("btn-recalculate");

  // Result Card Elements
  const resultShelterTitle = document.getElementById("result-shelter-title");
  const resultShelterMeta = document.getElementById("result-shelter-meta");
  const resultStatusChip = document.getElementById("result-status-chip");
  const metricDistance = document.getElementById("metric-distance");
  const metricTime = document.getElementById("metric-time");
  const metricRisk = document.getElementById("metric-risk");
  const riskProgressFill = document.getElementById("risk-progress-fill");
  const riskFormulaText = document.getElementById("risk-formula-text");
  const waypointList = document.getElementById("waypoint-list");

  // Layer toggles
  const toggleHazardsInput = document.getElementById("toggle-hazards");
  const toggleRoadsInput = document.getElementById("toggle-roads");
  const toggleSheltersInput = document.getElementById("toggle-shelters");

  // 1. Initialize Leaflet Map
  const map = L.map("map", {
    zoomControl: false,
    minZoom: 10,
    maxZoom: 18
  }).setView(KERALA_GRAPH_DATA.metadata.center, KERALA_GRAPH_DATA.metadata.defaultZoom);

  // Reposition zoom controls to top-left
  L.control.zoom({ position: "topleft" }).addTo(map);

  // Basemap Tile Layers (Zero API key required, zero watermarks)
  const BASEMAPS = {
    osm: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors | Kerala SafeRoute',
      maxZoom: 19
    }),
    satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
      maxZoom: 19
    }),
    hybrid: L.layerGroup([
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19
      }),
      L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 19
      })
    ]),
    topo: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri, USGS, NOAA | Kerala SafeRoute Topo',
      maxZoom: 19
    }),
    street: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", {
      attribution: 'Tiles &copy; Esri, DeLorme, NAVTEQ | Kerala SafeRoute',
      maxZoom: 19
    })
  };

  const labelsLayer = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
    maxZoom: 19
  });

  let currentBasemap = "osm";
  BASEMAPS.osm.addTo(map);

  // Leaflet Layer Groups
  const hazardLayerGroup = L.layerGroup().addTo(map);
  const roadLayerGroup = L.layerGroup().addTo(map);
  const capacityLayerGroup = L.layerGroup().addTo(map);
  const nodeLayerGroup = L.layerGroup().addTo(map);
  const routeLayerGroup = L.layerGroup().addTo(map);

  function setBasemap(name) {
    if (!BASEMAPS[name] || currentBasemap === name) return;
    map.removeLayer(BASEMAPS[currentBasemap]);
    BASEMAPS[name].addTo(map);
    currentBasemap = name;

    // Bring vector layers to front
    if (map.hasLayer(hazardLayerGroup)) hazardLayerGroup.bringToFront?.();
    if (map.hasLayer(roadLayerGroup)) roadLayerGroup.bringToFront?.();
    if (map.hasLayer(routeLayerGroup)) routeLayerGroup.bringToFront?.();
    if (map.hasLayer(nodeLayerGroup)) nodeLayerGroup.bringToFront?.();
    if (map.hasLayer(capacityLayerGroup)) capacityLayerGroup.bringToFront?.();

    document.querySelectorAll(".basemap-option-card").forEach(card => {
      card.classList.toggle("active", card.dataset.basemap === name);
    });
  }

  // 2. Populate Dropdowns & Presets
  function populateFormControls() {
    // Populate Origin dropdown
    originSelect.innerHTML = "";
    Object.values(KERALA_GRAPH_DATA.nodes).forEach(node => {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.name} (${node.type === 'shelter' ? 'Safe Camp' : 'Junction'})`;
      if (node.id === state.selectedOrigin) option.selected = true;
      originSelect.appendChild(option);
    });

    // Populate Shelter dropdown
    shelterSelect.innerHTML = "";
    const autoOption = document.createElement("option");
    autoOption.value = "auto";
    autoOption.textContent = "⚡ Auto-Select Safest & Closest Safe Hub";
    shelterSelect.appendChild(autoOption);

    Object.values(KERALA_GRAPH_DATA.nodes)
      .filter(n => n.type === "shelter")
      .forEach(shelter => {
        const option = document.createElement("option");
        option.value = shelter.id;
        option.textContent = `🛡️ ${shelter.name} (+${shelter.elevation}m)`;
        shelterSelect.appendChild(option);
      });

    // Populate Road Closure Checkboxes
    closureTogglesContainer.innerHTML = "";
    ROAD_CLOSURE_PRESETS.forEach(preset => {
      const itemDiv = document.createElement("div");
      itemDiv.className = "closure-item";

      const label = document.createElement("label");
      label.className = "closure-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.dataset.edgeId = preset.edgeId;
      checkbox.checked = state.closedEdges.has(preset.edgeId);

      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          state.closedEdges.add(preset.edgeId);
        } else {
          state.closedEdges.delete(preset.edgeId);
        }
        recalculateAndRender();
      });

      const spanText = document.createElement("span");
      spanText.textContent = preset.label;

      label.appendChild(checkbox);
      label.appendChild(spanText);

      const badge = document.createElement("span");
      badge.className = "closure-badge";
      badge.textContent = "Blocked";

      itemDiv.appendChild(label);
      itemDiv.appendChild(badge);
      closureTogglesContainer.appendChild(itemDiv);
    });
  }

  // 3. Render Static Map Layers: Hazards, Roads, and Nodes
  function renderHazardZones() {
    hazardLayerGroup.clearLayers();
    if (!state.showHazards) return;

    KERALA_GRAPH_DATA.hazardZones.forEach(zone => {
      const polygon = L.polygon(zone.coordinates, {
        color: zone.color,
        fillColor: zone.fillColor,
        fillOpacity: zone.fillOpacity,
        weight: 2,
        dashArray: "4, 4"
      });

      polygon.bindTooltip(`
        <div style="font-weight:700; color:${zone.color};">⚠️ ${zone.name}</div>
        <div style="font-size:11px; color:#cbd5e1; max-width:220px;">${zone.desc}</div>
      `, { sticky: true, className: "custom-tooltip" });

      hazardLayerGroup.addLayer(polygon);
    });
  }

  function renderRoadNetwork() {
    roadLayerGroup.clearLayers();
    if (!state.showRoads) return;

    KERALA_GRAPH_DATA.edges.forEach(edge => {
      const nodeU = KERALA_GRAPH_DATA.nodes[edge.u];
      const nodeV = KERALA_GRAPH_DATA.nodes[edge.v];
      if (!nodeU || !nodeV) return;

      const isClosed = state.closedEdges.has(edge.id);
      const evalData = DijkstraRouter.evaluateEdge(edge, state.disasterType, state.severity, state.closedEdges);

      let roadClass = "road-line-normal";
      let roadColor = "#475569";
      let weight = 3;
      let dashArray = null;

      if (isClosed) {
        roadClass = "road-line-closed";
        roadColor = "#f43f5e";
        dashArray = "6, 6";
        weight = 4;
      } else if (evalData.riskScore > 60) {
        roadClass = "road-line-caution";
        roadColor = "#f59e0b";
        weight = 4;
      }

      const roadCoords = edge.path || [
        [nodeU.lat, nodeU.lng],
        [nodeV.lat, nodeV.lng]
      ];

      const polyline = L.polyline(roadCoords, {
        color: roadColor,
        weight: weight,
        opacity: isClosed ? 0.9 : 0.7,
        dashArray: dashArray,
        className: roadClass
      });

      // Interactive road popup allowing user to click and toggle road status
      const popupContent = `
        <div class="map-popup-inner">
          <div class="map-popup-title">🛣️ ${edge.name}</div>
          <div class="map-popup-meta">
            <div><strong>Base Distance:</strong> ${edge.distance_km} km</div>
            <div><strong>Avg Elevation:</strong> ${edge.elevation} m</div>
            <div><strong>Simulated Risk:</strong> ${evalData.riskScore}/100</div>
            <div><strong>Status:</strong> ${isClosed ? '<span style="color:#f43f5e;font-weight:700;">CLOSED / BLOCKED</span>' : '<span style="color:#10b981;font-weight:700;">OPEN / PASSABLE</span>'}</div>
          </div>
          <button class="map-popup-btn" id="toggle-edge-${edge.id}">
            ${isClosed ? "Mark Road as Re-Opened" : "Simulate Road Blockage"}
          </button>
        </div>
      `;

      polyline.bindPopup(popupContent);
      polyline.on("popupopen", () => {
        const btn = document.getElementById(`toggle-edge-${edge.id}`);
        if (btn) {
          btn.addEventListener("click", () => {
            if (state.closedEdges.has(edge.id)) {
              state.closedEdges.delete(edge.id);
            } else {
              state.closedEdges.add(edge.id);
            }
            map.closePopup();
            // Update checkbox UI if it corresponds to preset
            const chk = document.querySelector(`input[data-edge-id="${edge.id}"]`);
            if (chk) chk.checked = state.closedEdges.has(edge.id);
            recalculateAndRender();
          });
        }
      });

      roadLayerGroup.addLayer(polyline);
    });
  }

  function renderNodes() {
    nodeLayerGroup.clearLayers();

    Object.values(KERALA_GRAPH_DATA.nodes).forEach(node => {
      const isOrigin = node.id === state.selectedOrigin;
      const isShelter = node.type === "shelter";

      // If shelters are toggled off and it's a shelter (and not origin)
      if (isShelter && !state.showShelters && !isOrigin) return;

      let iconHtml = "";
      let iconClass = "custom-node-marker";

      if (isOrigin) {
        iconHtml = `<div class="origin-pin" title="Evacuation Origin: ${node.name}"></div>`;
      } else if (isShelter) {
        iconHtml = `<div class="shelter-pin" title="Safe Shelter: ${node.name}">🛡️</div>`;
      } else {
        iconHtml = `<div class="junction-pin" title="${node.name}"></div>`;
      }

      const customIcon = L.divIcon({
        className: iconClass,
        html: iconHtml,
        iconSize: isOrigin ? [38, 38] : (isShelter ? [34, 34] : [14, 14]),
        iconAnchor: isOrigin ? [19, 19] : (isShelter ? [17, 17] : [7, 7])
      });

      const marker = L.marker([node.lat, node.lng], { icon: customIcon });

      const popupContent = `
        <div class="map-popup-inner">
          <div class="map-popup-title">${isShelter ? '🛡️ ' : '📍 '}${node.name}</div>
          <div class="map-popup-meta">
            <div><strong>Type:</strong> ${isShelter ? 'Designated Emergency Shelter' : 'Road Intersection'}</div>
            <div><strong>Elevation:</strong> +${node.elevation}m above sea level</div>
            ${isShelter ? `<div><strong>Capacity:</strong> ${node.capacity} persons</div><div><strong>Facilities:</strong> ${node.features}</div>` : ''}
            <div>${node.desc}</div>
          </div>
          ${!isOrigin ? `<button class="map-popup-btn" id="set-origin-${node.id}">Set as Evacuation Starting Point</button>` : ''}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.on("popupopen", () => {
        const btn = document.getElementById(`set-origin-${node.id}`);
        if (btn) {
          btn.addEventListener("click", () => {
            state.selectedOrigin = node.id;
            originSelect.value = node.id;
            map.closePopup();
            recalculateAndRender();
          });
        }
      });

      nodeLayerGroup.addLayer(marker);
    });
  }

  // Helper to update UI backend status chip
  function updateBackendStatus(isOnline, engineText) {
    const banner = document.querySelector(".map-status-banner");
    let chip = document.getElementById("backend-status-chip");
    if (!chip && banner) {
      chip = document.createElement("span");
      chip.id = "backend-status-chip";
      banner.appendChild(chip);
    }
    if (chip) {
      if (isOnline) {
        chip.className = "backend-chip python";
        chip.innerHTML = `🐍 <span>${engineText || "Python 3.13 Backend"}</span>`;
      } else {
        chip.className = "backend-chip fallback";
        chip.innerHTML = `⚡ <span>${engineText || "Browser Client Engine"}</span>`;
      }
    }
  }

  // 4. Calculate Dijkstra Route (Python Backend with Client Fallback)
  async function calculateRouteAsync() {
    const targetId = state.selectedShelter === "auto" ? null : state.selectedShelter;
    const payload = {
      sourceId: state.selectedOrigin,
      targetId: targetId,
      disasterType: state.disasterType,
      severity: state.severity,
      closedEdgeIds: Array.from(state.closedEdges)
    };

    try {
      const resp = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (resp.ok) {
        const data = await resp.json();
        updateBackendStatus(true, "Python 3.13 NetworkX Engine");
        return data;
      }
    } catch (err) {
      // Fallback silently to client-side engine
      updateBackendStatus(false, "Client Engine");
    }

    // Client-side fallback
    return DijkstraRouter.runDijkstra(
      KERALA_GRAPH_DATA.nodes,
      KERALA_GRAPH_DATA.edges,
      state.selectedOrigin,
      targetId,
      {
        disasterType: state.disasterType,
        severity: state.severity,
        closedEdgeIds: state.closedEdges
      }
    );
  }

  function renderRoute(routeData) {
    routeLayerGroup.clearLayers();
    if (!routeData || !routeData.reachable) {
      renderUnreachableCard();
      return;
    }

    // Build continuous multi-point route coordinates tracing the actual curvy roads
    const routeCoords = [];
    for (let i = 0; i < routeData.pathNodes.length - 1; i++) {
      const uId = routeData.pathNodes[i];
      const vId = routeData.pathNodes[i + 1];
      const edge = (routeData.pathEdges && routeData.pathEdges[i]) || KERALA_GRAPH_DATA.edges.find(e => 
        (e.u === uId && e.v === vId) || (e.u === vId && e.v === uId)
      );

      if (edge && edge.path) {
        const isForward = edge.u === uId;
        const pts = isForward ? edge.path : [...edge.path].reverse();
        if (routeCoords.length > 0 && pts.length > 0) {
          routeCoords.push(...pts.slice(1));
        } else {
          routeCoords.push(...pts);
        }
      } else {
        const uNode = KERALA_GRAPH_DATA.nodes[uId];
        const vNode = KERALA_GRAPH_DATA.nodes[vId];
        if (uNode && vNode) {
          routeCoords.push([uNode.lat, uNode.lng]);
          routeCoords.push([vNode.lat, vNode.lng]);
        }
      }
    }

    // Outer glow background polyline
    const bgLine = L.polyline(routeCoords, {
      className: "evacuation-route-bg",
      lineCap: "round",
      lineJoin: "round"
    });

    // Inner glowing animated animated flow polyline
    const glowLine = L.polyline(routeCoords, {
      className: "evacuation-route-glow",
      lineCap: "round",
      lineJoin: "round"
    });

    routeLayerGroup.addLayer(bgLine);
    routeLayerGroup.addLayer(glowLine);

    // Zoom map slightly to fit route if reasonable
    if (routeCoords.length > 1) {
      map.fitBounds(L.latLngBounds(routeCoords), {
        padding: [60, 60],
        maxZoom: 14
      });
    }

    // Update Result Card UI
    updateResultCard(routeData);
  }

  function updateResultCard(route) {
    const destination = route.destinationNode;
    resultShelterTitle.textContent = destination.name;
    resultShelterMeta.textContent = `📍 +${destination.elevation}m Elevation • Safe Capacity: ${destination.capacity} people`;

    // Status chip
    if (route.averageRiskScore < 30) {
      resultStatusChip.className = "status-chip optimal";
      resultStatusChip.textContent = "Optimal Safety";
    } else if (route.averageRiskScore < 60) {
      resultStatusChip.className = "status-chip warning";
      resultStatusChip.textContent = "Caution Advised";
    } else {
      resultStatusChip.className = "status-chip danger";
      resultStatusChip.textContent = "High Risk Corridors";
    }

    // Metrics
    metricDistance.innerHTML = `${route.totalKm} <span class="metric-unit">km</span>`;

    // Speed estimate based on disaster conditions: 40km/h down to 20km/h
    const avgSpeed = state.severity === 'severe' ? 22 : (state.severity === 'moderate' ? 32 : 45);
    const estMinutes = Math.round((route.totalKm / avgSpeed) * 60) + (route.stepCount * 2);
    metricTime.innerHTML = `${estMinutes} <span class="metric-unit">min</span>`;

    metricRisk.innerHTML = `${route.averageRiskScore}<span class="metric-unit">/100</span>`;

    // Risk Meter Progress
    riskProgressFill.style.width = `${Math.min(100, Math.max(10, route.averageRiskScore))}%`;
    if (route.averageRiskScore < 35) {
      riskProgressFill.style.backgroundColor = "#10b981";
    } else if (route.averageRiskScore < 65) {
      riskProgressFill.style.backgroundColor = "#f59e0b";
    } else {
      riskProgressFill.style.backgroundColor = "#f43f5e";
    }

    // Risk Formula Explanation
    riskFormulaText.innerHTML = `
      <strong>Simulated Risk Estimate Formula:</strong><br>
      <code>Risk = (Susceptibility × 45 + ElevationPenalty × 35 + HazardProximity × 20) × (${state.severity.toUpperCase()} Multiplier)</code>.<br>
      <em>Note: Heuristic metric calculation; not an AI model or real-time sensor stream.</em>
    `;

    // Itinerary List
    waypointList.innerHTML = "";
    route.pathNodes.forEach((nodeId, idx) => {
      const node = KERALA_GRAPH_DATA.nodes[nodeId];
      const li = document.createElement("li");
      li.className = `waypoint-item ${idx === 0 ? 'origin' : (idx === route.pathNodes.length - 1 ? 'shelter' : '')}`;

      const nameSpan = document.createElement("span");
      nameSpan.className = "waypoint-name";
      nameSpan.textContent = `${idx + 1}. ${node.name}`;

      const metaSpan = document.createElement("span");
      metaSpan.className = "waypoint-meta";
      metaSpan.textContent = `Elev: +${node.elevation}m`;

      li.appendChild(nameSpan);
      li.appendChild(metaSpan);
      waypointList.appendChild(li);
    });
  }

  function renderUnreachableCard() {
    resultShelterTitle.textContent = "No Safe Route Available";
    resultShelterMeta.textContent = "All road connections to safe shelters are currently blocked or submerged.";
    resultStatusChip.className = "status-chip danger";
    resultStatusChip.textContent = "Isolated Sector";

    metricDistance.innerHTML = `-- <span class="metric-unit">km</span>`;
    metricTime.innerHTML = `-- <span class="metric-unit">min</span>`;
    metricRisk.innerHTML = `100<span class="metric-unit">/100</span>`;

    riskProgressFill.style.width = "100%";
    riskProgressFill.style.backgroundColor = "#f43f5e";

    riskFormulaText.innerHTML = `
      <strong>⚠️ Network Disconnection:</strong><br>
      The Dijkstra algorithm could not discover any open path from <strong>${KERALA_GRAPH_DATA.nodes[state.selectedOrigin]?.name}</strong> to an emergency shelter without crossing blocked roads. Please reopen road links or consider amphibious/air rescue simulation.
    `;

    waypointList.innerHTML = `
      <li class="waypoint-item" style="color:#fb7185;">
        <span>Origin isolated by active road closures.</span>
      </li>
    `;
  }

  async function recalculateAndRender() {
    renderHazardZones();
    renderRoadNetwork();
    renderNodes();

    const dijkstraResult = await calculateRouteAsync();
    state.activeRouteResult = dijkstraResult;

    if (state.selectedShelter === "auto") {
      renderRoute(dijkstraResult.optimalShelterRoute || dijkstraResult.route);
    } else {
      renderRoute(dijkstraResult.route || dijkstraResult.optimalShelterRoute);
    }
  }

  // 5. Event Listeners
  originSelect.addEventListener("change", (e) => {
    state.selectedOrigin = e.target.value;
    recalculateAndRender();
  });

  shelterSelect.addEventListener("change", (e) => {
    state.selectedShelter = e.target.value;
    recalculateAndRender();
  });

  disasterSelect.addEventListener("change", (e) => {
    state.disasterType = e.target.value;
    recalculateAndRender();
  });

  severityBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      severityBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.severity = btn.dataset.sev;
      recalculateAndRender();
    });
  });

  const floodQuickToggle = document.getElementById("flood-quick-toggle");
  const floodToggleSub = document.getElementById("flood-toggle-sub");
  if (floodQuickToggle) {
    floodQuickToggle.addEventListener("change", (e) => {
      if (e.target.checked) {
        state.severity = "moderate";
        if (floodToggleSub) floodToggleSub.textContent = "Active flood elevation penalty";
      } else {
        state.severity = "low";
        if (floodToggleSub) floodToggleSub.textContent = "Minimal flood penalty";
      }
      recalculateAndRender();
    });
  }

  if (recalculateBtn) {
    recalculateBtn.addEventListener("click", () => {
      recalculateAndRender();
    });
  }

  resetBtn.addEventListener("click", () => {
    state.selectedOrigin = "fort_kochi";
    state.selectedShelter = "auto";
    state.disasterType = "flood";
    state.severity = "moderate";
    state.closedEdges.clear();

    if (floodQuickToggle) floodQuickToggle.checked = true;
    if (floodToggleSub) floodToggleSub.textContent = "Active flood elevation penalty";

    populateFormControls();
    severityBtns.forEach(b => {
      b.classList.toggle("active", b.dataset.sev === "moderate");
    });

    recalculateAndRender();
  });

  // Layer switches
  if (toggleHazardsInput) {
    toggleHazardsInput.addEventListener("change", (e) => {
      state.showHazards = e.target.checked;
      renderHazardZones();
    });
  }

  if (toggleRoadsInput) {
    toggleRoadsInput.addEventListener("change", (e) => {
      state.showRoads = e.target.checked;
      renderRoadNetwork();
    });
  }

  if (toggleSheltersInput) {
    toggleSheltersInput.addEventListener("change", (e) => {
      state.showShelters = e.target.checked;
      renderNodes();
    });
  }

  // About modal triggers
  const aboutModal = document.getElementById("about-modal");
  const openAboutBtn = document.getElementById("btn-open-about");
  const closeAboutBtn = document.getElementById("btn-close-about");
  const closeAboutFooterBtn = document.getElementById("btn-close-about-footer");

  if (openAboutBtn && aboutModal) {
    openAboutBtn.addEventListener("click", () => aboutModal.classList.add("active"));
  }
  if (closeAboutBtn && aboutModal) {
    closeAboutBtn.addEventListener("click", () => aboutModal.classList.remove("active"));
  }
  if (closeAboutFooterBtn && aboutModal) {
    closeAboutFooterBtn.addEventListener("click", () => aboutModal.classList.remove("active"));
  }

  // Initialize UI
  populateFormControls();
  recalculateAndRender();

  // =========================================================================
  // Map Settings & Basemap Flyout Controller
  // =========================================================================
  const btnMapSettings = document.getElementById("btn-map-settings");
  const mapSettingsPanel = document.getElementById("map-settings-panel");
  const btnCloseSettings = document.getElementById("btn-close-settings");

  if (btnMapSettings && mapSettingsPanel) {
    btnMapSettings.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = mapSettingsPanel.classList.toggle("open");
      btnMapSettings.classList.toggle("active", isOpen);
    });

    btnCloseSettings?.addEventListener("click", () => {
      mapSettingsPanel.classList.remove("open");
      btnMapSettings.classList.remove("active");
    });

    // Close when clicking outside
    document.addEventListener("click", (e) => {
      if (!mapSettingsPanel.contains(e.target) && !btnMapSettings.contains(e.target)) {
        mapSettingsPanel.classList.remove("open");
        btnMapSettings.classList.remove("active");
      }
    });
  }

  // Basemap Option Cards
  document.querySelectorAll(".basemap-option-card").forEach(card => {
    card.addEventListener("click", () => {
      const basemapKey = card.dataset.basemap;
      setBasemap(basemapKey);
    });
  });

  // Overlay: Place & Street Labels
  const toggleLabelsInput = document.getElementById("setting-toggle-labels");
  toggleLabelsInput?.addEventListener("change", (e) => {
    if (e.target.checked) {
      labelsLayer.addTo(map);
    } else {
      map.removeLayer(labelsLayer);
    }
  });

  // Overlay: Road Capacity Markers
  const toggleCapacitiesInput = document.getElementById("setting-toggle-capacities");
  function renderCapacityMarkers() {
    capacityLayerGroup.clearLayers();
    if (!toggleCapacitiesInput?.checked) return;
    KERALA_GRAPH_DATA.edges.forEach(edge => {
      if (edge.path && edge.path.length > 0) {
        const midIdx = Math.floor(edge.path.length / 2);
        const midCoord = edge.path[midIdx];
        const icon = L.divIcon({
          className: "leaflet-capacity-label",
          html: `<div class="map-capacity-tag">🚗 ${edge.capacity_veh_hr || 1200} <span style="font-size:9px;">v/h</span></div>`,
          iconSize: [80, 24],
          iconAnchor: [40, 12]
        });
        L.marker(midCoord, { icon, interactive: false }).addTo(capacityLayerGroup);
      }
    });
  }
  toggleCapacitiesInput?.addEventListener("change", renderCapacityMarkers);

  // Overlay: Dark EOC Mode (Night Radar Inversion)
  const toggleDarkInput = document.getElementById("setting-toggle-dark");
  toggleDarkInput?.addEventListener("change", (e) => {
    const mapContainer = document.getElementById("map");
    mapContainer.classList.toggle("dark-eoc-mode", e.target.checked);
  });

  // Quick Camera Presets
  const CAM_PRESETS = {
    kochi: { center: [10.015, 76.315], zoom: 12 },
    periyar: { center: [10.105, 76.345], zoom: 13 },
    fortkochi: { center: [9.965, 76.255], zoom: 14 },
    kakkanad: { center: [10.016, 76.345], zoom: 14 }
  };
  document.querySelectorAll(".btn-preset-cam").forEach(btn => {
    btn.addEventListener("click", () => {
      const preset = CAM_PRESETS[btn.dataset.cam];
      if (preset) {
        map.flyTo(preset.center, preset.zoom, { duration: 1.2 });
      }
    });
  });


  // Initialize Cinematic Presentation & Graph Morph Director
  const btnStartPresentation = document.getElementById("btn-start-presentation");
  let presentationDirector = null;
  if (typeof PresentationDirector !== "undefined") {
    presentationDirector = new PresentationDirector(map, state, () => {
      // When presentation ends or is closed, re-render map state cleanly
      recalculateAndRender();
    });

    if (btnStartPresentation) {
      btnStartPresentation.addEventListener("click", () => {
        const shelterId = state.selectedShelter === "auto" 
          ? (state.activeRouteResult?.optimalShelterRoute?.destinationId || "shelter_kakkanad") 
          : state.selectedShelter;
        presentationDirector.startPresentation(state.selectedOrigin, shelterId);
      });
    }
  }
});

