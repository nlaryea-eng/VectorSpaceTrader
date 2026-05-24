import type { EquipmentId, EquipmentState, PlayerState, TradeResult } from "./types";

export interface EquipmentDefinition {
  id: EquipmentId;
  name: string;
  price: number;
  description: string;
}

export const EQUIPMENT: EquipmentDefinition[] = [
  { id: "pulseLaser", name: "Pulse Laser", price: 180, description: "Reliable low-energy laser emitter." },
  { id: "beamLaser", name: "Beam Laser", price: 620, description: "Higher damage laser with a larger energy draw." },
  { id: "cargoExpansion", name: "Cargo Expansion", price: 420, description: "Adds 15 cargo units." },
  { id: "fuelScoop", name: "Fuel Scoop", price: 360, description: "Slowly recovers fuel while cruising." },
  { id: "shieldBooster", name: "Shield Booster", price: 540, description: "Raises maximum shield capacity." }
];

export const DEFAULT_EQUIPMENT: EquipmentState = {
  pulseLaser: true,
  beamLaser: false,
  cargoExpansion: false,
  fuelScoop: false,
  shieldBooster: false
};

export function buyEquipment(player: PlayerState, equipmentId: EquipmentId): TradeResult {
  const definition = getEquipment(equipmentId);
  if (player.equipment[equipmentId]) {
    return { ok: false, reason: "Already installed", player };
  }

  if (player.credits < definition.price) {
    return { ok: false, reason: "Not enough credits", player };
  }

  const equipment = { ...player.equipment, [equipmentId]: true };
  return {
    ok: true,
    player: applyEquipmentEffects({
      ...player,
      credits: player.credits - definition.price,
      equipment
    })
  };
}

export function applyEquipmentEffects(player: PlayerState): PlayerState {
  const cargoCapacity = player.equipment.cargoExpansion ? 35 : 20;
  const maxShield = player.equipment.shieldBooster ? 130 : 100;

  return {
    ...player,
    cargoCapacity,
    maxShield,
    shield: Math.min(player.shield, maxShield)
  };
}

export function getLaserProfile(player: PlayerState): { damage: number; energyCost: number; label: string } {
  if (player.equipment.beamLaser) {
    return { damage: 44, energyCost: 11, label: "Beam Laser" };
  }

  return { damage: 28, energyCost: 6, label: "Pulse Laser" };
}

export function getEquipment(id: EquipmentId): EquipmentDefinition {
  const definition = EQUIPMENT.find((item) => item.id === id);
  if (!definition) {
    throw new Error(`Unknown equipment ${id}`);
  }

  return definition;
}
