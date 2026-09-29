# Kerala SafeRoute: Statewide Disaster Evacuation & Multi-Criteria Logistics Planner

> **Academic & Educational Project:** All geographical coordinates, road topologies, flood inundation zones, and elevation models are curated demonstration datasets for computer science and disaster management analysis.

**Kerala SafeRoute** is an interactive, graph-theoretic disaster evacuation decision-support system. It combines **statewide real GIS road networks**, **hydrological hazard mapping**, and **graph theory algorithms** to route citizens safely to high-ground sanctuaries while proactively identifying highway bottlenecks and preventing deadly flood-basin traps.

---

## 🌟 Key Capabilities & Innovations

- 🗺️ **Statewide 14-District Road Network:** Models 67 primary transit interchanges, 77 critical highway corridors, and 16 designated high-ground disaster relief sanctuaries across all districts of Kerala.
- 🛣️ **High-Fidelity Real Road Curvatures:** Routes hug actual physical road curves and highway alignments on OpenStreetMap rather than naive straight lines.
- 📍 **Click-Anywhere Origin Snapping:** Click *any* point on the Kerala map or search any town; the system automatically snaps to the nearest highway junction and generates the optimal evacuation corridor.
- 🛰️ **Multi-Layer Tactical GIS Modes:** Switch between Street View (OSM), High-Resolution Satellite reconnaissance, Hybrid terrain with corridor names, Topographic contours, and Dark Emergency Operations Center (EOC) Command mode.
- ⚖️ **Multi-Criteria Sanctuary Optimization (Beyond Closest Distance):**
  - Standard GPS routing naively directs evacuees to the geographically *closest* shelter, often funneling them into submerged lowlands (e.g. Kuttanad basin at $-1.5\text{m}$ to $+2\text{m}$).
  - SafeRoute calculates a holistic suitability score factoring **Travel Time**, **Road Vehicle Capacities** ($1,200 - 2,400\,\text{veh/hr}$), **Elevation Safety Climb** (favoring sanctuaries $+42\text{m}$ above sea level), and **Flood Inundation Proximity**, automatically bypassing hazardous shelters.
- 🎬 **Cinematic Fullscreen Graph Theory Presentation Mode:**
  - **Native Fullscreen Theater (`100vw × 100vh`):** Removes peripheral clutter for command center briefings.
  - **Candidate Corridor Zoom:** Automatically isolates candidate safe havens and zooms tightly into the active corridor at Zoom 11–12.
  - **Spacious Topological Graph Blueprint:** Morphs physical GIS highways into a spacious, zero-collision horizontal graph layout ($G = (V, E)$) with non-overlapping edge capacity chips.
  - **Interactive 4-Algorithm Lab:** Visualizes Dijkstra Priority Queue wavefronts, Edmonds-Karp Residual Flow, Max-Flow Min-Cut bottleneck isolation, and Kruskal Minimum Spanning Tree (MST).
  - **Smooth Re-Emergence:** Seamlessly warps abstract straight edges back into real curving GPS highways.

---

## 🚀 Quick Start / How to Run Locally

### Option 1: Dedicated Python 3.13 NetworkX Backend (Recommended)
The project includes a Python backend implementing all graph algorithms using NetworkX with full REST API endpoints:
1. Open PowerShell or Terminal in the project root:
   ```bash
   python server.py --port 8008
   ```
2. Open your web browser and navigate to:
   ```
   http://localhost:8008
   ```
   The application displays `🐍 Python 3.13 NetworkX Engine` when connected.

### Option 2: Direct Static Server (Client-Side JS Fallback)
If Python is not installed, the application runs standalone in any browser with client-side JavaScript algorithm engines:
```bash
python -m http.server 8000
# or npx serve ./
```

---

## 📂 Project Architecture

```
e:\AGA New/
│
├── server.py                   # Python 3.13 HTTP + REST API Server (Endpoints: /api/solve, /api/network)
├── backend/
│   ├── dijkstra.py             # Python NetworkX multi-criteria Dijkstra & shelter suitability engine
│   ├── maxflow.py              # Edmonds-Karp Max-Flow and Min-Cut bottleneck analysis
│   └── mst.py                  # Kruskal and Prim Minimum Spanning Tree algorithms
│
├── index.html                  # Interactive GIS Evacuation Command Center
├── algorithms.html             # Multi-Algorithm Workbench & step-by-step mathematical logs
│
├── css/
│   ├── style.css               # Design system, glassmorphism UI tokens, responsive layouts
│   ├── map.css                 # Tactical map themes (Satellite, Street, Dark EOC, Road styling)
│   ├── algorithms.css          # SVG algorithmic workbenches and execution tables
│   └── morph-presentation.css  # Fullscreen presentation mode, HUD cards & SVG animations
│
├── js/
│   ├── graph-data.js           # Statewide Kerala nodes (67), real road paths (77), and shelters (16)
│   ├── dijkstra.js             # Client-side multi-criteria Dijkstra routing engine
│   ├── maxflow.js              # Client-side Edmonds-Karp & Min-Cut calculation
│   ├── mst.js                  # Client-side Kruskal (Union-Find) and Prim MST engines
│   ├── presentation-morph.js   # 9-Phase fullscreen presentation director & topological layout engine
│   ├── app-planner.js          # Controller for index.html (Leaflet map events, UI bindings)
│   └── app-algorithms.js       # Controller for algorithms.html (SVG rendering, live workbench)
│
└── README.md                   # System documentation & mathematical formulations
```

---

## 🎬 9-Phase Graph Transformation Lifecycle

Clicking **"🎬 Launch Visual Algorithm Demonstration"** initiates the theater presentation:

1. **Phase 1: Strategic Sanctuary Selection**  
   Evaluates all statewide shelters. Bypasses low-lying traps and locks onto candidate high-ground havens, tightly zooming the camera into the corridor.
2. **Phase 2: Evacuation Corridor Discovery**  
   Illuminates viable multi-lane highways and transit paths with animated traveling particle pulses.
3. **Phase 3: Highway Throughput Capacities**  
   Renders vehicle volume capacity badges (`1,200 - 2,400 veh/hr`) directly along highway corridors.
4. **Phase 4: Dynamic Hazard Breaches**  
   Simulates dam releases and river inundations; breaches low-elevation roads with pulsing roadblock warnings (`⛔ Submerged`).
5. **Phase 5: Environmental Isolation**  
   Fades out external cartography into a clean white blueprint canvas, focusing strictly on viable evacuation vectors.
6. **Phase 6: Morphing Geometry to Graph Theory**  
   Physical curvy roads straighten into vector edges $E$; transit hubs snap into formal vertices $V$ arranged horizontally from Source $S$ to Sinks $T$ with zero vertical congestion.
7. **Phase 7: Executing Graph Algorithms (Multi-Algorithm Lab)**  
   - **Dijkstra Wavefront:** Step-by-step priority queue relaxation factoring distance, congestion, and flood hazards.
   - **Edmonds-Karp Residual Flow:** Pushes vehicular volume through parallel augmenting paths to compute peak corridor flow ($2,200\,\text{veh/hr}$).
   - **Max-Flow Min-Cut Theorem:** Pinpoints critical bottleneck cuts and flags directives for police marshals and contra-flow lanes.
   - **Kruskal's MST:** Deploys an acyclic emergency communications and relief supply backbone ($1,240\,\text{km}$) without redundant cycles.
8. **Phase 8: Optimal Route Selected & Flagged**  
   Highlights the chosen high-ground route in radiant cyan and displays traffic management mandates.
9. **Phase 9: Warping Back to Physical Geography**  
   Vector graph edges bend and warp back into physical highway curves on OpenStreetMap/Satellite imagery, providing turn-by-turn geometry.

---

## 🧮 Mathematical Formulations

### 1. Multi-Criteria Route Suitability Formulation
Rather than minimizing raw distance $\sum d_e$, the engine minimizes composite evacuation impedance:

$$W_e = \text{Distance}_e \times \left(1 + \text{CongestionFactor}_e\right) \times \left(1 + 2.5 \times \frac{\text{RiskScore}_e}{100}\right)$$

Where the hazard exposure risk score is derived from hydrological and terrain parameters:

$$\text{RiskScore}_e = \min\left(99, \left( \text{Susceptibility}_e \times 40 + \text{ElevationPenalty}_e \times 35 + \text{HazardProximity}_e \times 25 \right) \times \text{SeverityMultiplier}\right)$$

### 2. Multi-Criteria Shelter Selection
Each candidate sanctuary $s$ is evaluated holistically:

$$\text{SuitabilityScore}(s) = \text{Cost}(s) \times M_{\text{elevation}}(s) \times M_{\text{choke}}(s) \times M_{\text{capacity}}(s)$$

- **Elevation Safety Factor ($M_{\text{elevation}}$):** High ground ($\ge 25\text{m}$) receives up to a $35\%$ safety discount ($M \le 0.65$), while flood basins ($< 3.5\text{m}$) receive a punitive $1.95\times$ danger penalty.
- **Choke Point Penalty ($M_{\text{choke}}$):** Routes constrained by low-capacity bottlenecks ($< 1,400\text{ veh/hr}$) receive up to a $40\%$ penalty.

### 3. Max-Flow Min-Cut Theorem
Given a flow network $G = (V, E)$ with source $S$ and sink $T$:

$$\max |f| = \min_{S\text{-}T\text{ cuts } (A, B)} c(A, B) = \sum_{u \in A, v \in B} c(u, v)$$

Edges saturated in the minimum cut represent the definitive ceiling on evacuation throughput, directing where emergency marshals must deploy contra-flow traffic lanes.

---

## 📄 License & Attribution
- Cartography data © **OpenStreetMap** contributors (ODbL).
- Aerial Imagery © **ESRI World Imagery** & contributors.
- Mapping Engine powered by **Leaflet.js** (BSD-2-Clause).
- Created for educational research and disaster management simulation.
