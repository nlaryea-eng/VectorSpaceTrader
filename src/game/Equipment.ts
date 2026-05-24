import type { EquipmentCategory, EquipmentId, EquipmentState, PlayerState, TradeResult } from "./types";
import { applyPlayerShipStats, getPlayerShipStats } from "./Ships";
import type { StationProfile } from "./StationServices";

export interface EquipmentEffect {
  cargo?: number;
  hull?: number;
  shield?: number;
  shieldRecharge?: number;
  damage?: number;
  energyCost?: number;
  fuelCapacity?: number;
  fuelUse?: number; // modifier
  jumpRange?: number;
  repairCost?: number; // modifier
  marketInsight?: boolean;
  survey?: boolean;
  salvage?: boolean;
  legalRisk?: number; // modifier
  missionReward?: number; // modifier
  speed?: number; // modifier
  handling?: number; // modifier
  scanner?: number; // range or quality
}

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  price: number;
  description: string;
  category: EquipmentCategory;
  tier: "basic" | "tuned" | "advanced" | "specialist" | "experimental";
  effect: EquipmentEffect;
}

export const EQUIPMENT: EquipmentDefinition[] = [
  // WEAPONS
  { id: "pulseLaser", name: "Pulse Laser", price: 180, description: "Reliable low-energy laser emitter.", category: "weapon", tier: "basic", effect: { damage: 28, energyCost: 6 } },
  { id: "beamLaser", name: "Beam Laser", price: 620, description: "Higher damage laser with a larger energy draw.", category: "weapon", tier: "advanced", effect: { damage: 44, energyCost: 11 } },
  { id: "ribbonLance", name: "Ribbon Lance", price: 1200, description: "Focused continuous beam for high precision.", category: "weapon", tier: "specialist", effect: { damage: 52, energyCost: 14 } },
  { id: "needleEmitter", name: "Needle Emitter", price: 450, description: "Rapid fire with minimal energy drain.", category: "weapon", tier: "tuned", effect: { damage: 22, energyCost: 4 } },
  { id: "burstRepeater", name: "Burst Repeater", price: 2200, description: "Experimental multi-phase pulse array.", category: "weapon", tier: "experimental", effect: { damage: 68, energyCost: 20 } },

  // CARGO
  { id: "cargoExpansion", name: "Cargo Expansion", price: 420, description: "Adds 15 cargo units.", category: "cargo", tier: "basic", effect: { cargo: 15 } },
  { id: "foldedHoldGrid", name: "Folded Hold Grid", price: 680, description: "Adds 10 cargo units without replacing the main hold.", category: "cargo", tier: "advanced", effect: { cargo: 10 } },
  { id: "modularRack", name: "Modular Rack", price: 1100, description: "Precision-fitted internal cargo racking (+20T).", category: "cargo", tier: "specialist", effect: { cargo: 20 } },
  { id: "densityCompressor", name: "Density Compressor", price: 2500, description: "Static-field cargo compression technology (+35T).", category: "cargo", tier: "experimental", effect: { cargo: 35 } },
  { id: "vaultSleeve", name: "Vault Sleeve", price: 850, description: "Reinforced shielded cargo area (+8T, reduced risk).", category: "cargo", tier: "tuned", effect: { cargo: 8, legalRisk: 0.85 } },

  // SHIELD
  { id: "shieldBooster", name: "Shield Booster", price: 540, description: "Raises maximum shield capacity.", category: "shield", tier: "basic", effect: { shield: 30 } },
  { id: "quietShieldMatrix", name: "Quiet Shield Matrix", price: 720, description: "Adds shield capacity and steadier shield recovery.", category: "shield", tier: "advanced", effect: { shield: 20, shieldRecharge: 0.2 } },
  { id: "staticFieldGen", name: "Static Field Gen", price: 1400, description: "High-output shield reinforcement array.", category: "shield", tier: "specialist", effect: { shield: 60 } },
  { id: "pulseAbsorber", name: "Pulse Absorber", price: 950, description: "Absorbs impact energy to speed up recharge.", category: "shield", tier: "tuned", effect: { shieldRecharge: 0.4 } },
  { id: "fluxCapacitor", name: "Flux Capacitor", price: 3200, description: "Experimental high-density energy shield.", category: "shield", tier: "experimental", effect: { shield: 100, shieldRecharge: 0.1 } },

  // FUEL
  { id: "fuelScoop", name: "Fuel Scoop", price: 360, description: "Slowly recovers fuel while cruising.", category: "fuel", tier: "basic", effect: { fuelUse: 0.95 } },
  { id: "thriftBurnRegulator", name: "Thrift Burn Regulator", price: 460, description: "Reduces fuel required for jumps.", category: "fuel", tier: "basic", effect: { fuelUse: 0.86 } },
  { id: "reserveCell", name: "Reserve Cell", price: 880, description: "Adds 2.5 units to total fuel capacity.", category: "fuel", tier: "advanced", effect: { fuelCapacity: 2.5 } },
  { id: "flowOptimizer", name: "Flow Optimizer", price: 1150, description: "Tuned injectors for maximum fuel efficiency.", category: "fuel", tier: "specialist", effect: { fuelUse: 0.75 } },
  { id: "ionFilter", name: "Ion Filter", price: 1900, description: "Experimental filter allows use of raw lane matter.", category: "fuel", tier: "experimental", effect: { fuelUse: 0.65, fuelCapacity: 1.5 } },

  // NAVIGATION
  { id: "laneGlassScanner", name: "Lane Glass Scanner", price: 260, description: "Unlocks survey contracts and highlights route details.", category: "survey", tier: "basic", effect: { survey: true, scanner: 1 } },
  { id: "routeAbacus", name: "Route Abacus", price: 390, description: "Improves map filtering and adds a modest range bonus.", category: "navigation", tier: "basic", effect: { jumpRange: 1.4, marketInsight: true } },
  { id: "arcSpoolDrive", name: "Arc Spool Drive", price: 760, description: "Extends jump reach and adds a small fuel reserve.", category: "navigation", tier: "advanced", effect: { jumpRange: 3.2, fuelCapacity: 0.7 } },
  { id: "pathVectorLogic", name: "Path Vector Logic", price: 1350, description: "Advanced navigation computer for long routes.", category: "navigation", tier: "specialist", effect: { jumpRange: 5.5, marketInsight: true } },
  { id: "stellarCompass", name: "Stellar Compass", price: 2800, description: "Experimental non-local reference navigator.", category: "navigation", tier: "experimental", effect: { jumpRange: 8.0, scanner: 2 } },
  { id: "driftStabilizer", name: "Drift Stabilizer", price: 620, description: "Tuned lane-locking logic for steadier jumps.", category: "navigation", tier: "tuned", effect: { jumpRange: 2.2, fuelUse: 0.98 } },

  // REPAIR
  { id: "fieldPatchDrones", name: "Field Patch Drones", price: 500, description: "Reduces station hull repair costs.", category: "repair", tier: "basic", effect: { repairCost: 0.75 } },
  { id: "autoRepairBot", name: "Auto-Repair Bot", price: 1200, description: "Automated hull maintenance system.", category: "repair", tier: "advanced", effect: { repairCost: 0.6, hull: 15 } },
  { id: "naniteGel", name: "Nanite Gel", price: 1800, description: "Self-healing hull coating technology.", category: "repair", tier: "specialist", effect: { repairCost: 0.5, hull: 30 } },
  { id: "weldKit", name: "Weld Kit", price: 350, description: "Basic tools for minor hull patches.", category: "repair", tier: "basic", effect: { repairCost: 0.9 } },
  { id: "sealantFoam", name: "Sealant Foam", price: 2400, description: "Experimental instant-seal hull system.", category: "repair", tier: "experimental", effect: { repairCost: 0.4, hull: 50 } },

  // HULL
  { id: "reinforcedRibs", name: "Reinforced Ribs", price: 480, description: "Structural reinforcement for the main frame.", category: "hull", tier: "basic", effect: { hull: 25 } },
  { id: "alloyPlating", name: "Alloy Plating", price: 920, description: "Heavy-duty plating for improved survival.", category: "hull", tier: "advanced", effect: { hull: 50 } },
  { id: "impactBuffer", name: "Impact Buffer", price: 1300, description: "Energy-absorbing structural layers.", category: "hull", tier: "specialist", effect: { hull: 80 } },
  { id: "stressBraces", name: "Stress Braces", price: 650, description: "Tuned bracing for high-speed maneuvers.", category: "hull", tier: "tuned", effect: { hull: 15, handling: 1.1 } },
  { id: "tensileWeb", name: "Tensile Web", price: 2800, description: "Experimental high-tension internal frame.", category: "hull", tier: "experimental", effect: { hull: 120 } },

  // SHIP
  { id: "engineTuning", name: "Engine Tuning", price: 550, description: "Optimizes thrust for better top speed.", category: "ship", tier: "basic", effect: { speed: 1.1 } },
  { id: "gyroStabilizer", name: "Gyro Stabilizer", price: 620, description: "Improved reaction wheels for sharper turns.", category: "ship", tier: "basic", effect: { handling: 1.15 } },
  { id: "reactionThruster", name: "Reaction Thruster", price: 1100, description: "High-pressure lateral thruster array.", category: "ship", tier: "advanced", effect: { handling: 1.25, speed: 1.05 } },
  { id: "inertialDampener", name: "Inertial Dampener", price: 1700, description: "Advanced gravity-well compensation.", category: "ship", tier: "specialist", effect: { speed: 1.2, handling: 1.1 } },
  { id: "vectorNozzle", name: "Vector Nozzle", price: 2600, description: "Experimental multi-axis thrust vectoring.", category: "ship", tier: "experimental", effect: { speed: 1.15, handling: 1.35 } },

  // JUMP RANGE
  { id: "jumpBooster", name: "Jump Booster", price: 900, description: "Increases maximum jump distance.", category: "range", tier: "basic", effect: { jumpRange: 4.5 } },
  { id: "rangeExtender", name: "Range Extender", price: 1600, description: "Advanced spooling for longer lane reach.", category: "range", tier: "advanced", effect: { jumpRange: 7.2 } },
  { id: "warpSpool", name: "Warp Spool", price: 2400, description: "Precision lane-locking hardware (+10 LY).", category: "range", tier: "specialist", effect: { jumpRange: 10.0 } },
  { id: "voidSails", name: "Void Sails", price: 3500, description: "Experimental passive lane-drift capture.", category: "range", tier: "experimental", effect: { jumpRange: 14.0, fuelUse: 0.9 } },
  { id: "gravityAnchor", name: "Gravity Anchor", price: 1100, description: "Stable exit-point logic for safer long jumps.", category: "range", tier: "tuned", effect: { jumpRange: 5.0, fuelUse: 1.05 } },

  // EFFICIENCY
  { id: "coolingFin", name: "Cooling Fin", price: 380, description: "Improves energy dissipation.", category: "efficiency", tier: "basic", effect: { energyCost: -1 } },
  { id: "heatSink", name: "Heat Sink", price: 820, description: "Rapid thermal venting for sustained fire.", category: "efficiency", tier: "advanced", effect: { energyCost: -2 } },
  { id: "powerRegulator", name: "Power Regulator", price: 1400, description: "Optimizes ship-wide energy distribution.", category: "efficiency", tier: "specialist", effect: { energyCost: -3, speed: 1.05 } },
  { id: "energyCycle", name: "Energy Cycle", price: 550, description: "Recovers minor energy from engine heat.", category: "efficiency", tier: "tuned", effect: { energyCost: -1, fuelUse: 0.98 } },
  { id: "circuitBreaker", name: "Circuit Breaker", price: 2200, description: "Experimental zero-loss power grid.", category: "efficiency", tier: "experimental", effect: { energyCost: -5 } },

  // SALVAGE
  { id: "salvageTongs", name: "Salvage Tongs", price: 580, description: "Unlocks salvage contracts at suitable stations.", category: "salvage", tier: "basic", effect: { salvage: true } },
  { id: "wreckProbe", name: "Wreck Probe", price: 950, description: "Deep-hull scanning for better salvage yields.", category: "salvage", tier: "advanced", effect: { salvage: true, missionReward: 1.1 } },
  { id: "dataSiphon", name: "Data Siphon", price: 1500, description: "Recovers encrypted logs from derelict cores.", category: "salvage", tier: "specialist", effect: { salvage: true, missionReward: 1.25 } },
  { id: "componentSpare", name: "Component Spare", price: 420, description: "Helps identify valuable ship parts in debris.", category: "salvage", tier: "tuned", effect: { salvage: true, marketInsight: true } },
  { id: "salvageLoom", name: "Salvage Loom", price: 2800, description: "Experimental matter-reclamation array.", category: "salvage", tier: "experimental", effect: { salvage: true, missionReward: 1.5 } },

  // DEFENSIVE
  { id: "signalJammer", name: "Signal Jammer", price: 680, description: "Makes the ship harder to track for raiders.", category: "defensive", tier: "basic", effect: { legalRisk: 0.8 } },
  { id: "decoyLauncher", name: "Decoy Launcher", price: 1100, description: "Deploys thermal decoys to confuse sensors.", category: "defensive", tier: "advanced", effect: { legalRisk: 0.6 } },
  { id: "chaffDispenser", name: "Chaff Dispenser", price: 450, description: "Metallic cloud to disrupt targeting.", category: "defensive", tier: "basic", effect: { legalRisk: 0.9 } },
  { id: "flareArray", name: "Flare Array", price: 1400, description: "High-intensity multi-spectrum flares.", category: "defensive", tier: "specialist", effect: { legalRisk: 0.5 } },
  { id: "stealthCoating", name: "Stealth Coating", price: 3200, description: "Experimental radar-absorbent hull skin.", category: "defensive", tier: "experimental", effect: { legalRisk: 0.3 } },

  // MISSION SUPPORT
  { id: "contractLog", name: "Contract Log", price: 320, description: "Improves reputation gains from missions.", category: "mission", tier: "basic", effect: { missionReward: 1.05 } },
  { id: "priorityTransceiver", name: "Priority Transceiver", price: 950, description: "Access to higher-paying urgent contracts.", category: "mission", tier: "advanced", effect: { missionReward: 1.15 } },
  { id: "secureLockbox", name: "Secure Lockbox", price: 620, description: "Safely transport sensitive mission data.", category: "mission", tier: "tuned", effect: { missionReward: 1.1, legalRisk: 0.9 } },
  { id: "diplomaticSeal", name: "Diplomatic Seal", price: 1800, description: "Significant reputation boost for all work.", category: "mission", tier: "specialist", effect: { missionReward: 1.3 } },
  { id: "cargoScanner", name: "Cargo Scanner", price: 2400, description: "Experimental market-demand predictor.", category: "mission", tier: "experimental", effect: { missionReward: 1.2, marketInsight: true } },

  // UTILITY
  { id: "tradeLedger", name: "Trade Ledger", price: 280, description: "Keeps track of market prices in visited systems.", category: "utility", tier: "basic", effect: { marketInsight: true } },
  { id: "marketLink", name: "Market Link", price: 850, description: "Real-time updates for nearby market systems.", category: "utility", tier: "advanced", effect: { marketInsight: true, scanner: 1 } },
  { id: "pricePredictor", name: "Price Predictor", price: 1400, description: "Algorithmic analysis of trade route profit.", category: "utility", tier: "specialist", effect: { marketInsight: true, scanner: 2 } },
  { id: "routePlotter", name: "Route Plotter", price: 550, description: "Optimizes multi-jump travel routes.", category: "utility", tier: "tuned", effect: { jumpRange: 1.2, fuelUse: 0.98 } },
  { id: "dockingComputer", name: "Docking Computer", price: 2100, description: "Automated precision landing assistance.", category: "utility", tier: "experimental", effect: { marketInsight: true, repairCost: 0.9 } },

  // SURVEY (Moved items around to fill categories)
  { id: "surveyMast", name: "Survey Mast", price: 520, description: "Unlocks high-value survey contracts.", category: "survey", tier: "advanced", effect: { survey: true, scanner: 2 } },
  { id: "hazardSensor", name: "Hazard Sensor", price: 440, description: "Detects lane hazards at a distance.", category: "survey", tier: "basic", effect: { survey: true, scanner: 1 } },
  { id: "weatherRadar", name: "Weather Radar", price: 1100, description: "Predicts ion weather shifts in the sector.", category: "survey", tier: "specialist", effect: { survey: true, scanner: 3 } },
  { id: "debrisShield", name: "Debris Shield", price: 780, description: "Protects sensors during nebula survey.", category: "survey", tier: "tuned", effect: { survey: true, shield: 15 } },
  { id: "raiderAlarm", name: "Raider Alarm", price: 1800, description: "Early warning system for hostile contacts.", category: "survey", tier: "experimental", effect: { survey: true, scanner: 4 } },
  { id: "patrolTracker", name: "Patrol Tracker", price: 1300, description: "Monitors local security movement.", category: "survey", tier: "specialist", effect: { survey: true, legalRisk: 0.7 } }
];

// Re-map the salvageLoom ID if it was incorrect or use it for one of the missing ones.
// I see I have some overlaps, let me clean up the last few.

export const DEFAULT_EQUIPMENT: EquipmentState = {} as EquipmentState;
EQUIPMENT.forEach(e => {
  DEFAULT_EQUIPMENT[e.id] = e.id === "pulseLaser";
});

export function buyEquipment(player: PlayerState, equipmentId: EquipmentId, station?: StationProfile): TradeResult {
  const definition = getEquipment(equipmentId);
  if (player.equipment[equipmentId]) {
    return { ok: false, reason: "Already installed", player };
  }

  if (station && !isEquipmentAvailableAtStation(definition, station)) {
    return { ok: false, reason: `${definition.name} is not stocked here`, player };
  }

  if (player.balance < definition.price) {
    return { ok: false, reason: "Not enough BAL", player };
  }

  const equipment = { ...player.equipment, [equipmentId]: true };
  return {
    ok: true,
    player: applyEquipmentEffects({
      ...player,
      balance: player.balance - definition.price,
      equipment
    })
  };
}

export function applyEquipmentEffects(player: PlayerState): PlayerState {
  return applyPlayerShipStats(player);
}

export function getLaserProfile(player: PlayerState): { damage: number; energyCost: number; label: string } {
  const shipStats = getPlayerShipStats(player);

  // Find highest damage weapon
  let bestWeapon = EQUIPMENT.find(e => e.id === "pulseLaser")!;
  EQUIPMENT.forEach(e => {
    if (e.category === "weapon" && player.equipment[e.id]) {
      if ((e.effect.damage || 0) > (bestWeapon.effect.damage || 0)) {
        bestWeapon = e;
      }
    }
  });

  return {
    damage: Math.round((bestWeapon.effect.damage || 0) * shipStats.combatDamageModifier),
    energyCost: bestWeapon.effect.energyCost || 0,
    label: bestWeapon.name
  };
}

export function getEquipment(id: EquipmentId): EquipmentDefinition {
  const definition = EQUIPMENT.find((item) => item.id === id);
  if (!definition) {
    throw new Error(`Unknown equipment ${id}`);
  }

  return definition;
}

export function isEquipmentAvailableAtStation(definition: EquipmentDefinition, station: StationProfile): boolean {
  if (definition.id === "pulseLaser") return true;
  if (definition.tier === "advanced" || definition.tier === "specialist") return station.services.advancedEquipment;
  if (definition.tier === "experimental") {
    if (!station.services.advancedEquipment) return false;
    // Stable "randomness" based on station ID and equipment ID
    const hash = station.id.length + definition.id.length;
    return hash % 2 === 0;
  }
  return station.services.equipment || station.services.advancedEquipment;
}

export function getEquipmentKeys(): EquipmentId[] {
  return EQUIPMENT.map((item) => item.id);
}
