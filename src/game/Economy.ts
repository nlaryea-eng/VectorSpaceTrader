import type { CommodityId, EconomyState, MarketItem, MarketSignal, StarSystem } from "./types";
import { COMMODITIES } from "./Trading";
import { getWorldTradePriceModifier, getWorldTradeQuantityModifier, getWorldTradeRole } from "./WorldClasses";

export const ECONOMY_CONSTANTS = {
  maxHistoryEntries: 240,
  driftStep: 0.035,
  minDrift: 0.7,
  maxDrift: 1.35,
  spreadRate: 0.06,
  maxPriceFactor: 2.25,
  maxQuantityFactor: 2.8
} as const;

export function createEconomyState(systems: StarSystem[]): EconomyState {
  return {
    day: 0,
    drift: Object.fromEntries(
      systems.map((system) => [
        system.id,
        Object.fromEntries(COMMODITIES.map((commodity) => [commodity.id, 1])) as Record<CommodityId, number>
      ])
    ),
    supplyAdjustments: Object.fromEntries(systems.map((system) => [system.id, {}])),
    priceHistory: []
  };
}

export function generateDynamicMarket(system: StarSystem, economy: EconomyState, marketScale = 1, stationPriceModifier = 1): MarketItem[] {
  const drift = economy.drift[system.id] ?? ({} as Record<CommodityId, number>);
  const supplyAdjustments = economy.supplyAdjustments[system.id] ?? {};

  return COMMODITIES.map((commodity) => {
    const modifier = system.marketModifiers[commodity.id];
    const driftFactor = drift[commodity.id] ?? 1;
    const supplyShift = supplyAdjustments[commodity.id] ?? 0;
    const techSupply = commodity.id === "computers" || commodity.id === "medicine" ? system.techLevel : 13 - system.techLevel;
    const worldQuantityModifier = getWorldTradeQuantityModifier(system, commodity.id);
    const worldPriceModifier = getWorldTradePriceModifier(system, commodity.id);
    const boundedStationPriceModifier = clamp(stationPriceModifier, 0.94, 1.08);
    const rawPrice = commodity.basePrice * modifier * driftFactor * worldPriceModifier * boundedStationPriceModifier;
    const buyPrice = clampInteger(rawPrice, 1, Math.max(1, Math.round(commodity.basePrice * ECONOMY_CONSTANTS.maxPriceFactor)));
    const sellPrice = getStationSellPrice(buyPrice);
    const rawQuantity = (commodity.baseQuantity * modifier + techSupply + supplyShift) * marketScale * worldQuantityModifier;
    const quantity = clampInteger(rawQuantity, 0, Math.max(1, Math.round((commodity.baseQuantity + 13) * ECONOMY_CONSTANTS.maxQuantityFactor)));
    const marketSignal = getLocalMarketSignal(system, commodity.id, {
      priceFactor: rawPrice / commodity.basePrice,
      quantityRatio: quantity / Math.max(1, Math.round((commodity.baseQuantity + techSupply) * marketScale)),
      driftFactor,
      supplyShift
    });

    return { ...commodity, price: buyPrice, buyPrice, sellPrice, marketSignal, quantity };
  });
}

export function getStationSellPrice(buyPrice: number): number {
  const normalizedBuy = Math.max(1, Math.round(buyPrice));
  const spread = Math.max(1, Math.ceil(normalizedBuy * ECONOMY_CONSTANTS.spreadRate));
  return Math.max(1, normalizedBuy - spread);
}

export function applyEconomyDrift(economy: EconomyState, systems: StarSystem[], seed: number): EconomyState {
  const day = economy.day + 1;
  const drift = structuredCloneEconomyDrift(economy.drift);

  for (const system of systems) {
    drift[system.id] ??= Object.fromEntries(COMMODITIES.map((commodity) => [commodity.id, 1])) as Record<CommodityId, number>;
    for (const commodity of COMMODITIES) {
      const wave = Math.sin((seed + day * 17 + system.id * 31 + commodity.basePrice * 7) * 0.017);
      const next = drift[system.id][commodity.id] + wave * ECONOMY_CONSTANTS.driftStep;
      drift[system.id][commodity.id] = clamp(next, ECONOMY_CONSTANTS.minDrift, ECONOMY_CONSTANTS.maxDrift);
    }
  }

  return { ...economy, day, drift };
}

export function applyTradeToEconomy(
  economy: EconomyState,
  systemId: number,
  commodityId: CommodityId,
  quantityDelta: number
): EconomyState {
  const supplyAdjustments = { ...economy.supplyAdjustments };
  const systemAdjustments = { ...(supplyAdjustments[systemId] ?? {}) };
  systemAdjustments[commodityId] = (systemAdjustments[commodityId] ?? 0) + quantityDelta;
  supplyAdjustments[systemId] = systemAdjustments;

  const drift = structuredCloneEconomyDrift(economy.drift);
  drift[systemId] ??= Object.fromEntries(COMMODITIES.map((commodity) => [commodity.id, 1])) as Record<CommodityId, number>;
  const pressure = quantityDelta < 0 ? 0.02 : -0.015;
  drift[systemId][commodityId] = clamp(
    (drift[systemId][commodityId] ?? 1) + pressure * Math.abs(quantityDelta),
    ECONOMY_CONSTANTS.minDrift,
    ECONOMY_CONSTANTS.maxDrift
  );

  return { ...economy, drift, supplyAdjustments };
}

export function recordPriceHistory(economy: EconomyState, systemId: number, market: MarketItem[]): EconomyState {
  const entries = market.map((item) => ({
    day: economy.day,
    systemId,
    commodityId: item.id,
    price: item.price
  }));

  return {
    ...economy,
    priceHistory: [...economy.priceHistory, ...entries].slice(-ECONOMY_CONSTANTS.maxHistoryEntries)
  };
}

function structuredCloneEconomyDrift(
  drift: Record<number, Record<CommodityId, number>>
): Record<number, Record<CommodityId, number>> {
  return Object.fromEntries(
    Object.entries(drift).map(([systemId, values]) => [systemId, { ...values }])
  ) as Record<number, Record<CommodityId, number>>;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number(value.toFixed(4))));
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function getLocalMarketSignal(
  system: StarSystem,
  commodityId: CommodityId,
  context: { priceFactor: number; quantityRatio: number; driftFactor: number; supplyShift: number }
): MarketSignal {
  const role = getWorldTradeRole(system, commodityId);
  const roleBias = role === "export" ? -0.55 : role === "import" ? 0.55 : 0;
  const pricePressure = (context.priceFactor - 1) * 1.6;
  const stockPressure = (1 - context.quantityRatio) * 0.9;
  const driftPressure = (context.driftFactor - 1) * 0.8;
  const supplyPressure = context.supplyShift > 0 ? -0.18 : context.supplyShift < 0 ? 0.18 : 0;
  const score = pricePressure + stockPressure + driftPressure + supplyPressure + roleBias;

  if (score <= -0.45) return "SURPLUS";
  if (score >= 0.9) return "SHORTAGE";
  if (score >= 0.35) return "DEMAND";
  return "STEADY";
}

export interface PriceTrend {
  symbol: string;
  delta: number;
  label: string;
}

export function getPriceTrend(previousPrice: number | undefined, currentPrice: number): PriceTrend {
  if (previousPrice === undefined || previousPrice <= 0) {
    return { symbol: "—", delta: 0, label: "unknown" };
  }
  const delta = currentPrice - previousPrice;
  const pct = Math.round((delta / previousPrice) * 100);
  if (Math.abs(pct) < 3) return { symbol: "—", delta: pct, label: "stable" };
  return delta > 0
    ? { symbol: "▲", delta: pct, label: "rising" }
    : { symbol: "▼", delta: pct, label: "falling" };
}

export function getLastKnownPrice(economy: EconomyState, systemId: number, commodityId: CommodityId): number | undefined {
  const relevant = economy.priceHistory.filter(
    (entry) => entry.systemId === systemId && entry.commodityId === commodityId
  );
  if (relevant.length < 2) return undefined;
  return relevant[relevant.length - 2].price;
}
