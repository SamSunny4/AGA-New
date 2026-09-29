# Kerala SafeRoute: Graph Algorithms for Disaster Evacuation Planning

> **Educational Project Prototype:** All geographical coordinates, road networks, hazard inundation zones, and elevation metrics are demonstration datasets for academic and student analysis of graph algorithms. This application is **not** intended for live, real-time emergency navigation.

**Kerala SafeRoute** is an interactive web-based disaster planning tool demonstrating how fundamental graph theory algorithms support disaster evacuation and lifeline logistics in disaster-prone regions like Kochi, Kerala.

---

## 🚀 Quick Start / How to Run Locally

### Option 1: Using the Dedicated Python Backend (Recommended)
The project includes a Python backend implementing all graph algorithms (Dijkstra, A*, Kruskal, Prim, and Edmonds-Karp):
1. Open PowerShell or Terminal in the project directory (`e:\AGA New`):
   ```bash
   python server.py --port 8008
   ```
2. Open your web browser and navigate to:
   ```
   http://localhost:8008
   ```
   The application will connect to the Python backend automatically (`🐍 Python 3.13 NetworkX Engine`).

### Option 2: Direct Static Launch (With Client-Side Fallback)
You can also open `index.html` directly or serve with standard static servers:
```bash
python -m http.server 8000
```
If the Python backend is not running, the application smoothly falls back to the client-side JavaScript algorithm engines!

---

## 📂 Project Structure

```
e:\AGA New/
│
├── index.html              # Route Planner: Leaflet map, Kochi road network, Dijkstra controls
├── algorithms.html         # Algorithm Calculations: Interactive SVG workbenches & step logs
│
├── css/
│   ├── style.css           # Global design system, ultra-minimalist light mode, streamlined cards
│   ├── map.css             # Leaflet light customizations, realistic road styles, markers
│   ├── algorithms.css      # SVG graph visualizer, step table logs, execution summaries
│   └── morph-presentation.css # Stylesheet for 9-phase cinematic graph morph & audience HUD
│
├── js/
│   ├── graph-data.js       # Kochi sample network nodes, realistic GPS road paths, capacities
│   ├── dijkstra.js         # Dijkstra algorithm engine with simulated risk weights & step tracking
│   ├── mst.js              # Kruskal's (with Union-Find) and Prim's MST implementations
│   ├── maxflow.js          # Edmonds-Karp Max Flow / Min Cut calculation & residual graph
│   ├── presentation-morph.js # 9-phase animated presentation & geometric graph morph director
│   ├── app-planner.js      # Controller for index.html (Leaflet events, route rendering)
│   └── app-algorithms.js   # Controller for algorithms.html (SVG rendering, live calculations)
│
└── README.md               # Documentation, mathematical formulation & execution guide
```

---

## 🎬 Cinematic Visual Graph Transformation Mode

Clicking the **"🎬 Launch Visual Algorithm Demonstration"** button automatically **fits the entire network into the viewport** and launches a 9-phase presentation:

1. **Set Point of Origin and Destination:** Camera auto-fits and centers on the origin (e.g. Fort Kochi) and target refuge (Kakkanad Safe Camp) with glowing target rings.
2. **Available Routes Animation:** Discovers and animates candidate pathways with traveling energy pulses along the actual curved roads.
3. **Road Capacity Display:** Floats real-time vehicular throughput capacity tags (`🚗 1,200 veh/hr`, `🚗 2,400 veh/hr`) over arterial corridors.
4. **Predict Roadblocks:** Flood surge breaches low-elevation links (<3.5m); vulnerable roads flash crimson with barrier icons (`⛔ Flooded`).
5. **Screen Whiteout:** The map background dissolves into a pure white technical blueprint canvas, removing clutter and preserving only active route vectors.
6. **Morph Routes to Straight Edges & Places to Nodes:** Curvy physical roads straighten into direct mathematical edges $E$ (straight lines appear **only** during this graph theory stage!); intersections morph into formal graph vertices $V$ with elevation badges.
7. **Audience Calculation Explanations:** Explains and executes Dijkstra / A* (distance vs flood risk heuristic) and Edmonds-Karp Max Flow & Min Cut with live metric cards.
8. **Highlight Optimal Edge & Bottlenecks:** Optimal high-ground route illuminates in neon cyan; saturated Min-Cut bottleneck roads pulse in warning crimson.
9. **Warp Back to Physical Map:** Straight edges smoothly bend and warp back into the real curved roads as the light map re-emerges, locking in the final evacuation plan!

---

## 🧭 Page 1: Route Planner (`index.html`)

### Key Features
- **Map Centered on Kerala (Kochi Region):** Focuses on the urban corridor spanning Fort Kochi, Marine Drive, Edappally, Kalamassery, Aluva, Vyttila, and Kakkanad.
- **Interactive Controls:**
  - **Evacuation Starting Point:** Select from key localities or click directly on any junction pin on the map.
  - **Destination Safe Shelter:** Choose "Auto-Select Safest & Closest Safe Hub" or pick specific shelters (Kakkanad Civil Station, Ernakulam Town Hall, Aluva UC College).
  - **Disaster Scenario:** Choose between Monsoon Flash Flood (river surge), Coastal Storm Surge (tidal inundation), or Urban Waterlogging (canal backup).
  - **Severity Alert Level:** Yellow (Low, 1.0x), Orange (Moderate, 1.8x), or Red Alert (Severe, 3.0x).
  - **Road Closure Simulation:** Interactive checkboxes to simulate submerged bridges (e.g. Cheranalloor Link) or breached highways. You can also click on any road line on the map to toggle its closure.
  - **Reset Button:** Instantly restores the default safe configuration.
- **Result Card:**
  - Suggested safe refuge destination with capacity and elevation.
  - Estimated travel distance (km) and evacuation duration under alert delays.
  - **Simulated Risk Score (0 - 100):** Clearly labeled transparent heuristic.
  - Step-by-step waypoint itinerary detailing each intersection traversed.
- **Map Display & Overlays:**
  - Distinct layers for Hazard Zones (Periyar River Basin, Vembanad Backwaters, Edappally Canal), Road Network, and Safe Shelters with toggle switches.
  - Visible OpenStreetMap attribution.
  - Interactive map legend.

---

## 🧮 Page 2: Algorithm Calculations (`algorithms.html`)

The interactive calculations workbench runs algorithms in pure JavaScript and explains each step in plain language with live SVG graph diagrams:

### 1. Dijkstra's Shortest & Safest Path
- **How it works:** Iteratively selects the unvisited vertex with lowest tentative cost, relaxing neighbor edge costs until the destination is reached.
- **Edge Weight Formulation:**
  $$W_e = \text{Distance}_e \times \left(1 + 2.5 \times \frac{\text{SimulatedRisk}_e}{100}\right)$$
  $$\text{SimulatedRisk}_e = \min\left(99, \left( \text{Susceptibility} \times 45 + \text{ElevationPenalty} \times 35 + \text{HazardProximity} \times 20 \right) \times \frac{\text{SeverityMultiplier}}{1.5} \right)$$
- **Disaster Application:** Explains why navigating strictly by distance can guide evacuees into submerged valleys. Dijkstra automatically favors elevated ridges (+15m) when risk is factored in.

### 2. Minimum Spanning Tree (MST: Kruskal's & Prim's)
- **Kruskal's Algorithm:** Sorts all edges in non-decreasing order of weight and uses Disjoint Set Union (Union-Find) with path compression to add edges that do not create cycles.
- **Prim's Algorithm:** Begins at an emergency operations seed hub and greedily adds the minimum-weight crossing edge until all vertices are in the tree.
- **Disaster Application:** Models rapid deployment of minimum-cost emergency satellite links, tactical wireless VHF relays, or minimum clearance bulldozer road clearing connecting all relief centers without redundancy.

### 3. Maximum Flow & Minimum Cut (Edmonds-Karp)
- **Edmonds-Karp Algorithm:** Computes maximum vehicle throughput per hour using Breadth-First Search (BFS) to find augmenting paths in the residual graph.
- **Minimum Cut Identification:** Identifies the set of saturated bottleneck edges that partition reachable nodes from unreachable nodes in the residual graph.
- **Max-Flow Min-Cut Theorem:** Verifies that $\text{Max Flow} = \text{Capacity of Minimum Cut}$.
- **Disaster Application:** Demonstrates that widening non-bottleneck roads gives zero improvement in evacuation evacuation rate; traffic police and contraflow lanes must be deployed specifically on the identified Minimum Cut bottleneck roads.

---

## 📄 License & Attribution
- Map tiles by **OpenStreetMap** (ODbL).
- Built with **Leaflet.js** (BSD-2-Clause).
- Created as an open student project for educational demonstration.
