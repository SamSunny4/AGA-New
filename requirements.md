# System Requirements Specification: Kerala SafeRoute / PlanEsc

This document details the complete **Software Requirements** and **Hardware Requirements** for deploying, running, and interacting with the **Kerala SafeRoute (PlanEsc)** Statewide Disaster Evacuation & Multi-Criteria Logistics Planning System.

---

## 1. System Overview & Architecture Scope

Kerala SafeRoute is an interactive, graph-theoretic disaster evacuation decision-support system. It evaluates statewide GIS road networks, hydrological hazards, elevation terrain, and vehicle throughput capacities using graph algorithms (Dijkstra, A*, Edmonds-Karp Max-Flow / Min-Cut, and Kruskal/Prim MST). 

The system operates in a dual-mode hybrid architecture:
1. **Dedicated Python REST Backend Mode (Recommended):** High-performance server processing complex graph operations via Python 3.8+.
2. **Client-Side Standalone Web Mode (Fallback):** Complete browser-native JavaScript fallback engine allowing full zero-dependency offline/static execution.

---

## 2. Software Requirements

### 2.1 Backend Software Requirements (Server / Engine)

| Software Component | Minimum Version | Recommended Version | Purpose / Function |
| :--- | :--- | :--- | :--- |
| **Python Runtime** | `Python 3.8+` | `Python 3.13` | Backend HTTP API Server (`server.py`) & algorithmic execution |
| **Standard Library Modules** | `http.server`, `urllib`, `json`, `heapq`, `math`, `argparse` | Built-in | Core HTTP REST routing, JSON parsing, priority queues |
| **NetworkX (Optional)** | `v2.5` | `v3.x` | Extended topological graph analysis and backend processing |
| **Static Web Server (Alt.)** | `Python http.server` / `Node.js serve` / `Nginx` | `Python 3.13 ThreadingHTTPServer` | Static asset serving when running standalone |

> [!NOTE]
> The backend server uses standard Python modules (`http.server.ThreadingHTTPServer`), eliminating third-party framework overhead (like Flask or Django) for rapid single-command deployment.

---

### 2.2 Frontend Software Requirements (Client / Browser)

| Component | Minimum Specification | Recommended Specification | Purpose |
| :--- | :--- | :--- | :--- |
| **Web Browser** | Chrome 90+, Firefox 88+, Edge 90+, Safari 14+ | Google Chrome 120+ / MS Edge 120+ | Execution of ES6+ JavaScript, CSS SVG animations & canvas |
| **JavaScript Engine** | ES6 / ECMAScript 2015 Support | Modern V8 / SpiderMonkey | Client-side algorithm execution & 9-phase morphing director |
| **Leaflet.js** | `v1.9.4` (via CDN or bundled) | `v1.9.4` | Interactive GIS mapping, tile layer rendering, polyline vectors |
| **CSS Standards** | CSS3 Grid, Flexbox, CSS Variables, Backdrop Filter | Modern CSS Engine | Dark EOC Command UI, glassmorphism design tokens, theater transitions |
| **Vector Graphics** | SVG 2.0 | SVG 2.0 Native Hardware Accelerated | Smooth graph morphing animations and horizontal topology blueprints |

---

### 2.3 Operating System & Environment Compatibility

| Platform | Supported Versions | Status |
| :--- | :--- | :--- |
| **Windows** | Windows 10, Windows 11, Windows Server 2019+ | Fully Supported (Native PowerShell / CMD) |
| **Linux** | Ubuntu 20.04+, Debian 11+, RHEL 8+, Alpine 3.15+ | Fully Supported (Systemd daemon / CLI) |
| **macOS** | macOS Monterey (12.0) or newer | Fully Supported (zsh / bash) |

---

### 2.4 External GIS Data Sources & Web Services

- **OpenStreetMap (OSM) Tiles:** `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- **ESRI World Imagery Satellite Tiles:** `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`
- **CartoDB Dark Matter / Emergency Mode Tiles:** `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- **OpenTopoMap Topographic Contours:** `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`

*(Note: Map tile layers are dynamically cached; offline fallback map tiles can be pre-rendered for air-gapped Emergency Operation Centers).*

---

## 3. Hardware Requirements

### 3.1 Client Hardware Specifications (User / Evacuee Workstation)

| Resource | Minimum Requirement | Recommended Requirement |
| :--- | :--- | :--- |
| **Processor (CPU)** | Dual-core 2.0 GHz (x86-64 or ARM64) | Quad-core 2.8 GHz+ (Intel i5/i7, AMD Ryzen 5, Apple Silicon M1+) |
| **System Memory (RAM)** | 4 GB | 8 GB or higher |
| **Graphics (GPU)** | Integrated Graphics (Intel HD 5000 / AMD Vega) | Dedicated GPU or Apple Metal / NVidia GTX 1050+ (WebGL hardware acceleration) |
| **Display Resolution** | $1280 \times 720$ (HD) | $1920 \times 1080$ (Full HD) or $2560 \times 1440$ (2K QHD) |
| **Storage Space** | 200 MB available storage | 1 GB SSD (for local tile caching & logs) |

---

### 3.2 Command Center / Fullscreen Theater Hardware Specifications

For deploying the **Cinematic 9-Phase Graph Transformation Theater** on high-resolution command center displays:

| Resource | Command Center Specification |
| :--- | :--- |
| **Display Unit** | 4K Ultra HD Monitor ($3840 \times 2160$) / Video Wall array |
| **Aspect Ratio** | Standard 16:9 widescreen ($100\text{vw} \times 100\text{vh}$) |
| **GPU VRAM** | 4 GB VRAM (for smooth 60fps vector morphing of 77 high-density highway curves) |
| **Refresh Rate** | 60 Hz minimum |

---

### 3.3 Server Hardware Specifications (Disaster Management Operations Server)

When hosting the Python REST API server (`server.py`) for simultaneous multi-agency disaster operations:

| Resource | Small Deployment (Local EOC) | Enterprise Regional Deployment (Statewide) |
| :--- | :--- | :--- |
| **CPU Cores** | 2 vCPUs @ 2.4 GHz | 8 vCPUs @ 3.2 GHz+ |
| **System RAM** | 4 GB | 16 GB |
| **Storage** | 10 GB SSD | 50 GB NVMe SSD |
| **Network Interface** | 100 Mbps NIC | 1 Gbps / 10 Gbps Redundant NICs |
| **Concurrent Requests** | Up to 100 req/sec | 2,500+ req/sec (Threaded HTTPServer) |

---

## 4. Network & Bandwidth Requirements

| Connectivity Scenario | Minimum Bandwidth | Notes |
| :--- | :--- | :--- |
| **Online Operations (Live Map Tiles)** | 2.0 Mbps per active client | Required for fetching live OpenStreetMap / ESRI Satellite raster tiles |
| **Local Network / LAN (EOC Server)** | 100 Mbps LAN | Zero internet dependency if local tile server / vector caches are present |
| **Air-Gapped Offline Mode** | 0 Mbps (Disconnected) | Algorithms and topological graph engine operate 100% locally in browser memory |

---

## 5. Quick Verification & Installation Commands

### 1. Verify Software Prerequisites
```bash
# Check Python installation
python --version   # Output must be Python 3.8+ (Python 3.13 recommended)

# Verify optional NetworkX availability
python -c "import networkx; print(networkx.__version__)"
```

### 2. Launching Backend & Static Server
```bash
# Recommended REST API + Static Server (Port 8008)
python server.py --port 8008

# Alternative Direct Static Web Server
python -m http.server 8000
```
