# Electric Freight Corridor Grid-Readiness & Siting Model

An industry-grade, professional planning dashboard designed for **SFC India** to assess nationwide grid-readiness, estimate charging demands, and plan Battery Energy Storage System (BESS) peak-shaving integration along India's National Highway freight corridors. 

This model simulates heavy-duty electric vehicle (HDT) charging demands, calculates substation capacity constraints, projects Grid Upgrade CapEx (₹ Crores), and estimates the Levelized Cost of Charging (LCOC) to de-risk green freight infrastructure investments.

---

## 🗺️ Project Structure

The project is divided into a **Python GIS Pre-processing Pipeline** and an **Interactive React/Leaflet Web Dashboard**:

```
Electric_Freight_Dashboard/
├── METHODOLOGY.md             # Detailed engineering formulations, math, and standards
├── README.md                  # Main project document (This file)
├── data_processing/           # GIS data pipelines & pre-processing
│   ├── process.py             # Generates hubs_data.json by sampling rasters & KD-Tree substation search
│   ├── process_extra.py       # Exposes highways & states boundaries
│   ├── process_railways.py    # Exposes simplified railway vectors
│   └── test_highways.py       # (Cleaned)
└── web-app/                   # React + Vite + Tailwind interactive app
    ├── src/
    │   ├── App.jsx            # App layout entry point
    │   ├── main.jsx           # React DOM bootstrap
    │   ├── store.js           # Zustand store containing MCDA scoring, LCOC, & BESS algorithms
    │   ├── index.css          # Neobrutalist custom scrollbars, typography, and Leaflet overrides
    │   └── components/
    │       ├── MapArea.jsx    # Leaflet Map with layers, popup details, & 24hr SVG load chart
    │       └── Sidebar.jsx    # Controls, sliders, presets, and scored hubs list
    ├── public/
    │   └── data/              # Output directory for processed GIS data (geojson/json)
    ├── package.json           # Front-end dependencies (leaflet, zustand, react-query)
    └── vite.config.js         # Build and watch configuration
```

---

## ⚡ Key Features & Deliverables

1. **Ranked Candidate Siting (120 Hubs)**: Computes a dynamic, prioritized **ranked list of 120 candidate charging hubs** spanning India's National Highway network. Candidates are sorted by a multi-criteria suitability score (0–100) representing their technical and commercial viability.
2. **Raw Geographic network & Multimodal Siting**: Renders the complete, unsimplified **National Highways network** (91 MB) and **Indian Railways network** (34 MB) for maximum visual and spatial precision. Hubs within $50\text{ km}$ of a railway line are flagged for multimodal road-to-rail logistics compatibility.
3. **Active Substation Siting & Capacity constraints**: Maps each candidate hub to its nearest physical substation node via projected metric calculations (UTM Zone 43N / EPSG:32643). Checks thermal limits based on **Central Electricity Authority (CEA) Grid Standards** voltage classes (220kV -> 150MW, 132/110kV -> 80MW, 33kV -> 35MW, 11kV -> 15MW) and flags grid overload risks.
4. **BESS Peak Shaving & Valley Filling**: Simulates Battery Energy Storage System (BESS) peak-shaving integration using the **IEEE Std 2030.2** guidelines to shave up to 35% of raw peak load by discharging during peak hours and recharging during off-peak valleys.
5. **24-Hour Temporal Load Curve Chart**: Features an interactive SVG chart on the map panel, comparing the hourly raw load curve against the BESS peak-shaved load grid profile across different fleet schedules (Overnight, Opportunistic, Continuous).
6. **Techno-Commercial Siting & LCOC**: Computes the **Levelized Cost of Charging (LCOC in ₹/kWh)**—modeled on the **IEA & NREL LCOE frameworks**—which integrates Time-of-Use tariffs, amortized grid upgrade costs, and battery cycle degradation.
7. **Port Drayage Electrification Indicator**: Identifies hubs located within a metric **$80\text{ km}$** drayage zone of India's 12 major operational cargo ports. Drayage hubs automatically apply a **$1.5\times$** fleet demand multiplier, matching **Smart Freight Centre (SFC) GLEC Framework** and **EPA Drayage Electrification Sizing Guidelines** for short-haul, high-density port shuttles.
8. **Infrastructural Data Sourcing**: Integrates railway corridors, cargo ports, and electrical substation layers. Explains methods to scrape and integrate logistics parks and warehouse coordinates using the **OpenStreetMap Overpass API** and Government portals like **PM Gati Shakti** and **Bhuvan**.

---

## 🛠️ Installation & Execution

### 1. GIS Data Processing (Python)
The data processing scripts require Python 3 and GIS libraries (`geopandas`, `rasterio`, `shapely`, `pandas`).

1. Activate the python virtual environment:
   ```bash
   cd data_processing
   source venv/bin/activate
   ```
2. Re-run the spatial pipeline to sample environmental rasters and compute nearest substation voltage constraints:
   ```bash
   python process.py
   python process_extra.py
   python process_railways.py
   ```
   *These scripts output clean, lightweight JSON/GeoJSON files directly into the web application's `public/data/` folder.*

### 2. Interactive Web Dashboard (React / Vite)
The front-end is built using React, Leaflet, TailwindCSS, and Zustand.

1. Navigate to the web application directory and install node modules:
   ```bash
   cd ../web-app
   npm install
   ```
2. Start the development server locally:
   ```bash
   npm run dev
   ```
   *The app will launch at `http://localhost:5173/`.*
3. Build the optimized production bundle:
   ```bash
   npm run build
   ```

---

## ⚙️ Model Paradigm (Deterministic vs. AI/ML)

Please note that this dashboard is a **Deterministic Engineering & Physics Simulation Model**. 
* **No Training Required**: It does not require any Machine Learning or neural network training. All outputs are computed instantly from established mathematical formulations, spatial GIS lookups, and power system laws.
* **100% Explainable and Audit-Ready**: There are no "black-box" predictions. All calculations for peak load, BESS shaving, grid upgrade CapEx, and LCOC are transparent and mathematically derived from physical power engineering standards (IEEE, CEA, NREL, EPRI), complying with utility interconnection requirements.
* **Instant Dynamic Recalculation**: Siting score metrics and rankings are calculated on-the-fly in browser state. Modifying weights or battery configurations immediately re-evaluates all 120 sites, updating the prioritized ranked list with zero server-side latency.

---

## 📖 Deep-Dive Methodology
For a detailed guide on the mathematical formulas, Time-of-Use tariffs, AHP MCDA suitability weights, battery degradation recovery variables, and OSM scraping scripts, please refer to:
👉 [METHODOLOGY.md](./METHODOLOGY.md)

