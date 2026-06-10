import { create } from 'zustand';

export const CORRIDORS = {
  india: {
    name: "Whole India (National Grid)",
    center: [21.7, 85.2],
    zoom: 5,
  },
  nh48: {
    name: "NH48 Corridor",
    center: [23.5, 74.0],
    zoom: 6,
  },
  nh4: {
    name: "NH4 Corridor",
    center: [18.7, 73.4],
    zoom: 9,
  }
};

export const PRESETS = {
  grid: { wGrid: 8, wRenew: 1, wPower: 1, wMultimodal: 0 },
  green: { wGrid: 2, wRenew: 7, wPower: 1, wMultimodal: 0 },
  balanced: { wGrid: 4, wRenew: 3, wPower: 3, wMultimodal: 1 }
};

export const useStore = create((set, get) => ({
  corridor: "india",
  hubs: [],
  selectedHub: null,
  indiaStates: null,
  majorHighways: null,
  indianRailways: null,
  indiaMmlps: null,
  weights: { wGrid: 4, wRenew: 3, wPower: 2, wMultimodal: 1 },
  simulationParams: { 
    dailyTrucks: 150, 
    batteryCapacity: 600, 
    gridOffset: 50,
    bessCapacityMWh: 10,
    chargingProfile: "overnight"
  },
  isLoading: false,
  activeLayers: new Set(["hubs", "grid-lines", "substations", "india-states", "national-highways", "indian-railways", "india-mmlps"]),
  
  setCorridor: (corridor) => set({ corridor }),
  setHubs: (hubs) => set({ hubs }),
  setSelectedHub: (selectedHub) => set({ selectedHub }),
  setIndiaStates: (indiaStates) => set({ indiaStates }),
  setMajorHighways: (majorHighways) => set({ majorHighways }),
  setIndianRailways: (indianRailways) => set({ indianRailways }),
  setIndiaMmlps: (indiaMmlps) => set({ indiaMmlps }),
  
  setSimulationParam: (param, val) => set((state) => ({
    simulationParams: { ...state.simulationParams, [param]: val }
  })),

  setWeight: (type, val) => set((state) => {
    const nextWeights = { ...state.weights, [type]: val };
    return { weights: nextWeights };
  }),
  
  applyPreset: (presetName) => set({ weights: PRESETS[presetName] }),
  
  toggleLayer: (layerId) => set((state) => {
    const nextLayers = new Set(state.activeLayers);
    if (nextLayers.has(layerId)) {
      nextLayers.delete(layerId);
    } else {
      nextLayers.add(layerId);
    }
    return { activeLayers: nextLayers };
  }),

  getScoredHubs: () => {
    const { hubs, weights, simulationParams } = get();
    if (!hubs || hubs.length === 0) return [];
    
    // Normalize parameters to compute dynamic Neobrutalist score
    const totalWeight = weights.wGrid + weights.wRenew + weights.wPower + (weights.wMultimodal || 0);
    const factorGrid = weights.wGrid / (totalWeight || 1);
    const factorRenew = weights.wRenew / (totalWeight || 1);
    const factorPower = weights.wPower / (totalWeight || 1);
    const factorMulti = (weights.wMultimodal || 0) / (totalWeight || 1);

    // Compute min/max for normalizations
    const dists = hubs.map(h => h.nearest_substation.distance_km);
    const maxDist = Math.max(...dists, 1);
    
    const winds = hubs.map(h => h.wind_speed_m_s);
    const maxWind = Math.max(...winds, 1);
    
    const powers = hubs.map(h => h.power_density_W_m2);
    const maxPower = Math.max(...powers, 1);

    return hubs.map(hub => {
      // 1. Port Drayage Electrification Flag (1.5x traffic multiplier for hubs within 80km of a major port)
      const portDist = hub.nearest_port !== undefined ? hub.nearest_port.distance_km : 999.0;
      const isPortDrayage = portDist <= 80.0;
      
      const multiplier = isPortDrayage ? 1.5 : 1.0;
      const dailyTrucks = simulationParams.dailyTrucks * multiplier;

      // 2. Energy Sizing Model (MWh / MW)
      const dailyMWh = (dailyTrucks * simulationParams.batteryCapacity) / 1000;
      
      // Raw Peak Load MW based on charging profile
      let profilePeakFactor = 1.2; // overnight
      if (simulationParams.chargingProfile === "opportunistic") profilePeakFactor = 1.6;
      else if (simulationParams.chargingProfile === "continuous") profilePeakFactor = 0.9;
      
      const rawPeakLoadMW = roundValue((dailyMWh / 4) * profilePeakFactor, 1);

      // BESS Peak Shaving simulation
      // Up to 35% shaved depending on capacity (assumes 4-hr duration BESS)
      const bessShavedMW = Math.min(rawPeakLoadMW * 0.35, simulationParams.bessCapacityMWh / 3);
      const peakLoadMW = roundValue(Math.max(rawPeakLoadMW * 0.65, rawPeakLoadMW - bessShavedMW), 1);

      // 3. Grid proximity score (closer is better)
      const gridDistScore = 1 - (hub.nearest_substation.distance_km / maxDist);
      
      // Substation Voltage Rating capacity check
      let voltageScore = 0.3; // Default for low voltage
      const voltStr = String(hub.nearest_substation.voltage).toLowerCase();
      let baseEnergyRate = 9.5; // Rs/kWh baseline (11kV)
      
      if (voltStr.includes("220000") || voltStr.includes("220")) {
        voltageScore = 1.0;
        baseEnergyRate = 6.2;
      } else if (voltStr.includes("132000") || voltStr.includes("132")) {
        voltageScore = 0.8;
        baseEnergyRate = 7.0;
      } else if (voltStr.includes("110000") || voltStr.includes("110")) {
        voltageScore = 0.7;
        baseEnergyRate = 7.2;
      } else if (voltStr.includes("33000") || voltStr.includes("33")) {
        voltageScore = 0.5;
        baseEnergyRate = 8.2;
      }
      
      const gridScore = (gridDistScore * 0.6) + (voltageScore * 0.4);

      // 4. Wind/Solar potential score
      const windScore = hub.wind_speed_m_s / maxWind;
      const powerDensityScore = hub.power_density_W_m2 / maxPower;
      const renewScore = (windScore + powerDensityScore) / 2;
      
      // 5. Substation capacity load headroom score
      let overloadRisk = false;
      let capacityLimitMW = 15; // default 15MW limit for 11kV
      if (voltStr.includes("220")) capacityLimitMW = 150;
      else if (voltStr.includes("132") || voltStr.includes("110")) capacityLimitMW = 80;
      else if (voltStr.includes("33")) capacityLimitMW = 35;
      
      if (peakLoadMW > capacityLimitMW) {
        overloadRisk = true;
      }
      const capacityHeadroomScore = Math.max(0, 1 - (peakLoadMW / capacityLimitMW));

      // 6. Multimodal rail proximity score (closer than 50km is scored 1.0 down to 0.0 at 50km+)
      const railDist = hub.nearest_rail_distance_km !== undefined ? hub.nearest_rail_distance_km : 999.0;
      const multimodalScore = Math.max(0, 1 - railDist / 50.0);

      // 7. Grid Readiness Index (GRI) - composite metric from Junior Technical Manager scope
      const gridReadinessIndex = Math.round(
        100 * (0.4 * voltageScore + 0.35 * capacityHeadroomScore + 0.25 * gridDistScore)
      );

      // 8. Grid Upgrade CapEx (₹ Crores) - Feeder & Substation transformer
      const gridUpgradeCostCr = roundValue(
        (hub.nearest_substation.distance_km * 0.22) + 
        Math.max(0, peakLoadMW - capacityLimitMW) * 0.08, 
        2
      );

      // 9. Levelized Cost of Charging (LCOC in ₹/kWh)
      // Renewable target discounts grid energy cost by up to 25% (offset target fraction)
      const energyCostKWh = baseEnergyRate * (1 - 0.25 * (simulationParams.gridOffset / 100));
      
      // Capital recovery factor for grid upgrade CapEx (10-yr lifetime at 10% rate is 0.163)
      const annualEnergyKWh = dailyMWh * 1000 * 300; // 300 operational days
      const amortizedUpgradeKWh = annualEnergyKWh > 0 
        ? ((gridUpgradeCostCr * 10000000) * 0.163) / annualEnergyKWh
        : 0;
      
      // BESS cycling cost (₹1.50/kWh degraded cost for portion cycled)
      const bessFraction = Math.min(0.4, simulationParams.bessCapacityMWh / (dailyMWh + 0.1));
      const bessCostKWh = bessFraction * 1.50;

      const lcocRsPerKWh = roundValue(energyCostKWh + amortizedUpgradeKWh + bessCostKWh, 2);

      // Overall suitability score
      const finalScore = (
        gridScore * factorGrid + 
        renewScore * factorRenew + 
        capacityHeadroomScore * factorPower + 
        multimodalScore * factorMulti
      ) * 100;
      
      // Wind Turbines sizing logic (2MW turbine yields ~30% capacity factor)
      const energyOffsetTarget = dailyMWh * (simulationParams.gridOffset / 100);
      const windEnergyYieldDaily = (hub.wind_speed_m_s * 1.5) * 24; // MWh estimate per turbine
      const turbinesNeeded = Math.ceil(energyOffsetTarget / (windEnergyYieldDaily || 1));
      
      return {
        ...hub,
        score: Math.round(finalScore),
        overloadRisk,
        capacityLimitMW,
        turbinesNeeded,
        dailyMWh,
        rawPeakLoadMW,
        peakLoadMW,
        bessShavedMW,
        gridReadinessIndex,
        gridUpgradeCostCr,
        lcocRsPerKWh,
        isPortDrayage,
        isMultimodal: multimodalScore > 0.6
      };
    }).sort((a, b) => b.score - a.score);
  }
}));

function roundValue(value, decimals) {
  return Number(Math.round(value + 'e' + decimals) + 'e-' + decimals);
}

export function getTemporalLoadProfile(hub, chargingProfile, bessCapacityMWh) {
  // 24-hour baseline distributions
  let distribution = [];
  if (chargingProfile === "overnight") {
    // Heavy depot charging from 22:00 to 04:00
    distribution = [
      0.08, 0.08, 0.08, 0.06, 0.04, 0.02, 0.01, 0.01,
      0.01, 0.01, 0.02, 0.02, 0.03, 0.03, 0.02, 0.02,
      0.02, 0.03, 0.04, 0.06, 0.08, 0.10, 0.10, 0.10
    ];
  } else if (chargingProfile === "opportunistic") {
    // Midday breaks (11:00-15:00) and evening driver layovers (18:00-20:00)
    distribution = [
      0.01, 0.01, 0.01, 0.02, 0.02, 0.03, 0.04, 0.05,
      0.06, 0.07, 0.08, 0.10, 0.12, 0.10, 0.08, 0.06,
      0.04, 0.04, 0.06, 0.08, 0.06, 0.04, 0.02, 0.02
    ];
  } else {
    // "continuous" logistics operations - flat profile with minor shifts
    distribution = [
      0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04, 0.04,
      0.04, 0.05, 0.05, 0.04, 0.04, 0.04, 0.04, 0.04,
      0.04, 0.04, 0.05, 0.05, 0.04, 0.04, 0.04, 0.04
    ];
  }

  // Normalize distribution
  const sum = distribution.reduce((a, b) => a + b, 0);
  const normalizedDist = distribution.map(d => d / sum);

  // Total daily energy in MWh
  const totalMWh = hub.dailyMWh;

  // Raw MW hourly charging load (MWh in 1 hour = MW average load)
  const rawMW = normalizedDist.map(pct => pct * totalMWh);

  // Dynamic BESS Peak Shaving simulation
  const averageLoad = rawMW.reduce((a, b) => a + b, 0) / 24;
  const bessLimit = bessCapacityMWh / 4; // 4-hour charge/discharge rate
  let currentBessSOC = bessCapacityMWh * 0.5; // Start at 50% state of charge

  const shavedMW = [];
  const bessState = []; // positive is charging (+load), negative is discharging (-load)

  for (let hr = 0; hr < 24; hr++) {
    const raw = rawMW[hr];
    let diff = raw - averageLoad;
    let bessAction = 0;

    if (diff > 0 && currentBessSOC > 0) {
      // Discharging to shave the peak load
      const dischargeVal = Math.min(diff, bessLimit, currentBessSOC);
      bessAction = -dischargeVal;
      currentBessSOC -= dischargeVal;
    } else if (diff < 0 && currentBessSOC < bessCapacityMWh) {
      // Charging from the grid during off-peak valley
      const chargeVal = Math.min(-diff, bessLimit, bessCapacityMWh - currentBessSOC);
      bessAction = chargeVal;
      currentBessSOC += chargeVal;
    }
    
    shavedMW.push(Math.max(0, raw + bessAction));
    bessState.push(bessAction);
  }

  return {
    hours: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`),
    raw: rawMW.map(v => Number(v.toFixed(1))),
    shaved: shavedMW.map(v => Number(v.toFixed(1))),
    bess: bessState.map(v => Number(v.toFixed(1)))
  };
}

