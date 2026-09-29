# Kerala SafeRoute: Graph-Based Disaster Evacuation & Multi-Criteria Logistics Planner

> **Executive Overview:**  
> **Kerala SafeRoute** is an intelligent disaster evacuation system designed for Emergency Operation Centers (EOCs) and civil authorities. It combines **real GIS highway networks**, **hydrological hazard mapping**, and **graph theory algorithms** to route citizens safely to high-ground sanctuaries while preventing gridlock and deadly flood traps.

---

## Slide 1: The Problem — Why Standard GPS Fails in Disasters

![Real Roadway Disaster Routing](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/real_roads_verified.png)

### The Fatal Flaw of Commercial GPS Navigation
- **Naive Distance Minimization:** Apps like Google Maps route motorists toward the geographically *closest* shelter.
- **The "Flood Trap" Hazard:** In monsoons, coastal basins (e.g., Kuttanad at $-1.5\text{m}$ to $+2\text{m}$) submerge rapidly. Evacuees sent to low-lying shelters become trapped by rising waters.
- **Ignoring Choke Points:** Standard routing ignores road throughput limits ($1,200$ vs $2,400\,\text{veh/hr}$), funneling thousands of cars into narrow rural corridors and causing statewide gridlock.

### SafeRoute's Paradigm Shift
> Rather than picking the **closest** shelter, SafeRoute picks the **safest, most resilient high-ground refuge** using multi-criteria optimization, real road curvature, and traffic flow physics.

---

## Slide 2: Interactive Statewide GIS Command Center

![Statewide GIS Command Center with Satellite Imagery](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/high_ranges_satellite_capacities.png)

### What the Web Application Does
1. **Complete 14-District Kerala Network:** Models 67 major transit hubs, 77 primary highway corridors, and 16 designated high-ground disaster relief camps across the state.
2. **Click-Anywhere Threat Origin:** Incident commanders or citizens can click *any point* on the Kerala map or search any town; the system instantly snaps to the road network and computes evacuation plans.
3. **Multi-Layer Tactical Views:**
   - 🗺️ **Street Cartography:** Clean OpenStreetMap base layer for civil navigation.
   - 🛰️ **Satellite Imagery:** High-resolution aerial reconnaissance of terrain and water bodies.
   - 🌓 **Hybrid View:** Satellite terrain overlay with highway corridor names and district boundaries.
   - 🚨 **Dark EOC Mode:** High-contrast command room visualization designed for emergency control displays.
4. **Dynamic Hazard Injection:** Real-time simulation of dam reservoir discharges, flood inundation zones (red/orange/yellow alerts), and landslide roadblocks.

---

## Slide 3: Multi-Criteria Sanctuary Selection (The Decision Engine)

![Phase 1: Fullscreen Corridor Focus](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase1_fullscreen_corridor.png)

### Beyond Distance: Holistic Evacuation Evaluation
When evaluating candidate routes from an origin (e.g., Kayamkulam on NH 66), SafeRoute calculates:

$$\text{Suitability Score} = f(\text{Travel Time}, \text{Elevation Safety}, \text{Flood Hazard Proximity}, \text{Choke Point Capacity})$$

### Live Case Study: Kayamkulam Evacuation
- **Closest Shelter:** *Alappuzha SD College Camp* ($55.4\text{km}$, $+12.5\text{m}$ elevation).
  - ❌ **Result:** **Bypassed as a dangerous Flood Trap** due to extreme proximity to the Kuttanad flood basin.
- **Selected Sanctuary:** *Kollam Kottarakkara Jubilee High Ground Camp* ($66.1\text{km}$, $+42\text{m}$ elevation).
  - ✅ **Result:** **Chosen Safe Haven**. Provides $+36\text{m}$ of elevation climb above flood levels, utilizing high-capacity multi-lane corridors ($2,200\,\text{veh/hr}$).
- **Backup Haven:** *Catholicate College High Ridge Camp* ($104.7\text{km}$, $+95\text{m}$ high-ground ridge).

---

## Slide 4: Real Roadways vs. Mathematical Graph Theory

![Phase 6: Spacious Topological Graph Layout](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase6_spacious_mathematical_graph.png)

### The Cinematic Morph Presentation
To explain the mathematical reasoning to decision-makers, SafeRoute features a full-screen theater presentation mode that seamlessly transforms physical roads into an abstract mathematical blueprint:

- **Geometric Roadways $\to$ Formal Edges ($E$):** Curving GPS highways straighten into vector graph edges with explicit weights (distance, vehicle capacity, flood risk).
- **Physical Towns $\to$ Graph Vertices ($V$):** Transit hubs transform into nodes labeled with elevation data and transit shortcodes (`KY`, `KR`, `KL`, `KO`, `AD`, `PA`, `AL`).
- **Layered Horizontal Flow:** Organizes the network from Threat Origin $S$ on the left, through transit interchanges in the center, to Candidate Sanctuaries $T$ on the right with zero visual clutter.

---

## Slide 5: The Four Core Graph Algorithms (Step-by-Step)

````carousel
![Algorithm 1: Dijkstra Priority Queue Wavefront](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase7_dijkstra.png)
<!-- slide -->
![Algorithm 2: Edmonds-Karp Vehicular Flow](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase7_maxflow.png)
<!-- slide -->
![Algorithm 3: Max-Flow Min-Cut Bottleneck Cut](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase7_mincut.png)
<!-- slide -->
![Algorithm 4: Kruskal Minimum Spanning Tree](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase7_mst.png)
````

### 1. Dijkstra & A* Wavefront Relaxation
- Dynamically relaxes graph edges wave-by-wave from the origin.
- Uses a priority queue that penalizes low elevation and saturated roads, discovering the optimal path ($66.1\text{km}$, $45\text{ min}$, low hazard index).

### 2. Edmonds-Karp Residual Flow
- Pushes vehicle volumes along parallel augmenting paths until residual capacities saturate.
- Computes maximum corridor throughput ($2,200\text{ veh/hr}$) to verify that the evacuation network can handle peak population surge.

### 3. Max-Flow Min-Cut Theorem (Bottleneck Isolation)
- Identifies the exact critical choke points in the transit network where flow is bottlenecked.
- Generates actionable civil directives for emergency services: **"Deploy Police Marshals & Enforce Contra-Flow Emergency Lanes"** on saturated road sections.

### 4. Kruskal's Minimum Spanning Tree (MST)
- Computes the minimum-distance acyclic tree connecting all 67 regional response centers and high-ground relief sanctuaries ($1,240\text{km}$ backbone).
- Establishes the priority deployment corridor for emergency communication teams, food supply convoys, and medical relief.

---

## Slide 6: Policy Output & Re-Emergence to Physical Geography

![Phase 8: Optimal Route Selected & Flagged](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase8_winning_route.png)

### The Final Actionable Policy Output
- **Primary Evacuation Path:** Highlighted in radiant cyan with simulated vehicle particle streams.
- **Saturated Choke Points:** Highlighted in flashing crimson with traffic management badges.
- **Bypassed Shelter Warnings:** Clear justification showing why closer shelters were rejected.

---

### Warping Back to Real Highways
![Phase 9: Seamless Warp Back to OpenStreetMap](C:/Users/samsu/.gemini/antigravity-ide/brain/c1360ea7-81a2-4767-8cd2-c11c384a3218/verif_phase9_warp_back.png)

At the conclusion of the mathematical demonstration, the abstract straight edges **smoothly bend and morph back into physical roads on OpenStreetMap and Satellite imagery**. The system produces turn-by-turn roadway geometry ready for immediate civilian navigation and emergency dispatch.

---

## Slide 7: Summary of Capabilities

| Operational Capability | Standard Navigation Apps | Kerala SafeRoute |
| :--- | :--- | :--- |
| **Sanctuary Destination** | Closest shelter by distance | Safest high-ground refuge (elevation $+42\text{m}$) |
| **Hazard Awareness** | Traffic delays only | Real-time flood basins, landslides & dam alerts |
| **Choke Point Analysis** | Reactive (shows traffic after it jams) | Proactive (predicts bottlenecks via Min-Cut) |
| **Roadway Modeling** | Generic ETA | Highway vehicle throughput limits ($1,200-2,400\text{v/h}$) |
| **Command Visualization** | Standard mobile directions | Cinematic 9-Phase Graph Morph & Fullscreen EOC HUD |
| **Civil Action Recommendations** | None | Automatic contra-flow and marshal deployment zones |
