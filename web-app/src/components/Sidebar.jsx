import React, { useState, useEffect } from 'react';
import { Compass, Gauge, Layers, Moon, Sun, Info, AlertTriangle, Zap, Battery, Wind, Settings } from 'lucide-react';
import { useStore, CORRIDORS, PRESETS } from '../store';

const LIGHT_THEME = { bg: "#F4F4F0", card: "#FFFFFF", bd: "#000", tx: "#0a0a0a", mu: "#666", fa: "#ccc" };
const DARK_THEME = { bg: "#111", card: "#1C1C1C", bd: "#ddd", tx: "#f5f5f5", mu: "#888", fa: "#444" };
const HL_EMERALD = "#10B981"; // Primary highlight
const HL_FOREST = "#047857";  // Secondary highlight
const HL_AMBER = "#D97706";

export default function Sidebar({ theme, toggleTheme }) {
  const F = theme ? DARK_THEME : LIGHT_THEME;
  const store = useStore();
  const scoredHubs = store.getScoredHubs();

  const handleSlider = (type, val) => {
    store.setWeight(type, val);
  };

  const handleSimSlider = (param, val) => {
    store.setSimulationParam(param, val);
  };

  const isPresetActive = (presetName) => {
    const preset = PRESETS[presetName];
    return Object.keys(preset).every(key => store.weights[key] === preset[key]);
  };

  const SectionCard = ({ children, className = "" }) => (
    <div className={`p-4 ${className}`} style={{ background: F.card, border: `2px solid ${F.bd}`, boxShadow: `3.5px 3.5px 0 ${F.bd}` }}>
      {children}
    </div>
  );

  const SectionHeader = ({ icon: Icon, text }) => (
    <div className="flex items-center gap-2 mb-4">
      <Icon size={13} style={{ color: F.mu }} />
      <span className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: F.mu }}>{text}</span>
    </div>
  );

  const ToggleBtn = ({ active, onClick, children }) => (
    <button 
      type="button" 
      onClick={onClick} 
      className="px-3 py-1.5 text-[10px] font-black uppercase tracking-wide transition-all duration-150 hover:bg-emerald-500 hover:text-black" 
      style={{ 
        background: active ? HL_EMERALD : F.card, 
        color: active ? "#000" : F.mu, 
        border: `2px solid ${F.bd}`, 
        boxShadow: active ? `2px 2px 0 ${F.bd}` : "none" 
      }}
    >
      {children}
    </button>
  );

  const SliderItem = ({ id, label, color, val, setVal, min = 0, max = 10, step = 1, unit = "" }) => (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-[100px] text-[11px] font-extrabold uppercase tracking-wide" style={{ color: F.tx }}>{label}</div>
      <div className="flex-1">
        <input 
          type="range" 
          min={min} 
          max={max} 
          step={step}
          value={val} 
          onChange={e => setVal(id, parseInt(e.target.value))} 
          className="cursor-pointer" 
        />
      </div>
      <div className="w-12 text-right text-[11px] font-black font-mono" style={{ color }}>{val}{unit}</div>
    </div>
  );

  return (
    <div className="w-[410px] h-full flex flex-col shrink-0" style={{ background: F.bg, borderRight: `3.5px solid ${F.bd}`, overflow: "hidden" }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: F.card, borderBottom: `3.5px solid ${F.bd}`, boxShadow: `0 3.5px 0 ${F.bd}` }}>
        <div className="flex items-center gap-3">
          <div className="w-8.5 h-8.5 flex items-center justify-center shrink-0" style={{ background: HL_FOREST, border: `2px solid ${F.bd}`, boxShadow: `2.5px 2.5px 0 ${F.bd}` }}>
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[15px] font-black tracking-tight leading-none" style={{ color: F.tx }}>GRIDCORRIDOR</div>
            <div className="text-[7.5px] font-black uppercase tracking-[0.22em] leading-none mt-1" style={{ color: F.mu }}>Freight Grid Planner</div>
          </div>
        </div>
        <button 
          type="button" 
          onClick={toggleTheme} 
          className="w-7.5 h-7.5 flex items-center justify-center transition-all hover:scale-105 active:scale-95" 
          style={{ background: theme ? HL_EMERALD : F.card, border: `2px solid ${F.bd}`, boxShadow: `2px 2px 0 ${F.bd}` }}
        >
          {theme ? <Sun size={12} color="#000" /> : <Moon size={12} color={F.tx} />}
        </button>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col gap-5 px-4 py-5 overflow-y-auto min-h-0 no-scrollbar">
        
        {/* Corridor Selection */}
        <SectionCard>
          <SectionHeader icon={Compass} text="Corridor Selection" />
          <div className="flex flex-wrap gap-2.5">
            {Object.keys(CORRIDORS).map(key => (
              <ToggleBtn 
                key={key} 
                active={store.corridor === key} 
                onClick={() => store.setCorridor(key)}
              >
                {CORRIDORS[key].name}
              </ToggleBtn>
            ))}
          </div>
        </SectionCard>

        {/* Simulation Configuration Panel */}
        <SectionCard>
          <SectionHeader icon={Settings} text="Operations Sizing & Demand Simulation" />
          <div className="mb-2">
            <SliderItem id="dailyTrucks" label="Daily Trucks" color={HL_AMBER} val={store.simulationParams.dailyTrucks} setVal={handleSimSlider} min={50} max={500} step={10} />
            <SliderItem id="batteryCapacity" label="Battery Pack" color={HL_AMBER} val={store.simulationParams.batteryCapacity} setVal={handleSimSlider} min={300} max={1200} step={50} unit=" kWh" />
            <SliderItem id="gridOffset" label="RE Target Offset" color={HL_EMERALD} val={store.simulationParams.gridOffset} setVal={handleSimSlider} min={10} max={100} step={5} unit="%" />
          </div>
        </SectionCard>

        {/* Grid Planning & BESS Peak Shaving */}
        <SectionCard>
          <SectionHeader icon={Battery} text="Grid Planning & Peak Shaving" />
          <div className="mb-2">
            <SliderItem id="bessCapacityMWh" label="BESS Capacity" color="#3B82F6" val={store.simulationParams.bessCapacityMWh} setVal={handleSimSlider} min={0} max={50} step={5} unit=" MWh" />
            
            <div className="flex flex-col gap-2 mt-3 pt-3 border-t border-dashed" style={{ borderColor: F.fa }}>
              <span className="text-[9px] font-black uppercase tracking-wider" style={{ color: F.mu }}>Charging Load Profile</span>
              <div className="flex flex-wrap gap-1.5">
                <button 
                  type="button"
                  onClick={() => handleSimSlider("chargingProfile", "overnight")}
                  className="px-2 py-1 text-[9px] font-black uppercase border transition-all"
                  style={{
                    background: store.simulationParams.chargingProfile === "overnight" ? HL_FOREST : F.card,
                    color: store.simulationParams.chargingProfile === "overnight" ? "#fff" : F.mu,
                    borderColor: F.bd,
                    boxShadow: store.simulationParams.chargingProfile === "overnight" ? "1.5px 1.5px 0 #000" : "none"
                  }}
                >
                  Overnight Depot
                </button>
                <button 
                  type="button"
                  onClick={() => handleSimSlider("chargingProfile", "opportunistic")}
                  className="px-2 py-1 text-[9px] font-black uppercase border transition-all"
                  style={{
                    background: store.simulationParams.chargingProfile === "opportunistic" ? HL_FOREST : F.card,
                    color: store.simulationParams.chargingProfile === "opportunistic" ? "#fff" : F.mu,
                    borderColor: F.bd,
                    boxShadow: store.simulationParams.chargingProfile === "opportunistic" ? "1.5px 1.5px 0 #000" : "none"
                  }}
                >
                  Midday Opportunity
                </button>
                <button 
                  type="button"
                  onClick={() => handleSimSlider("chargingProfile", "continuous")}
                  className="px-2 py-1 text-[9px] font-black uppercase border transition-all"
                  style={{
                    background: store.simulationParams.chargingProfile === "continuous" ? HL_FOREST : F.card,
                    color: store.simulationParams.chargingProfile === "continuous" ? "#fff" : F.mu,
                    borderColor: F.bd,
                    boxShadow: store.simulationParams.chargingProfile === "continuous" ? "1.5px 1.5px 0 #000" : "none"
                  }}
                >
                  Continuous
                </button>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* Scoring Parameters / Weights */}
        <SectionCard>
          <SectionHeader icon={Gauge} text="Siting Optimization Weights" />
          <div className="mb-4">
            <SliderItem id="wGrid" label="Grid Proximity" color="#3B82F6" val={store.weights.wGrid} setVal={handleSlider} />
            <SliderItem id="wRenew" label="Wind Siting" color="#10B981" val={store.weights.wRenew} setVal={handleSlider} />
            <SliderItem id="wPower" label="Power Demand" color="#F59E0B" val={store.weights.wPower} setVal={handleSlider} />
            <SliderItem id="wMultimodal" label="Rail Proximity" color="#8B5CF6" val={store.weights.wMultimodal || 0} setVal={handleSlider} />
          </div>

          <div className="flex items-center justify-between border-t pt-4" style={{ borderColor: theme ? "#333" : "#e4e4e7" }}>
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: F.mu }}>Presets</span>
            <div className="flex gap-2">
              <ToggleBtn active={isPresetActive("grid")} onClick={() => store.applyPreset("grid")}>Grid</ToggleBtn>
              <ToggleBtn active={isPresetActive("green")} onClick={() => store.applyPreset("green")}>Hybrid</ToggleBtn>
              <ToggleBtn active={isPresetActive("balanced")} onClick={() => store.applyPreset("balanced")}>Balanced</ToggleBtn>
            </div>
          </div>
        </SectionCard>

        {/* Candidate Hubs List */}
        <div className="flex flex-col gap-3">
          <div className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: F.mu }}>Scored Candidate Hubs</div>
          {scoredHubs.map((hub, idx) => {
            const isSelected = store.selectedHub?.id === hub.id;
            return (
              <div 
                key={hub.id}
                onClick={() => store.setSelectedHub(hub)}
                className="p-4 cursor-pointer transition-all duration-200 relative overflow-hidden group hover:scale-[1.01]"
                style={{ 
                  background: isSelected ? F.card : F.card, 
                  border: `2px solid ${isSelected ? HL_FOREST : F.bd}`, 
                  boxShadow: isSelected ? `4.5px 4.5px 0 ${HL_FOREST}` : `2.5px 2.5px 0 ${F.bd}`,
                  transform: isSelected ? 'translate(-2px, -2px)' : 'none'
                }}
              >
                <div className="flex justify-between items-start mb-2.5">
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wide flex flex-wrap items-center gap-1.5" style={{ color: F.tx }}>
                      <span>{hub.id.replace('_', ' ')}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 border" style={{ borderColor: F.bd, background: F.bg, color: F.tx }}>
                        #{idx + 1}
                      </span>
                    </h3>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {hub.isPortDrayage && (
                        <span className="text-[8px] font-black tracking-wider uppercase bg-blue-100 text-blue-800 border border-blue-300 px-1.5 py-0.5 shadow-[1px_1px_0_#3B82F6]">
                          Port Drayage ({hub.nearest_port !== undefined ? `${hub.nearest_port.name}: ${hub.nearest_port.distance_km} km` : "Near"})
                        </span>
                      )}
                      {hub.isMultimodal && (
                        <span className="text-[8px] font-black tracking-wider uppercase bg-purple-100 text-purple-800 border border-purple-300 px-1.5 py-0.5 shadow-[1px_1px_0_#8B5CF6]">
                          Rail Link ({hub.nearest_rail_distance_km !== undefined ? `${hub.nearest_rail_distance_km} km` : "Near"})
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-black px-2 py-0.5 border" style={{ borderColor: F.bd, color: F.tx, background: F.bg }}>
                    {hub.score} PTS
                  </span>
                </div>

                <div className="space-y-2 text-[11px]" style={{ color: F.mu }}>
                  <div className="flex items-center gap-2">
                    <Battery size={13} className="text-blue-500 shrink-0" />
                    <span className="truncate">Substation: <strong className="font-extrabold" style={{ color: F.tx }}>{hub.nearest_substation.name !== 'NaN' ? hub.nearest_substation.name : 'Grid Connection Point'}</strong> ({hub.nearest_substation.distance_km} km)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Wind size={13} className="text-teal-500 shrink-0" />
                    <span>RE Gen: <strong className="font-extrabold" style={{ color: F.tx }}>{hub.wind_speed_m_s} m/s</strong> (Requires {hub.turbinesNeeded} Turbines)</span>
                  </div>

                  <div className="flex justify-between items-center text-[10px] mt-2 border-t pt-2 border-dashed" style={{ borderColor: F.fa }}>
                    <span>Grid Readiness (GRI): <strong className="font-black" style={{ color: hub.gridReadinessIndex > 70 ? HL_EMERALD : hub.gridReadinessIndex > 40 ? HL_AMBER : "#ef4444" }}>{hub.gridReadinessIndex}%</strong></span>
                    <span>LCOC: <strong className="font-black" style={{ color: F.tx }}>₹{hub.lcocRsPerKWh}/kWh</strong></span>
                  </div>

                  {hub.overloadRisk ? (
                    <div className="flex items-center gap-1.5 mt-3 p-2 text-rose-800 bg-rose-50 border-2 border-rose-600 shadow-[2px_2px_0_#e11d48]">
                      <AlertTriangle size={12} className="text-rose-600 animate-pulse" />
                      <span className="font-black text-[9px] uppercase tracking-wider">Substation Overload Risk ({hub.peakLoadMW}MW / {hub.capacityLimitMW}MW Limit)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-3 p-2 text-emerald-800 bg-emerald-50 border border-emerald-400">
                      <Info size={12} className="text-emerald-600" />
                      <span className="font-black text-[9px] uppercase tracking-wider">Capacity Headroom Safe ({hub.peakLoadMW}MW / {hub.capacityLimitMW}MW Limit)</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
