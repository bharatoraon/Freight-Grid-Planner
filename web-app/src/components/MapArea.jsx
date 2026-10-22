import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import { useStore, CORRIDORS, getTemporalLoadProfile } from '../store';
import { Layers, Activity, Zap, Compass, ShieldAlert, AlertTriangle, Info, MapPin, Map as MapIcon, Key } from 'lucide-react';

const HL_EMERALD = "#10B981";
const HL_YELLOW = "#FBBF24";
const HL_BLUE = "#3B82F6";
const HL_PURPLE = "#8B5CF6";
const HL_RED = "#EF4444";

const BASEMAP_OPTIONS = [
  {
    id: "canvas",
    label: "Canvas",
    attribution: 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ',
    maxZoom: 16,
    light: {
      base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      reference: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    },
    dark: {
      base: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      reference: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
    }
  },
  {
    id: "osm",
    label: "OSM Street",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
    light: {
      base: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    },
    dark: {
      base: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    }
  },
  {
    id: "satellite",
    label: "Satellite",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 18,
    light: {
      base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    },
    dark: {
      base: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
    }
  },
  {
    id: "carto",
    label: "CARTO (Key)",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
    light: {
      base: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    },
    dark: {
      base: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    }
  }
];

const MAP_LAYERS = [
  { id: "hubs", label: "Charging Hubs", color: HL_EMERALD, defaultOn: true },
  { id: "substations", label: "Substations", color: HL_YELLOW, defaultOn: true },
  { id: "grid-lines", label: "Grid Links", color: "#000000", defaultOn: true },
  { id: "india-states", label: "India Boundaries", color: "#888888", defaultOn: true },
  { id: "national-highways", label: "National Highways", color: HL_BLUE, defaultOn: true },
  { id: "indian-railways", label: "Indian Railways", color: HL_PURPLE, defaultOn: true },
  { id: "india-mmlps", label: "Logistics Parks (MMLPs)", color: HL_RED, defaultOn: true }
];

// Neobrutalist Custom Marker Icon builder
const markerIcon = (color, text, isSelected = false) => L.divIcon({
  html: `<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;">
    <div style="
      width:${isSelected ? '28px' : '22px'};
      height:${isSelected ? '26px' : '22px'};
      border-radius:50%;
      background:${color};
      border:2px solid #000;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:${isSelected ? '11px' : '9px'};
      font-weight:900;
      color:${color === '#FBBF24' ? '#000' : '#fff'};
      font-family:'Space Grotesk', sans-serif;
      box-shadow:2px 2px 0 #000;
      transition: all 0.2s ease-in-out;
      transform: ${isSelected ? 'scale(1.15)' : 'none'};
    ">
      ${text}
    </div>
  </div>`,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17]
});

const MapController = () => {
  const map = useMap();
  const { corridor, selectedHub } = useStore();

  useEffect(() => {
    const config = CORRIDORS[corridor];
    if (config) {
      map.setView(config.center, config.zoom);
    }
  }, [corridor, map]);

  useEffect(() => {
    if (selectedHub) {
      map.setView(selectedHub.location, 9);
    }
  }, [selectedHub, map]);

  return null;
};

export default function MapArea({ theme }) {
  const store = useStore();
  const scoredHubs = store.getScoredHubs();
  const activeLayers = store.activeLayers;

  const toggleLayer = (id) => {
    store.toggleLayer(id);
  };

  // Pre-fetch data
  useEffect(() => {
    if (!store.hubs.length) {
      fetch('/data/hubs_data.json')
        .then(res => res.json())
        .then(data => store.setHubs(data.hubs))
        .catch(err => console.error("Failed to load hubs data", err));
    }
    if (!store.indiaStates) {
      fetch('/data/india_states_simple.geojson')
        .then(res => res.json())
        .then(data => store.setIndiaStates(data))
        .catch(err => console.error("Failed to load india states outline", err));
    }
    if (!store.majorHighways) {
      fetch('/data/major_highways_simple.geojson')
        .then(res => res.json())
        .then(data => store.setMajorHighways(data))
        .catch(err => console.error("Failed to load national highways", err));
    }
    if (!store.indianRailways) {
      fetch('/data/indian_railways_simple.geojson')
        .then(res => res.json())
        .then(data => store.setIndianRailways(data))
        .catch(err => console.error("Failed to load indian railways", err));
    }
    if (!store.indiaMmlps) {
      fetch('/data/india_mmlps.geojson')
        .then(res => res.json())
        .then(data => store.setIndiaMmlps(data))
        .catch(err => console.error("Failed to load india MMLPs", err));
    }
  }, []);

  // Compute summary stats
  const totalPeakLoad = scoredHubs.reduce((acc, h) => acc + h.peakLoadMW, 0);
  const avgSubstationDist = scoredHubs.length > 0
    ? (scoredHubs.reduce((acc, h) => acc + h.nearest_substation.distance_km, 0) / scoredHubs.length).toFixed(1)
    : 0;
  const topScore = scoredHubs.length > 0 ? scoredHubs[0].score : 0;

  const StatBlock = ({ icon: Icon, label, value }) => (
    <div className="flex flex-col justify-center px-4 py-2 shrink-0 border-r-2 border-black">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon size={10} className="text-zinc-600 dark:text-zinc-400" />
        <span style={{ fontSize: 8, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#555" }}>{label}</span>
      </div>
      <div style={{ fontSize: 13, fontWeight: 900, color: "#000" }} className="font-mono">{value}</div>
    </div>
  );

  const [basemapId, setBasemapId] = useState(() => localStorage.getItem("basemap_type") || "canvas");
  const [cartoApiKey, setCartoApiKey] = useState(() => import.meta.env.VITE_CARTO_API_KEY || localStorage.getItem("carto_api_key") || "");
  const [showKeyInput, setShowKeyInput] = useState(false);

  const handleBasemapChange = (id) => {
    setBasemapId(id);
    localStorage.setItem("basemap_type", id);
    if (id === "carto" && !cartoApiKey) {
      setShowKeyInput(true);
    }
  };

  const saveCartoKey = (key) => {
    const trimmed = key.trim();
    setCartoApiKey(trimmed);
    localStorage.setItem("carto_api_key", trimmed);
  };

  const currentBasemap = BASEMAP_OPTIONS.find(b => b.id === basemapId) || BASEMAP_OPTIONS[0];
  const basemapStyle = theme ? currentBasemap.dark : currentBasemap.light;
  let primaryTileUrl = basemapStyle.base;
  if (basemapId === "carto" && cartoApiKey) {
    primaryTileUrl = `${primaryTileUrl}?key=${encodeURIComponent(cartoApiKey)}`;
  }

  const selected = store.selectedHub;
  const scoredSelected = selected ? scoredHubs.find(h => h.id === selected.id) : null;

  return (
    <div className="w-full h-full relative z-0">
      
      {/* Sidebar Controls Stack (Basemap, Layers & Legend) */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-3 w-[200px]">
        {/* Basemap Selection Panel */}
        <div className="flex flex-col gap-1.5 p-3" style={{ background: "#F4F4F0", border: "2.5px solid #000", boxShadow: "3px 3px 0 #000", fontFamily: "'Space Grotesk', sans-serif" }}>
          <div className="flex items-center justify-between mb-0.5">
            <div className="text-[9px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
              <MapIcon size={11} />
              Basemap
            </div>
            {basemapId === "carto" && (
              <button 
                type="button" 
                onClick={() => setShowKeyInput(!showKeyInput)}
                title="Configure CARTO API Key"
                className="text-[8px] font-black uppercase px-1 py-0.5 border border-black bg-white hover:bg-yellow-200 transition-colors"
              >
                Key
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-1.5">
            {BASEMAP_OPTIONS.map(bm => {
              const isActive = basemapId === bm.id;
              return (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => handleBasemapChange(bm.id)}
                  className="px-2 py-1 text-[8.5px] font-black uppercase tracking-wide transition-all text-center"
                  style={{
                    background: isActive ? "#000" : "#fff",
                    color: isActive ? "#fff" : "#000",
                    border: "1.5px solid #000",
                    boxShadow: isActive ? "1.5px 1.5px 0 #3B82F6" : "1px 1px 0 #000"
                  }}
                >
                  {bm.label}
                </button>
              );
            })}
          </div>

          {/* Optional CARTO Key Config Drawer */}
          {showKeyInput && (
            <div className="mt-2 pt-2 border-t border-black/30 flex flex-col gap-1">
              <label className="text-[8px] font-black uppercase tracking-wider text-black flex items-center gap-1">
                <Key size={9} />
                CARTO API Key:
              </label>
              <input
                type="password"
                placeholder="Paste CARTO Key"
                value={cartoApiKey}
                onChange={(e) => saveCartoKey(e.target.value)}
                className="w-full text-[9px] px-1.5 py-1 font-mono border border-black bg-white focus:outline-none focus:ring-1 focus:ring-black"
              />
              <div className="text-[7.5px] text-zinc-600 leading-tight">
                Free key at <a href="https://carto.com/basemaps/apikey" target="_blank" rel="noreferrer" className="underline font-bold">carto.com</a>
              </div>
            </div>
          )}
        </div>

        {/* Layers Control Panel */}
        <div className="flex flex-col gap-1.5 p-3" style={{ background: "#F4F4F0", border: "2.5px solid #000", boxShadow: "3px 3px 0 #000", fontFamily: "'Space Grotesk', sans-serif" }}>
          <div className="text-[9px] font-black uppercase tracking-widest text-black mb-1 flex items-center gap-1.5">
            <Layers size={11} />
            Layers
          </div>
          {MAP_LAYERS.map(layer => {
            const isActive = activeLayers.has(layer.id);
            const isDarkBg = layer.id === "grid-lines" || layer.id === "india-states";
            return (
              <button 
                key={layer.id} 
                type="button" 
                onClick={() => toggleLayer(layer.id)} 
                className="flex items-center gap-2 px-2.5 py-1 text-[9px] font-black uppercase tracking-wide transition-all" 
                style={{ 
                  background: isActive ? layer.color : "transparent", 
                  color: isActive ? (isDarkBg ? "#fff" : "#000") : "#888", 
                  border: `1.5px solid ${isActive ? "#000" : "#ccc"}`, 
                  boxShadow: isActive ? "1.5px 1.5px 0 #000" : "none" 
                }}
              >
                <span className="w-2.5 h-2.5 shrink-0" style={{ background: isActive ? (isDarkBg ? "#fff" : "#000") : layer.color, border: "1.5px solid #000" }} />
                {layer.label}
              </button>
            );
          })}
        </div>

        {/* Map Legend Panel */}
        <div className="p-3 flex flex-col gap-2" style={{ background: "#F4F4F0", border: "2.5px solid #000", boxShadow: "3px 3px 0 #000", fontFamily: "'Space Grotesk', sans-serif" }}>
          <div className="text-[9px] font-black uppercase tracking-widest text-black mb-0.5">Legend</div>
          <div className="flex flex-col gap-2 text-[9px] font-black tracking-wide text-zinc-900">
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-black shrink-0" style={{ background: HL_EMERALD }} />
              <span>Candidate Charging Hub</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 rounded-full border-2 border-black flex items-center justify-center text-[8px] shrink-0" style={{ background: HL_YELLOW }}>⚡</span>
              <span>Grid Substation</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-1 shrink-0" style={{ background: HL_BLUE }} />
              <span>National Highway</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-1 border-t-2 border-dashed shrink-0" style={{ borderColor: HL_PURPLE }} />
              <span>Indian Railway Line</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-1 border-t-2 border-dashed border-black shrink-0" />
              <span>Feeder Grid Link</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="w-3.5 h-3.5 border-2 border-black flex items-center justify-center text-[7px] shrink-0" style={{ background: HL_RED }}>📦</span>
              <span>Logistics Park (MMLP)</span>
            </div>
          </div>
        </div>
      </div>

      <MapContainer 
        center={CORRIDORS[store.corridor].center} 
        zoom={CORRIDORS[store.corridor].zoom} 
        zoomControl={false} 
        className="w-full h-full"
      >
        {/* Base Tile Layer */}
        <TileLayer 
          key={`${basemapId}-${theme ? 'dark' : 'light'}-base-${cartoApiKey}`}
          url={primaryTileUrl}
          attribution={currentBasemap.attribution}
          maxZoom={currentBasemap.maxZoom || 19}
        />
        {/* Reference / Labels Overlay Layer (if defined, e.g. for Esri Canvas) */}
        {basemapStyle.reference && (
          <TileLayer 
            key={`${basemapId}-${theme ? 'dark' : 'light'}-ref`}
            url={basemapStyle.reference}
            attribution=""
            maxZoom={currentBasemap.maxZoom || 16}
          />
        )}
        <MapController />

        {/* Display India States Boundary Outline */}
        {activeLayers.has("india-states") && store.indiaStates && (
          <GeoJSON 
            data={store.indiaStates} 
            pathOptions={{ 
              color: theme ? "#f5f5f5" : "#000000", 
              weight: 2, 
              fillColor: theme ? "#1a1a1a" : "#fff", 
              fillOpacity: 0.05, 
              opacity: 0.85 
            }} 
          />
        )}

        {/* Display Actual National Highways */}
        {activeLayers.has("national-highways") && store.majorHighways && (
          <GeoJSON 
            data={store.majorHighways} 
            pathOptions={{ 
              color: HL_BLUE, 
              weight: 1.8, 
              opacity: 0.65 
            }} 
            onEachFeature={(feature, layer) => {
              if (feature.properties && feature.properties.Name) {
                layer.bindPopup(`<strong>Highway:</strong> ${feature.properties.Name}`);
              }
            }}
          />
        )}

        {/* Display Indian Railways */}
        {activeLayers.has("indian-railways") && store.indianRailways && (
          <GeoJSON 
            data={store.indianRailways} 
            pathOptions={{ 
              color: HL_PURPLE, 
              weight: 1.2, 
              dashArray: "3, 5",
              opacity: 0.6 
            }} 
          />
        )}

        {/* Display Multi-Modal Logistics Parks (MMLPs) */}
        {activeLayers.has("india-mmlps") && store.indiaMmlps && (
          <GeoJSON 
            data={store.indiaMmlps} 
            pointToLayer={(feature, latlng) => {
              return L.marker(latlng, {
                icon: L.divIcon({
                  html: `<div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;">
                    <div style="
                      width:18px;
                      height:18px;
                      border-radius:3px;
                      background:${HL_RED};
                      border:1.5px solid #000;
                      box-shadow:1.5px 1.5px 0 #000;
                      display:flex;
                      align-items:center;
                      justify-content:center;
                      font-size:9px;
                      font-weight:900;
                      color:#fff;
                      font-family:'Space Grotesk', sans-serif;
                    ">
                      📦
                    </div>
                  </div>`,
                  className: '',
                  iconSize: [24, 24],
                  iconAnchor: [12, 12]
                })
              });
            }}
            onEachFeature={(feature, layer) => {
              if (feature.properties && feature.properties.name) {
                layer.bindPopup(`
                  <div style="font-family:'Space Grotesk', sans-serif; padding: 6px 10px; background:#F4F4F0; border:2px solid #000; box-shadow:3px 3px 0 #000; min-width: 140px;">
                    <div style="font-size:8px; font-weight:900; text-transform:uppercase; color:${HL_RED}; margin-bottom:2px;">
                      Logistics Park (MMLP)
                    </div>
                    <div style="font-size:11px; font-weight:900; color:#000;">
                      ${feature.properties.name}
                    </div>
                    <div style="font-size:9px; color:#555; margin-top:2px;">
                      City: ${feature.properties.city || 'Unknown'}<br/>
                      State: ${feature.properties.state || 'Unknown'}
                    </div>
                  </div>
                `);
              }
            }}
          />
        )}

        {/* Display Grid Connection Lines */}
        {activeLayers.has("grid-lines") && scoredHubs.map(hub => {
          const isSelected = selected?.id === hub.id;
          return (
            <Polyline 
              key={`line-${hub.id}`} 
              positions={[hub.location, hub.nearest_substation.location]} 
              pathOptions={{ 
                color: isSelected ? HL_EMERALD : "#000000", 
                weight: isSelected ? 3 : 1.5, 
                dashArray: isSelected ? "none" : "6, 6", 
                opacity: isSelected ? 0.9 : 0.6 
              }} 
            />
          );
        })}

        {/* Display Charging Hubs */}
        {activeLayers.has("hubs") && scoredHubs.map((hub, n) => {
          const isSelected = selected?.id === hub.id;
          return (
            <Marker 
              key={`hub-${hub.id}`} 
              position={hub.location} 
              icon={markerIcon(HL_EMERALD, String(n + 1), isSelected)}
              eventHandlers={{
                click: () => store.setSelectedHub(hub)
              }}
            >
              <Popup>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", padding: "10px 14px", background: "#F4F4F0", minWidth: "180px", border: "2px solid #000", boxShadow: "3px 3px 0 #000" }}>
                  <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: HL_EMERALD, marginBottom: 4 }}>
                    Charging Hub #{n + 1}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#000", textTransform: "uppercase", borderBottom: "1.5px solid #000", paddingBottom: "4px", marginBottom: "8px" }}>
                    {hub.id.replace('_', ' ')}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontSize: 10, color: "#444" }}>
                    <span>Siting Score</span><span style={{ fontWeight: 900, color: "#000" }}>{hub.score} Pts</span>
                    <span>Peak Load</span><span style={{ fontWeight: 900, color: "#000" }}>{hub.peakLoadMW} MW</span>
                    <span>Substation</span><span style={{ fontWeight: 900, color: "#000" }}>{hub.nearest_substation.name !== 'NaN' ? hub.nearest_substation.name : 'Unknown'}</span>
                    <span>Wind Speed</span><span style={{ fontWeight: 900, color: "#000" }}>{hub.wind_speed_m_s} m/s</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Display Substations */}
        {activeLayers.has("substations") && scoredHubs.map((hub) => {
          const isSelected = selected?.id === hub.id;
          return (
            <Marker 
              key={`sub-${hub.id}`} 
              position={hub.nearest_substation.location} 
              icon={markerIcon(HL_YELLOW, "⚡", isSelected)}
            >
              <Popup>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", padding: "10px 14px", background: "#F4F4F0", minWidth: "180px", border: "2px solid #000", boxShadow: "3px 3px 0 #000" }}>
                  <div style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.14em", color: "#B45309", marginBottom: 4 }}>
                    Nearest Substation
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#000", borderBottom: "1.5px solid #000", paddingBottom: "4px", marginBottom: "8px" }}>
                    {hub.nearest_substation.name !== 'NaN' ? hub.nearest_substation.name : 'Grid Substation'}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "4px 12px", fontSize: 10, color: "#444" }}>
                    <span>Voltage Class</span><span style={{ fontWeight: 900, color: "#000" }}>{hub.nearest_substation.voltage !== 'NaN' ? hub.nearest_substation.voltage : 'Unknown'}</span>
                    <span>Distance to Hub</span><span style={{ fontWeight: 900, color: "#000" }}>{hub.nearest_substation.distance_km} km</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Summary Dashboard at the bottom */}
      <div className="absolute bottom-4 left-4 right-4 z-[1000] animate-fade-in" style={{ fontFamily: "'Space Grotesk', 'Inter', sans-serif" }}>
        <div style={{ background: "#F4F4F0", border: "2.5px solid #000", boxShadow: "4px 4px 0 #000", display: "flex", alignItems: "stretch", overflow: "hidden" }}>
          <div style={{ width: 6, background: HL_EMERALD, flexShrink: 0 }} />
          <StatBlock icon={Compass} label="Total Corridor Capacity" value={`${totalPeakLoad.toFixed(1)} MW`} />
          <StatBlock icon={Activity} label="Avg Grid Connection" value={`${avgSubstationDist} km`} />
          <StatBlock icon={Zap} label="Top Siting Score" value={`${topScore} Pts`} />

          {/* Sizing Details */}
          <div className="flex-1 px-4 py-2 flex items-center gap-4 justify-between overflow-x-auto min-w-0">
            {scoredSelected ? (
              <>
                <div className="flex flex-col gap-1.5 justify-center shrink-0">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wide bg-white border border-black shadow-[1.5px_1.5px_0_#000] px-2.5 py-1">
                    <MapPin size={11} className="text-emerald-500" />
                    <span className="truncate max-w-[120px]">{scoredSelected.id.replace('_', ' ')}</span>
                    {scoredSelected.isPortDrayage && (
                      <span className="text-[7px] font-black tracking-tighter bg-blue-100 text-blue-800 border px-1.5 ml-1">
                        PORT ({scoredSelected.nearest_port.name})
                      </span>
                    )}
                  </div>
                  <div className="text-[8px] font-black uppercase tracking-wider text-zinc-500">
                    Grid Readiness (GRI): <span className="font-mono text-zinc-900" style={{ color: scoredSelected.gridReadinessIndex > 70 ? HL_EMERALD : scoredSelected.gridReadinessIndex > 40 ? HL_YELLOW : "#ef4444" }}>{scoredSelected.gridReadinessIndex}%</span>
                  </div>
                </div>

                <div className="flex gap-x-5 gap-y-1 text-[9px] font-bold uppercase tracking-wider text-slate-700 flex-wrap py-1">
                  <div>
                    Grid Upgrade: <span style={{ color: "#000" }} className="font-mono font-black">₹{scoredSelected.gridUpgradeCostCr} Cr</span>
                  </div>
                  <div>
                    LCOC: <span style={{ color: HL_EMERALD }} className="font-mono font-black">₹{scoredSelected.lcocRsPerKWh}/kWh</span>
                  </div>
                  <div>
                    Peak Load: <span style={{ color: "#000" }} className="font-mono font-black">{scoredSelected.peakLoadMW} MW</span> 
                    {scoredSelected.bessShavedMW > 0 && <span className="text-[8px] text-teal-600 font-extrabold ml-1">(-{scoredSelected.bessShavedMW.toFixed(1)} MW BESS)</span>}
                  </div>
                  <div>
                    RE Target: <span style={{ color: HL_EMERALD }} className="font-mono font-black">{(scoredSelected.dailyMWh * (store.simulationParams.gridOffset / 100)).toFixed(1)} MWh</span>
                  </div>
                  {scoredSelected.overloadRisk && (
                    <div className="flex items-center gap-1 text-rose-600 font-extrabold animate-pulse">
                      <AlertTriangle size={11} />
                      <span>Grid Overload Risk!</span>
                    </div>
                  )}
                </div>

                {/* 24-Hour Temporal Load Curve Chart */}
                <div className="flex items-center gap-2 shrink-0 pr-2 border-l border-black pl-3 border-dashed" style={{ height: "45px" }}>
                  <div className="flex flex-col justify-between h-full text-[7px] font-black uppercase tracking-tighter text-zinc-500 leading-none">
                    <span>Peak</span>
                    <span>Load (MW)</span>
                    <span>0 MW</span>
                  </div>
                  <div>
                    <svg width="170" height="38" className="overflow-visible">
                      {(() => {
                        const profile = getTemporalLoadProfile(
                          scoredSelected,
                          store.simulationParams.chargingProfile,
                          store.simulationParams.bessCapacityMWh
                        );
                        const maxVal = Math.max(...profile.raw, 1);
                        const svgH = 34;
                        const bW = 5;
                        const bG = 2;
                        return (
                          <>
                            {profile.hours.map((_, i) => {
                              const r = profile.raw[i];
                              const s = profile.shaved[i];
                              const rH = (r / maxVal) * svgH;
                              const sH = (s / maxVal) * svgH;
                              return (
                                <g key={i}>
                                  {/* Raw load (light grey) */}
                                  <rect 
                                    x={i * (bW + bG)} 
                                    y={svgH - rH} 
                                    width={bW} 
                                    height={rH} 
                                    fill="#CBD5E1" 
                                    stroke="#000" 
                                    strokeWidth="0.5" 
                                  />
                                  {/* Shaved load (green) */}
                                  <rect 
                                    x={i * (bW + bG)} 
                                    y={svgH - sH} 
                                    width={bW} 
                                    height={sH} 
                                    fill={HL_EMERALD} 
                                    stroke="#000" 
                                    strokeWidth="0.5" 
                                  />
                                </g>
                              );
                            })}
                            {/* X-axis labels */}
                            <text x="0" y="44" fontSize="6" fontWeight="bold" fill="#777">00</text>
                            <text x="42" y="44" fontSize="6" fontWeight="bold" fill="#777">06</text>
                            <text x="84" y="44" fontSize="6" fontWeight="bold" fill="#777">12</text>
                            <text x="126" y="44" fontSize="6" fontWeight="bold" fill="#777">18</text>
                            <text x="160" y="44" fontSize="6" fontWeight="bold" fill="#777">24</text>
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                  <div className="flex flex-col gap-1 text-[7px] font-black uppercase tracking-tighter pl-1">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 border border-black shrink-0" style={{ background: "#CBD5E1" }} />
                      <span>Raw Load</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 border border-black shrink-0" style={{ background: HL_EMERALD }} />
                      <span>BESS Shaved</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-[10px] font-black uppercase tracking-wide text-slate-500 flex-1 text-right pr-4">
                Select a Hub to view techno-commercial sizing, RE offset, & 24hr load curves
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
