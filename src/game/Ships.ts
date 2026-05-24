import type { EquipmentState, PlayerShipId, PlayerState, TradeResult } from "./types";

export interface PlayerShipDefinition {
  id: PlayerShipId;
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
    id: "vannicHold",
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
    id: "talemRange",
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
    id: "brontWard",
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
    id: "calderaSpan",
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

export function getStatsForShip(shipId: PlayerShipId, equipment: EquipmentState): PlayerShipStats {
  const ship = getPlayerShip(shipId);
  const cargoBonus = (equipment.cargoExpansion ? 15 : 0) + (equipment.foldedHoldGrid ? 10 : 0);
  const shieldBonus = (equipment.shieldBooster ? 30 : 0) + (equipment.quietShieldMatrix ? 20 : 0);
  const fuelCapacityBonus = equipment.arcSpoolDrive ? 0.7 : 0;
  const rangeBonus = (equipment.arcSpoolDrive ? 3.2 : 0) + (equipment.routeAbacus ? 1.4 : 0);
  const fuelUseModifier = ship.fuelUseModifier * (equipment.thriftBurnRegulator ? 0.86 : 1);

  return {
    maxHull: ship.maxHull,
    maxShield: ship.maxShield + shieldBonus,
    cargoCapacity: ship.cargoCapacity + cargoBonus,
    fuelCapacity: Number((ship.fuelCapacity + fuelCapacityBonus).toFixed(1)),
    maxJumpRange: Number((BASE_JUMP_RANGE * ship.jumpRangeModifier + rangeBonus).toFixed(2)),
    fuelUseModifier: Number(fuelUseModifier.toFixed(3)),
    speedModifier: ship.speedModifier,
    handlingModifier: ship.handlingModifier,
    combatDamageModifier: ship.combatDamageModifier,
    repairCostModifier: equipment.fieldPatchDrones ? 0.75 : 1
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
  if (player.credits < target.price) {
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
    credits: player.credits - target.price,
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
