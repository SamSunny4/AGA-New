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
    hasUserInteracted: false,
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

  // 1. Initialize Leaflet Map (Statewide Full Kerala bounds)
  const map = L.map("map", {
    zoomControl: false,
    minZoom: 6,
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

  // 2. Populate Dropdowns & Presets with Regional Optgroups
  function populateFormControls() {
    // Populate Origin dropdown grouped by region
    originSelect.innerHTML = "";
    const regions = {
      "South": { label: "️ South Kerala (TVM, Kollam, Alappuzha, Pathanamthitta)", group: document.createElement("optgroup") },
      "Central": { label: "📍 Central Kerala (Kochi, Thrissur, Kottayam)", group: document.createElement("optgroup") },
      "Highland": { label: "️ Western Ghats & High Ranges (Idukki, Munnar, Wayanad)", group: document.createElement("optgroup") },
      "North": { label: "️ North Malabar (Palakkad, Malappuram, Kozhikode, Kannur, Kasaragod)", group: document.createElement("optgroup") }
    };
    Object.values(regions).forEach(r => r.group.label = r.label);

    Object.values(KERALA_GRAPH_DATA.nodes).forEach(node => {
      const option = document.createElement("option");
      option.value = node.id;
      option.textContent = `${node.name} (${node.type === 'shelter' ? 'Safe Camp' : 'Junction'})`;
      if (node.id === state.selectedOrigin) option.selected = true;

      const regKey = node.region || "Central";
      if (regions[regKey]) {
        regions[regKey].group.appendChild(option);
      } else {
        regions["Central"].group.appendChild(option);
      }
    });

    Object.values(regions).forEach(r => {
      if (r.group.children.length > 0) originSelect.appendChild(r.group);
    });

    // Populate Shelter dropdown grouped by region
    shelterSelect.innerHTML = "";
    const autoOption = document.createElement("option");
    autoOption.value = "auto";
    autoOption.textContent = " Auto-Select Safest & Closest Safe Hub";
    shelterSelect.appendChild(autoOption);

    const shelterRegions = {
      "South": { label: "️ South Kerala Safe Havens", group: document.createElement("optgroup") },
      "Central": { label: "📍 Central Kerala Safe Hubs", group: document.createElement("optgroup") },
      "Highland": { label: "️ High-Range Mountain Citadels", group: document.createElement("optgroup") },
      "North": { label: "️ North Malabar Mega Shelters", group: document.createElement("optgroup") }
    };
    Object.values(shelterRegions).forEach(r => r.group.label = r.label);

    Object.values(KERALA_GRAPH_DATA.nodes)
      .filter(n => n.type === "shelter")
      .forEach(shelter => {
        const option = document.createElement("option");
        option.value = shelter.id;
        option.textContent = `️ ${shelter.name} (+${shelter.elevation}m • Cap: ${shelter.capacity?.toLocaleString() || 3000})`;
        if (shelter.id === state.selectedShelter) option.selected = true;

        const regKey = shelter.region || "Central";
        if (shelterRegions[regKey]) {
          shelterRegions[regKey].group.appendChild(option);
        } else {
          shelterRegions["Central"].group.appendChild(option);
        }
      });

    Object.values(shelterRegions).forEach(r => {
      if (r.group.children.length > 0) shelterSelect.appendChild(r.group);
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
          <div class="map-popup-title">️ ${edge.name}</div>
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

  /**
   * Fetch real road geometry from OSRM for a point-to-node connector.
   * Returns an array of [lat, lng] points following actual roads.
   */
  async function fetchOsrmPath(fromLat, fromLng, toLat, toLng) {
    const url = `http://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
    try {
      const resp = await fetch(url, {
        headers: { "User-Agent": "KeralaSafeRoute/2.0" },
        signal: AbortSignal.timeout(10000)
      });
      const data = await resp.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const raw = data.routes[0].geometry.coordinates;
        const distKm = Math.round(data.routes[0].distance / 100) / 10;
        // Convert [lng,lat] → [lat,lng], downsample to ≤60 pts
        const latLngs = raw.map(pt => [Math.round(pt[1] * 100000) / 100000, Math.round(pt[0] * 100000) / 100000]);
        const step = Math.max(1, Math.floor(latLngs.length / 50));
        const sampled = latLngs.filter((_, i) => i % step === 0);
        if (sampled[sampled.length - 1] !== latLngs[latLngs.length - 1]) {
          sampled.push(latLngs[latLngs.length - 1]);
        }
        return { path: sampled, distKm };
      }
    } catch (_) { /* fall through to straight-line */ }
    // Fallback: straight line with haversine distance × 1.3 road factor
    const dLat = (toLat - fromLat) * Math.PI / 180;
    const dLng = (toLng - fromLng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(fromLat*Math.PI/180)*Math.cos(toLat*Math.PI/180)*Math.sin(dLng/2)**2;
    const distKm = Math.round(6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) * 1.3 * 10) / 10;
    return { path: [[fromLat, fromLng], [toLat, toLng]], distKm: Math.max(0.5, distKm) };
  }

  let customOriginMarker = null;

  // Set evacuation starting point to any arbitrary latitude & longitude on the map
  async function setCustomOrigin(lat, lng, flyTo = false) {
    state.hasUserInteracted = true;

    // Find nearest 3 nodes in Kerala graph
    const nearestNodes = Object.values(KERALA_GRAPH_DATA.nodes)
      .filter(n => n.id !== "custom_origin")
      .map(n => {
        const dLat = (n.lat - lat) * Math.PI / 180;
        const dLng = (n.lng - lng) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(n.lat * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distKm = 6371 * c;
        return { node: n, distKm };
      })
      .sort((a, b) => a.distKm - b.distKm);

    const closest = nearestNodes[0];
    const secondClosest = nearestNodes[1];
    const estimatedElevation = Math.max(1, Math.round(closest.node.elevation));

    // Register / update custom_origin node
    const customNode = {
      id: "custom_origin",
      name: `Custom Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`,
      lat: lat,
      lng: lng,
      elevation: estimatedElevation,
      type: "intersection",
      isOriginPreset: false,
      desc: `User-selected starting coordinate near ${closest.node.name} (${closest.distKm.toFixed(1)} km).`
    };
    KERALA_GRAPH_DATA.nodes["custom_origin"] = customNode;

    // Remove any previous custom connector edges
    KERALA_GRAPH_DATA.edges = KERALA_GRAPH_DATA.edges.filter(e => !e.id.startsWith("e_custom_"));

    // Add temporary straight-line connectors immediately so routing can start
    [closest, secondClosest].forEach((target, idx) => {
      const roadDist = Math.max(0.5, Math.round(target.distKm * 1.3 * 10) / 10);
      KERALA_GRAPH_DATA.edges.push({
        id: `e_custom_${idx}_${target.node.id}`,
        name: `Access Road to ${target.node.name}`,
        u: "custom_origin",
        v: target.node.id,
        distance_km: roadDist,
        capacity_veh_hr: 1500,
        elevation: estimatedElevation,
        flood_susceptibility: 0.25,
        hazard_proximity: null,
        isToggleable: false,
        path: [[lat, lng], [target.node.lat, target.node.lng]]
      });
    });

    state.selectedOrigin = "custom_origin";

    // Update originSelect dropdown
    let customOpt = originSelect.querySelector('option[value="custom_origin"]');
    if (!customOpt) {
      customOpt = document.createElement("option");
      customOpt.value = "custom_origin";
      originSelect.insertBefore(customOpt, originSelect.firstChild);
    }
    customOpt.textContent = `📍 Custom Location (${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E)`;
    originSelect.value = "custom_origin";

    // Update or create draggable marker
    if (customOriginMarker) {
      customOriginMarker.setLatLng([lat, lng]);
      if (!map.hasLayer(customOriginMarker)) {
        customOriginMarker.addTo(map);
      }
    } else {
      const customIcon = L.divIcon({
        className: "custom-drag-pin",
        html: `
          <div class="custom-drag-head">📍 Start Point (Drag)</div>
          <div class="custom-drag-beacon"></div>
        `,
        iconSize: [120, 48],
        iconAnchor: [60, 44]
      });
      customOriginMarker = L.marker([lat, lng], {
        icon: customIcon,
        draggable: true,
        zIndexOffset: 3000
      }).addTo(map);

      customOriginMarker.on("dragend", (event) => {
        const newPos = event.target.getLatLng();
        setCustomOrigin(newPos.lat, newPos.lng, false);
      });
    }

    if (flyTo) {
      map.flyTo([lat, lng], Math.max(map.getZoom(), 11), { duration: 1.0 });
    }

    // First render with straight-line connector (instant feedback)
    recalculateAndRender();

    // Now fetch real OSRM road geometry for connector edges in background
    try {
      const [r0, r1] = await Promise.all([
        fetchOsrmPath(lat, lng, closest.node.lat, closest.node.lng),
        fetchOsrmPath(lat, lng, secondClosest.node.lat, secondClosest.node.lng)
      ]);

      // Update connector edges with real road paths
      KERALA_GRAPH_DATA.edges = KERALA_GRAPH_DATA.edges.filter(e => !e.id.startsWith("e_custom_"));
      [r0, r1].forEach((result, idx) => {
        const target = idx === 0 ? closest : secondClosest;
        KERALA_GRAPH_DATA.edges.push({
          id: `e_custom_${idx}_${target.node.id}`,
          name: `Access Road to ${target.node.name}`,
          u: "custom_origin",
          v: target.node.id,
          distance_km: result.distKm,
          capacity_veh_hr: 1500,
          elevation: estimatedElevation,
          flood_susceptibility: 0.25,
          hazard_proximity: null,
          isToggleable: false,
          path: result.path  // ← Real OSRM road geometry
        });
      });

      // Re-render with accurate road-following path
      recalculateAndRender();
    } catch (_) {
      // Straight-line fallback already rendered above — no action needed
    }
  }


  function renderNodes() {
    nodeLayerGroup.clearLayers();

    Object.values(KERALA_GRAPH_DATA.nodes).forEach(node => {
      if (node.id === "custom_origin") return; // Rendered by customOriginMarker

      const isOrigin = node.id === state.selectedOrigin;
      const isShelter = node.type === "shelter";

      // If shelters are toggled off and it's a shelter (and not origin)
      if (isShelter && !state.showShelters && !isOrigin) return;

      let iconHtml = "";
      let iconClass = "custom-node-marker";

      if (isOrigin) {
        iconHtml = `<div class="origin-pin" title="Evacuation Origin: ${node.name}"></div>`;
      } else if (isShelter) {
        iconHtml = `<div class="shelter-pin" title="Safe Shelter: ${node.name}">🏥</div>`;
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
          <div class="map-popup-title">${isShelter ? '️ ' : '📍 '}${node.name}</div>
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
        chip.innerHTML = ` <span>${engineText || "Python 3.13 Backend"}</span>`;
      } else {
        chip.className = "backend-chip fallback";
        chip.innerHTML = ` <span>${engineText || "Browser Client Engine"}</span>`;
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
      closedEdgeIds: Array.from(state.closedEdges),
      nodes: KERALA_GRAPH_DATA.nodes,
      edges: KERALA_GRAPH_DATA.edges
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

    // Zoom map to fit route once the user interacts with selection
    if (state.hasUserInteracted && routeCoords.length > 1) {
      map.fitBounds(L.latLngBounds(routeCoords), {
        padding: [60, 60],
        maxZoom: 13
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
    // Multi-Criteria Optimization: Best Refuge vs Closest Refuge Callout
    const bestRefugeBox = document.getElementById("best-refuge-comparison");
    const comparisonReasonText = document.getElementById("comparison-reason-text");
    const bypassed = state.activeRouteResult?.bypassedInfo;
    if (bestRefugeBox && comparisonReasonText) {
      if (bypassed) {
        bestRefugeBox.style.display = "block";
        comparisonReasonText.innerHTML = `
          <strong> Chosen Best Haven:</strong> ${route.destinationNode?.name} (+${route.destinationNode?.elevation}m)<br>
          <span style="color:#e11d48; font-weight:700;">⚠️ Closest Refuge Bypassed:</span> ${bypassed.closestShelterName} (${bypassed.closestKm} km, +${bypassed.closestElevation}m) — low ground &amp; flood choke hazard.
        `;
      } else {
        bestRefugeBox.style.display = "none";
      }
    }

    // Distance: prefer OSRM real-road distance, fall back to graph estimate
    const displayKm = route.totalKm;
    metricDistance.innerHTML = `${displayKm} <span class="metric-unit">km</span>`;

    // Travel time: use OSRM duration if available, else estimate from speed
    if (route.osrmDurationMin) {
      metricTime.innerHTML = `${route.osrmDurationMin} <span class="metric-unit">min</span>`;
    } else {
      const avgSpeed = state.severity === 'severe' ? 22 : (state.severity === 'moderate' ? 32 : 45);
      const estMinutes = Math.round((displayKm / avgSpeed) * 60) + (route.stepCount * 2);
      metricTime.innerHTML = `${estMinutes} <span class="metric-unit">min</span>`;
    }

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

  /**
   * Fetch full OSRM route geometry from origin to shelter.
   * OSRM's driving profile prefers main roads (motorway > trunk > primary > secondary > residential).
   * Returns { path: [[lat,lng],...], distKm } or null on failure.
   */
  async function fetchOsrmFullRoute(originLat, originLng, destLat, destLng) {
    const url = `http://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(12000) });
      const data = await resp.json();
      if (data.code === "Ok" && data.routes && data.routes.length > 0) {
        const raw = data.routes[0].geometry.coordinates;
        const distKm = Math.round(data.routes[0].distance / 100) / 10;
        const durationMin = Math.round(data.routes[0].duration / 60);
        // Convert [lng,lat] → [lat,lng], downsample to ~80 pts for smooth display
        const latLngs = raw.map(pt => [Math.round(pt[1] * 100000) / 100000, Math.round(pt[0] * 100000) / 100000]);
        const step = Math.max(1, Math.floor(latLngs.length / 80));
        const sampled = latLngs.filter((_, i) => i % step === 0);
        if (sampled.length === 0 || sampled[sampled.length - 1].toString() !== latLngs[latLngs.length - 1].toString()) {
          sampled.push(latLngs[latLngs.length - 1]);
        }
        return { path: sampled, distKm, durationMin };
      }
    } catch (_) { /* fallback to graph path below */ }
    return null;
  }

  async function recalculateAndRender() {
    renderHazardZones();
    renderRoadNetwork();
    renderNodes();

    const dijkstraResult = await calculateRouteAsync();
    state.activeRouteResult = dijkstraResult;

    // Pick the route object from Dijkstra result
    const routeData = state.selectedShelter === "auto"
      ? (dijkstraResult.optimalShelterRoute || dijkstraResult.route)
      : (dijkstraResult.route || dijkstraResult.optimalShelterRoute);

    if (!routeData || !routeData.reachable) {
      renderRoute(routeData);
      return;
    }

    // Render immediately using graph-path (fast, instant feedback)
    renderRoute(routeData);

    // Get origin coordinates
    const originNode = KERALA_GRAPH_DATA.nodes[state.selectedOrigin];
    const destNode = routeData.destinationNode;
    if (!originNode || !destNode) return;

    // Fetch real OSRM full route in background (origin → shelter via main roads)
    const osrmResult = await fetchOsrmFullRoute(
      originNode.lat, originNode.lng,
      destNode.lat, destNode.lng
    );

    if (osrmResult && osrmResult.path.length > 2) {
      // Override the displayed route with real road geometry
      // Keep Dijkstra's risk/shelter metadata but use OSRM's road path
      const enhancedRoute = {
        ...routeData,
        totalKm: osrmResult.distKm,
        osrmDurationMin: osrmResult.durationMin,
        osrmPath: osrmResult.path   // Real road geometry
      };
      state.activeRouteResult = { ...dijkstraResult, _osrmEnhanced: true };
      renderRouteWithPath(enhancedRoute, osrmResult.path);
    }
  }

  /**
   * Render route using a pre-computed coordinate path (from OSRM).
   * Used when we have the real road geometry instead of the graph edge paths.
   */
  function renderRouteWithPath(routeData, coordPath) {
    routeLayerGroup.clearLayers();
    if (!routeData || !routeData.reachable || !coordPath || coordPath.length < 2) {
      renderRoute(routeData);
      return;
    }

    // Outer glow background polyline
    const bgLine = L.polyline(coordPath, {
      className: "evacuation-route-bg",
      lineCap: "round",
      lineJoin: "round"
    });

    // Inner glowing animated flow polyline
    const glowLine = L.polyline(coordPath, {
      className: "evacuation-route-glow",
      lineCap: "round",
      lineJoin: "round"
    });

    routeLayerGroup.addLayer(bgLine);
    routeLayerGroup.addLayer(glowLine);

    if (state.hasUserInteracted && coordPath.length > 1) {
      map.fitBounds(L.latLngBounds(coordPath), {
        padding: [60, 60],
        maxZoom: 13
      });
    }

    // Update Result Card with OSRM-corrected distance
    updateResultCard(routeData);
  }


  // 5. Event Listeners
  // Map Click Listener: Set evacuation starting point anywhere on the map
  map.on("click", (e) => {
    setCustomOrigin(e.latlng.lat, e.latlng.lng, false);
  });

  originSelect.addEventListener("change", (e) => {
    state.hasUserInteracted = true;
    state.selectedOrigin = e.target.value;
    if (e.target.value !== "custom_origin" && customOriginMarker && map.hasLayer(customOriginMarker)) {
      map.removeLayer(customOriginMarker);
    }
    if (e.target.value === "custom_origin" && customOriginMarker && !map.hasLayer(customOriginMarker)) {
      customOriginMarker.addTo(map);
    }
    recalculateAndRender();
  });

  shelterSelect.addEventListener("change", (e) => {
    state.hasUserInteracted = true;
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
          html: `<div class="map-capacity-tag"> ${edge.capacity_veh_hr || 1200} <span style="font-size:9px;">v/h</span></div>`,
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

  // Quick Camera Presets (Statewide Full Kerala)
  const CAM_PRESETS = {
    kerala: { center: [10.35, 76.51], zoom: 8 },
    south: { center: [8.85, 76.75], zoom: 9 },
    central: { center: [10.15, 76.35], zoom: 10 },
    highlands: { center: [10.05, 77.05], zoom: 10 },
    north: { center: [11.85, 75.60], zoom: 9 }
  };
  document.querySelectorAll(".btn-preset-cam").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".btn-preset-cam").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
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
    window.presentationDirector = presentationDirector;

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

