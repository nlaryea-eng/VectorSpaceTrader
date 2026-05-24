import type { EquipmentState, PlayerShipId, PlayerState, ShipClassId, TradeResult } from "./types";

export interface PlayerShipDefinition {
  id: PlayerShipId;
  classId: ShipClassId;
  name: string;
  role: string;
  price: number;
  maxHull: number;
  maxShield: number;
  cargoCapacity: number;
  fuelCapacity: number;
  jumpRangeModifier: number;
  fuelUseModifier: number;
  speedModifier: number;
  handlingModifier: number;
  combatDamageModifier: number;
  description: string;
}

export interface PlayerShipStats {
  maxHull: number;
  maxShield: number;
  cargoCapacity: number;
  fuelCapacity: number;
  maxJumpRange: number;
  fuelUseModifier: number;
  speedModifier: number;
  handlingModifier: number;
  combatDamageModifier: number;
  repairCostModifier: number;
}

export const STARTER_SHIP_ID: PlayerShipId = "mirelle";
export const BASE_JUMP_RANGE = 24;

export const PLAYER_SHIPS: readonly PlayerShipDefinition[] = [
  {
    id: "mirelle",
    classId: "starter",
    name: "Mirelle",
    role: "Starter generalist",
    price: 0,
    maxHull: 100,
    maxShield: 100,
    cargoCapacity: 20,
    fuelCapacity: 7.5,
    jumpRangeModifier: 1,
    fuelUseModifier: 1,
    speedModifier: 1,
    handlingModifier: 1,
    combatDamageModifier: 1,
    description: "A modest courier frame with enough hold space and protection to learn every trade."
  },
  {
    id: "vaskRelay",
    classId: "courier",
    name: "Vask Relay",
    role: "Courier interceptor",
    price: 1500,
    maxHull: 82,
    maxShield: 86,
    cargoCapacity: 12,
    fuelCapacity: 8.3,
    jumpRangeModifier: 1.12,
    fuelUseModifier: 0.94,
    speedModifier: 1.17,
    handlingModifier: 1.16,
    combatDamageModifier: 0.96,
    description: "Fast, light, and efficient for urgent contracts with little room for bulk freight."
  },
  {
    id: "swiftVector",
    classId: "courier",
    name: "Swift Vector",
    role: "Data runner",
    price: 2100,
    maxHull: 75,
    maxShield: 80,
    cargoCapacity: 10,
    fuelCapacity: 9.0,
    jumpRangeModifier: 1.2,
    fuelUseModifier: 0.88,
    speedModifier: 1.25,
    handlingModifier: 1.22,
    combatDamageModifier: 0.9,
    description: "Tuned for speed and evasion, sacrifice hold space for unmatched transit times."
  },
  {
    id: "vannicHold",
    classId: "hauler",
    name: "Vannic Hold",
    role: "Cargo hauler",
    price: 2600,
    maxHull: 130,
    maxShield: 88,
    cargoCapacity: 52,
    fuelCapacity: 7.2,
    jumpRangeModifier: 0.95,
    fuelUseModifier: 1.08,
    speedModifier: 0.82,
    handlingModifier: 0.78,
    combatDamageModifier: 0.92,
    description: "A broad-bellied hauler built around route profit and contract cargo."
  },
  {
    id: "bulkTitan",
    classId: "hauler",
    name: "Bulk Titan",
    role: "Heavy freighter",
    price: 4800,
    maxHull: 180,
    maxShield: 110,
    cargoCapacity: 95,
    fuelCapacity: 6.8,
    jumpRangeModifier: 0.85,
    fuelUseModifier: 1.25,
    speedModifier: 0.7,
    handlingModifier: 0.65,
    combatDamageModifier: 0.85,
    description: "Massive hold capacity for high-volume trade, though slow and fuel-hungry."
  },
  {
    id: "talemRange",
    classId: "explorer",
    name: "Talem Range",
    role: "Survey explorer",
    price: 3100,
    maxHull: 96,
    maxShield: 106,
    cargoCapacity: 24,
    fuelCapacity: 10.5,
    jumpRangeModifier: 1.25,
    fuelUseModifier: 0.9,
    speedModifier: 1.04,
    handlingModifier: 1.05,
    combatDamageModifier: 1,
    description: "An efficient long-lane hull tuned for discovery, survey work, and sparse routes."
  },
  {
    id: "voidSeeker",
    classId: "explorer",
    name: "Void Seeker",
    role: "Deep scout",
    price: 5400,
    maxHull: 110,
    maxShield: 120,
    cargoCapacity: 28,
    fuelCapacity: 14.0,
    jumpRangeModifier: 1.4,
    fuelUseModifier: 0.85,
    speedModifier: 1.1,
    handlingModifier: 1.12,
    combatDamageModifier: 1.05,
    description: "Premium exploration frame with massive fuel reserves and enhanced sensor housing."
  },
  {
    id: "brontWard",
    classId: "armored",
    name: "Bront Ward",
    role: "Armored brawler",
    price: 3700,
    maxHull: 175,
    maxShield: 132,
    cargoCapacity: 18,
    fuelCapacity: 7,
    jumpRangeModifier: 0.9,
    fuelUseModifier: 1.14,
    speedModifier: 0.76,
    handlingModifier: 0.72,
    combatDamageModifier: 1.18,
    description: "Heavy plating and hardpoints trade speed and hold space for survival."
  },
  {
    id: "ironBastion",
    classId: "armored",
    name: "Iron Bastion",
    role: "Siege platform",
    price: 5900,
    maxHull: 240,
    maxShield: 160,
    cargoCapacity: 22,
    fuelCapacity: 6.5,
    jumpRangeModifier: 0.8,
    fuelUseModifier: 1.35,
    speedModifier: 0.65,
    handlingModifier: 0.6,
    combatDamageModifier: 1.3,
    description: "The ultimate in defensive engineering, capable of weathering intense combat."
  },
  {
    id: "calderaSpan",
    classId: "balanced",
    name: "Caldera Span",
    role: "Balanced late-demo ship",
    price: 6200,
    maxHull: 145,
    maxShield: 140,
    cargoCapacity: 34,
    fuelCapacity: 9.5,
    jumpRangeModifier: 1.15,
    fuelUseModifier: 0.92,
    speedModifier: 1.03,
    handlingModifier: 1.02,
    combatDamageModifier: 1.08,
    description: "A premium all-route frame with balanced reach, hold space, and combat tolerance."
  },
  {
    id: "voidTrekker",
    classId: "longRange",
    name: "Void Trekker",
    role: "Long-lane specialist",
    price: 4300,
    maxHull: 105,
    maxShield: 115,
    cargoCapacity: 30,
    fuelCapacity: 12.5,
    jumpRangeModifier: 1.35,
    fuelUseModifier: 0.88,
    speedModifier: 1.02,
    handlingModifier: 1.0,
    combatDamageModifier: 1.0,
    description: "Designed for systems where fuel stops are rare and jumps are long."
  },
  {
    id: "apexVoyager",
    classId: "balanced",
    name: "Apex Voyager",
    role: "Premium multi-role",
    price: 8500,
    maxHull: 160,
    maxShield: 155,
    cargoCapacity: 45,
    fuelCapacity: 11.0,
    jumpRangeModifier: 1.25,
    fuelUseModifier: 0.85,
    speedModifier: 1.1,
    handlingModifier: 1.1,
    combatDamageModifier: 1.15,
    description: "Cutting-edge design that refuses to compromise on any core flight system."
  },
  {
    id: "surveyRig",
    classId: "specialist",
    name: "Survey Rig",
    role: "Sensor platform",
    price: 3400,
    maxHull: 115,
    maxShield: 105,
    cargoCapacity: 32,
    fuelCapacity: 8.5,
    jumpRangeModifier: 1.1,
    fuelUseModifier: 1.0,
    speedModifier: 0.95,
    handlingModifier: 0.98,
    combatDamageModifier: 1.0,
    description: "Modified industrial hull optimized for systemic survey and data collection."
  },
  {
    id: "salvageBarge",
    classId: "specialist",
    name: "Salvage Barge",
    role: "Wreckage hauler",
    price: 3900,
    maxHull: 155,
    maxShield: 95,
    cargoCapacity: 68,
    fuelCapacity: 7.8,
    jumpRangeModifier: 0.9,
    fuelUseModifier: 1.15,
    speedModifier: 0.85,
    handlingModifier: 0.82,
    combatDamageModifier: 1.05,
    description: "Rugged hull with reinforced bays for handling debris and salvaged components."
  }
] as const;

const SHIP_IDS = new Set<PlayerShipId>(PLAYER_SHIPS.map((ship) => ship.id));

export function isPlayerShipId(value: unknown): value is PlayerShipId {
  return typeof value === "string" && SHIP_IDS.has(value as PlayerShipId);
}

export function normalizeShipId(value: unknown): PlayerShipId {
  return isPlayerShipId(value) ? value : STARTER_SHIP_ID;
}

export function getPlayerShip(id: PlayerShipId): PlayerShipDefinition {
  const ship = PLAYER_SHIPS.find((item) => item.id === id);
  if (!ship) throw new Error(`Unknown player ship ${id}`);
  return ship;
}

export function getPlayerShipStats(player: Pick<PlayerState, "shipId" | "equipment">): PlayerShipStats {
  return getStatsForShip(normalizeShipId(player.shipId), player.equipment);
}

import { EQUIPMENT } from "./Equipment";

export function getStatsForShip(shipId: PlayerShipId, equipmentState: EquipmentState): PlayerShipStats {
  const ship = getPlayerShip(shipId);

  let cargoBonus = 0;
  let shieldBonus = 0;
  let shieldRechargeBonus = 0;
  let fuelCapacityBonus = 0;
  let rangeBonus = 0;
  let fuelUseModifier = ship.fuelUseModifier;
  let repairCostModifier = 1;
  let speedModifier = ship.speedModifier;
  let handlingModifier = ship.handlingModifier;
  let combatDamageModifier = ship.combatDamageModifier;

  EQUIPMENT.forEach(item => {
    if (equipmentState[item.id]) {
      const e = item.effect;
      if (e.cargo) cargoBonus += e.cargo;
      if (e.shield) shieldBonus += e.shield;
      if (e.shieldRecharge) shieldRechargeBonus += e.shieldRecharge;
      if (e.fuelCapacity) fuelCapacityBonus += e.fuelCapacity;
      if (e.jumpRange) rangeBonus += e.jumpRange;
      if (e.fuelUse) fuelUseModifier *= e.fuelUse;
      if (e.repairCost) repairCostModifier *= e.repairCost;
      if (e.speed) speedModifier *= e.speed;
      if (e.handling) handlingModifier *= e.handling;
      // Note: hull bonus is applied as a fixed amount to maxHull, but ships might have different bases.
      // We'll treat it as additive to the base hull.
    }
  });

  const hullBonus = EQUIPMENT.reduce((acc, item) =>
    equipmentState[item.id] ? acc + (item.effect.hull ?? 0) : acc, 0);

  return {
    maxHull: ship.maxHull + hullBonus,
    maxShield: ship.maxShield + shieldBonus,
    cargoCapacity: ship.cargoCapacity + cargoBonus,
    fuelCapacity: Number((ship.fuelCapacity + fuelCapacityBonus).toFixed(1)),
    maxJumpRange: Number((BASE_JUMP_RANGE * ship.jumpRangeModifier + rangeBonus).toFixed(2)),
    fuelUseModifier: Number(fuelUseModifier.toFixed(3)),
    speedModifier: Number(speedModifier.toFixed(3)),
    handlingModifier: Number(handlingModifier.toFixed(3)),
    combatDamageModifier: Number(combatDamageModifier.toFixed(3)),
    repairCostModifier: Number(repairCostModifier.toFixed(3))
  };
}

export function applyPlayerShipStats(player: PlayerState): PlayerState {
  const shipId = normalizeShipId(player.shipId);
  const stats = getStatsForShip(shipId, player.equipment);
  return {
    ...player,
    shipId,
    maxHull: stats.maxHull,
    hull: Math.min(player.hull, stats.maxHull),
    maxShield: stats.maxShield,
    shield: Math.min(player.shield, stats.maxShield),
    cargoCapacity: stats.cargoCapacity,
    fuel: Math.min(player.fuel, stats.fuelCapacity)
  };
}

export function buyShip(player: PlayerState, shipId: PlayerShipId): TradeResult {
  const targetId = normalizeShipId(shipId);
  const target = getPlayerShip(targetId);
  if (targetId === normalizeShipId(player.shipId)) {
    return { ok: false, reason: "Current ship already active", player };
  }
  if (player.balance < target.price) {
    return { ok: false, reason: "Not enough BAL for this hull", player };
  }

  const nextStats = getStatsForShip(targetId, player.equipment);
  const occupiedCargo = getOccupiedCargo(player);
  if (occupiedCargo > nextStats.cargoCapacity) {
    return {
      ok: false,
      reason: `Cargo overflow: need ${occupiedCargo}/${nextStats.cargoCapacity} capacity clear`,
      player
    };
  }

  const hullRatio = player.maxHull > 0 ? player.hull / player.maxHull : 1;
  const shieldRatio = player.maxShield > 0 ? player.shield / player.maxShield : 1;
  const purchased: PlayerState = {
    ...player,
    shipId: targetId,
    balance: player.balance - target.price,
    maxHull: nextStats.maxHull,
    hull: Math.min(nextStats.maxHull, Math.round(nextStats.maxHull * hullRatio)),
    maxShield: nextStats.maxShield,
    shield: Math.min(nextStats.maxShield, Math.round(nextStats.maxShield * shieldRatio)),
    cargoCapacity: nextStats.cargoCapacity,
    fuel: Math.min(player.fuel, nextStats.fuelCapacity)
  };

  return { ok: true, player: purchased };
}

function getOccupiedCargo(player: PlayerState): number {
  return Object.values(player.cargo).reduce((total, quantity) => total + (quantity ?? 0), 0) + (player.missionCargoUnits ?? 0);
}
