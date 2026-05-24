import type { CargoHold, Commodity, CommodityId, MarketItem, PlayerState, TradeResult } from "./types";
import { getPlayerShipStats } from "./Ships";

export const TRADE_CONSTANTS = {
  fuelPrice: 6,
  maxFuel: 7.5
} as const;

export const REPAIR_COST_PER_HULL = 5;

export function calcRepairCost(player: PlayerState, stationModifier = 1): number {
  return Math.ceil((player.maxHull - player.hull) * REPAIR_COST_PER_HULL * getPlayerShipStats(player).repairCostModifier * stationModifier);
}

export function repairHull(player: PlayerState, stationModifier = 1): TradeResult {
  const missing = player.maxHull - player.hull;
  if (missing <= 0) return fail("Hull is already at full integrity", player);
  const costPerHull = Math.max(1, REPAIR_COST_PER_HULL * getPlayerShipStats(player).repairCostModifier * stationModifier);
  const affordable = Math.floor(player.balance / costPerHull);
  if (affordable <= 0) return fail("Not enough BAL for hull repair", player);
  const repairAmount = Math.min(missing, affordable);
  const cost = Math.ceil(repairAmount * costPerHull);
  return {
    ok: true,
    player: {
      ...player,
      hull: Math.min(player.maxHull, player.hull + repairAmount),
      balance: player.balance - cost
    }
  };
}

export const COMMODITIES: Commodity[] = [
  { id: "grain", name: "Grain", basePrice: 7, baseQuantity: 18, mass: 1 },
  { id: "minerals", name: "Minerals", basePrice: 12, baseQuantity: 13, mass: 1 },
  { id: "computers", name: "Computers", basePrice: 82, baseQuantity: 5, mass: 1 },
  { id: "medicine", name: "Medicine", basePrice: 48, baseQuantity: 8, mass: 1 },
  { id: "machinery", name: "Machinery", basePrice: 55, baseQuantity: 7, mass: 1 },
  { id: "luxuries", name: "Luxuries", basePrice: 96, baseQuantity: 3, mass: 1 },
  { id: "fuelCells", name: "Fuel Cells", basePrice: 22, baseQuantity: 10, mass: 1 },
  { id: "alloys", name: "Alloys", basePrice: 31, baseQuantity: 11, mass: 1 }
];

export function getCargoUsed(cargo: CargoHold): number {
  return Object.values(cargo).reduce((total, quantity) => total + (quantity ?? 0), 0);
}

export function getTotalOccupiedCargo(player: PlayerState): number {
  return getCargoUsed(player.cargo) + (player.missionCargoUnits ?? 0);
}

export function getAvailableCargoCapacity(player: PlayerState): number {
  return player.cargoCapacity - getTotalOccupiedCargo(player);
}

export function getBulkBuyQuantity(player: PlayerState, item: MarketItem): number {
  const free = Math.max(0, getAvailableCargoCapacity(player));
  const byBalance = item.price > 0 ? Math.floor(player.balance / item.price) : item.quantity;
  return Math.min(free, byBalance, item.quantity);
}

export function getBulkSellQuantity(player: PlayerState, item: MarketItem): number {
  return player.cargo[item.id] ?? 0;
}

export function getCommodity(id: CommodityId): Commodity {
  const commodity = COMMODITIES.find((item) => item.id === id);
  if (!commodity) {
    throw new Error(`Unknown commodity ${id}`);
  }

  return commodity;
}

export function buyCommodity(player: PlayerState, item: MarketItem, quantity: number): TradeResult {
  const amount = Math.max(0, Math.floor(quantity));
  if (amount <= 0) return fail("Quantity must be positive", player);
  if (item.quantity < amount) return fail("Market supply is too low", player);
  if (getTotalOccupiedCargo(player) + amount > player.cargoCapacity) return fail("Cargo hold is full", player);

  const totalCost = item.price * amount;
  if (player.balance < totalCost) return fail("Not enough BAL", player);

  const oldQty = player.cargo[item.id] ?? 0;
  const oldBasis = player.cargoCostBasis[item.id] ?? 0;
  const newQty = oldQty + amount;
  const newBasis = (oldQty * oldBasis + amount * item.price) / newQty;

  return {
    ok: true,
    player: {
      ...player,
      balance: player.balance - totalCost,
      cargo: {
        ...player.cargo,
        [item.id]: newQty
      },
      cargoCostBasis: {
        ...player.cargoCostBasis,
        [item.id]: newBasis
      }
    }
  };
}

export function sellCommodity(player: PlayerState, item: MarketItem, quantity: number): TradeResult {
  const amount = Math.max(0, Math.floor(quantity));
  if (amount <= 0) return fail("Quantity must be positive", player);

  const held = player.cargo[item.id] ?? 0;
  if (held < amount) return fail("Not enough cargo to sell", player);

  const nextCargo = { ...player.cargo };
  const nextCargoCostBasis = { ...player.cargoCostBasis };
  const remaining = held - amount;

  if (remaining <= 0) {
    delete nextCargo[item.id];
    delete nextCargoCostBasis[item.id];
  } else {
    nextCargo[item.id] = remaining;
    // Basis remains the same for the remaining units
  }

  return {
    ok: true,
    player: {
      ...player,
      balance: player.balance + item.price * amount,
      cargo: nextCargo,
      cargoCostBasis: nextCargoCostBasis
    }
  };
}

export function buyFuel(player: PlayerState, units: number): TradeResult {
  const amount = Math.max(0, Number(units.toFixed(1)));
  const fuelCapacity = getPlayerShipStats(player).fuelCapacity;
  if (amount <= 0) return fail("Fuel quantity must be positive", player);
  if (player.fuel + amount > fuelCapacity) return fail("Fuel tank is full", player);

  const cost = Math.ceil(amount * TRADE_CONSTANTS.fuelPrice);
  if (player.balance < cost) return fail("Not enough BAL", player);

  return {
    ok: true,
    player: {
      ...player,
      balance: player.balance - cost,
      fuel: Number((player.fuel + amount).toFixed(1))
    }
  };
}

function fail(reason: string, player: PlayerState): TradeResult {
  return { ok: false, reason, player };
}
