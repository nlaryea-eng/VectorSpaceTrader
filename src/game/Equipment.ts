import type { EquipmentId, EquipmentState, PlayerState, TradeResult } from "./types";
import { applyPlayerShipStats, getPlayerShipStats } from "./Ships";
import type { StationProfile } from "./StationServices";

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  price: number;
  description: string;
  category: "weapon" | "cargo" | "fuel" | "shield" | "survey" | "repair" | "navigation" | "salvage";
  tier: "basic" | "advanced";
}

export const EQUIPMENT: EquipmentDefinition[] = [
  { id: "pulseLaser", name: "Pulse Laser", price: 180, description: "Reliable low-energy laser emitter.", category: "weapon", tier: "basic" },
  { id: "beamLaser", name: "Beam Laser", price: 620, description: "Higher damage laser with a larger energy draw.", category: "weapon", tier: "advanced" },
  { id: "cargoExpansion", name: "Cargo Expansion", price: 420, description: "Adds 15 cargo units.", category: "cargo", tier: "basic" },
  { id: "fuelScoop", name: "Fuel Scoop", price: 360, description: "Slowly recovers fuel while cruising.", category: "fuel", tier: "basic" },
  { id: "shieldBooster", name: "Shield Booster", price: 540, description: "Raises maximum shield capacity.", category: "shield", tier: "basic" },
  { id: "laneGlassScanner", name: "Lane Glass Scanner", price: 260, description: "Unlocks survey contracts and highlights route details.", category: "survey", tier: "basic" },
  { id: "arcSpoolDrive", name: "Arc Spool Drive", price: 760, description: "Extends jump reach and adds a small fuel reserve.", category: "navigation", tier: "advanced" },
  { id: "foldedHoldGrid", name: "Folded Hold Grid", price: 680, description: "Adds 10 cargo units without replacing the main hold.", category: "cargo", tier: "advanced" },
  { id: "fieldPatchDrones", name: "Field Patch Drones", price: 500, description: "Reduces station hull repair costs.", category: "repair", tier: "basic" },
  { id: "quietShieldMatrix", name: "Quiet Shield Matrix", price: 720, description: "Adds shield capacity and steadier shield recovery.", category: "shield", tier: "advanced" },
  { id: "thriftBurnRegulator", name: "Thrift Burn Regulator", price: 460, description: "Reduces fuel required for jumps.", category: "fuel", tier: "basic" },
  { id: "routeAbacus", name: "Route Abacus", price: 390, description: "Improves map filtering and adds a modest range bonus.", category: "navigation", tier: "basic" },
  { id: "salvageTongs", name: "Salvage Tongs", price: 580, description: "Unlocks salvage contracts at suitable stations.", category: "salvage", tier: "advanced" }
];

export const DEFAULT_EQUIPMENT: EquipmentState = {
  pulseLaser: true,
  beamLaser: false,
  cargoExpansion: false,
  fuelScoop: false,
  shieldBooster: false,
  laneGlassScanner: false,
  arcSpoolDrive: false,
  foldedHoldGrid: false,
  fieldPatchDrones: false,
  quietShieldMatrix: false,
  thriftBurnRegulator: false,
  routeAbacus: false,
  salvageTongs: false
};

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
  if (player.equipment.beamLaser) {
    return { damage: Math.round(44 * shipStats.combatDamageModifier), energyCost: 11, label: "Beam Laser" };
  }

  return { damage: Math.round(28 * shipStats.combatDamageModifier), energyCost: 6, label: "Pulse Laser" };
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
  if (definition.tier === "advanced") return station.services.advancedEquipment;
  return station.services.equipment || station.services.advancedEquipment;
}

export function getEquipmentKeys(): EquipmentId[] {
  return EQUIPMENT.map((item) => item.id);
}
