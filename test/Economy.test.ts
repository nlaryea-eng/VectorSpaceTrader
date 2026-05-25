import { describe, expect, it } from "vitest";
import {
  applyEconomyDrift,
  applyTradeToEconomy,
  createEconomyState,
  generateDynamicMarket,
  recordPriceHistory
} from "../src/game/Economy";
import { getStationProfile } from "../src/game/StationServices";
import { buyCommodity, getMarketBuyPrice, getMarketSellPrice, sellCommodity, TRADE_CONSTANTS } from "../src/game/Trading";
import { canJump, generateUniverse, getFuelRequired } from "../src/game/Universe";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import type { MarketItem, PlayerState, StarSystem } from "../src/game/types";

describe("Economy", () => {
  it("applies deterministic economy drift", () => {
    const systems = generateUniverse(22);
    const state = createEconomyState(systems);

    expect(applyEconomyDrift(state, systems, 22)).toEqual(applyEconomyDrift(state, systems, 22));
  });

  it("records price history for each market commodity", () => {
    const systems = generateUniverse(22);
    const state = createEconomyState(systems);
    const market = generateDynamicMarket(systems[0], state);
    const next = recordPriceHistory(state, systems[0].id, market);

    expect(next.priceHistory).toHaveLength(market.length);
    expect(next.priceHistory[0]).toMatchObject({
      day: 0,
      systemId: systems[0].id,
      commodityId: market[0].id,
      price: market[0].price
    });
  });

  it("updates supply and price pressure after a purchase", () => {
    const systems = generateUniverse(22);
    const state = createEconomyState(systems);
    const before = generateDynamicMarket(systems[0], state).find((item) => item.id === "grain");
    const next = applyTradeToEconomy(state, systems[0].id, "grain", -5);
    const after = generateDynamicMarket(systems[0], next).find((item) => item.id === "grain");

    expect(before).toBeDefined();
    expect(after).toBeDefined();
    expect(after?.quantity).toBeLessThan(before?.quantity ?? 0);
    expect(after?.price).toBeGreaterThanOrEqual(before?.price ?? 0);
  });

  it("generates BUY and SELL prices with no same-station inversion", () => {
    const systems = generateUniverse(492017);
    const state = createEconomyState(systems);

    for (const system of systems) {
      const station = getStationProfile(system);
      const market = generateDynamicMarket(system, state, station.marketScale, station.marketPriceModifier);
      for (const item of market) {
        expect(item.price).toBe(item.buyPrice);
        expect(getMarketSellPrice(item)).toBeLessThanOrEqual(getMarketBuyPrice(item));
        expect(getMarketBuyPrice(item)).toBeGreaterThanOrEqual(1);
        expect(getMarketSellPrice(item)).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("low-price spread rounding cannot create same-station profit", () => {
    const item: MarketItem = {
      id: "grain",
      name: "Grain",
      basePrice: 7,
      baseQuantity: 18,
      mass: 1,
      price: 1,
      buyPrice: 1,
      sellPrice: 1,
      quantity: 10,
      marketSignal: "STEADY"
    };
    const starting = makePlayer({ balance: 10, cargoCapacity: 10 });
    const bought = buyCommodity(starting, item, 1);
    const sold = sellCommodity(bought.player, item, 1);

    expect(sold.player.balance).toBeLessThanOrEqual(starting.balance);
  });

  it("buying then immediately selling max affordable quantity cannot increase BAL", () => {
    const systems = generateUniverse(492017);
    const state = createEconomyState(systems);
    const station = getStationProfile(systems[0]);
    const market = generateDynamicMarket(systems[0], state, station.marketScale, station.marketPriceModifier);
    const item = market.find((candidate) => candidate.quantity > 0 && getMarketBuyPrice(candidate) <= 1000)!;
    const starting = makePlayer({ balance: 1000, cargoCapacity: 20 });
    const quantity = Math.min(item.quantity, starting.cargoCapacity, Math.floor(starting.balance / getMarketBuyPrice(item)));
    const bought = buyCommodity(starting, item, quantity);
    const sold = sellCommodity(bought.player, item, quantity);

    expect(quantity).toBeGreaterThan(0);
    expect(bought.ok).toBe(true);
    expect(sold.ok).toBe(true);
    expect(sold.player.balance).toBeLessThanOrEqual(starting.balance);
  });

  it("assigns deterministic market signals for every commodity row", () => {
    const systems = generateUniverse(492017);
    const state = createEconomyState(systems);
    const marketA = generateDynamicMarket(systems[12], state, 1, 1);
    const marketB = generateDynamicMarket(systems[12], state, 1, 1);

    expect(marketA.map((item) => item.marketSignal)).toEqual(marketB.map((item) => item.marketSignal));
    expect(marketA.every((item) => ["SURPLUS", "STEADY", "DEMAND", "SHORTAGE"].includes(item.marketSignal ?? ""))).toBe(true);
  });

  it("selling into a station uses existing supply and drift pressure to damp future profit", () => {
    const systems = generateUniverse(492017);
    const state = createEconomyState(systems);
    const station = getStationProfile(systems[4]);
    const before = generateDynamicMarket(systems[4], state, station.marketScale, station.marketPriceModifier)
      .find((item) => item.marketSignal === "DEMAND" || item.marketSignal === "SHORTAGE")
      ?? generateDynamicMarket(systems[4], state, station.marketScale, station.marketPriceModifier)[0];
    const next = applyTradeToEconomy(state, systems[4].id, before.id, 5);
    const after = generateDynamicMarket(systems[4], next, station.marketScale, station.marketPriceModifier)
      .find((item) => item.id === before.id)!;

    expect(applyTradeToEconomy(state, systems[4].id, before.id, 5)).toEqual(next);
    expect(after.quantity).toBeGreaterThanOrEqual(before.quantity);
    expect(getMarketSellPrice(after)).toBeLessThanOrEqual(getMarketSellPrice(before));
  });

  it("keeps market prices and quantities inside sane bounds", () => {
    const systems = generateUniverse(492017);
    const state = createEconomyState(systems);

    for (const system of systems) {
      const station = getStationProfile(system);
      for (const item of generateDynamicMarket(system, state, station.marketScale, station.marketPriceModifier)) {
        expect(item.quantity).toBeGreaterThanOrEqual(0);
        expect(getMarketBuyPrice(item)).toBeGreaterThanOrEqual(1);
        expect(getMarketBuyPrice(item)).toBeLessThanOrEqual(Math.round(item.basePrice * 2.25));
      }
    }
  });

  it("keeps at least one bounded profitable starter-neighborhood route after fuel cost", () => {
    const systems = generateUniverse(492017);
    const state = createEconomyState(systems);
    const player = makePlayer();
    const start = systems[player.currentSystemId];
    const startMarket = marketFor(start, state);
    const opportunities = systems
      .filter((system) => system.id !== start.id && canJump(start, system, player.fuel, player))
      .flatMap((system) => {
        const destinationMarket = marketFor(system, state);
        const fuelCost = getFuelRequired(start, system, player) * TRADE_CONSTANTS.fuelPrice;
        return startMarket.map((sourceItem) => {
          const destinationItem = destinationMarket.find((item) => item.id === sourceItem.id)!;
          const quantity = Math.min(sourceItem.quantity, player.cargoCapacity, Math.floor(player.balance / getMarketBuyPrice(sourceItem)));
          const profit = (getMarketSellPrice(destinationItem) - getMarketBuyPrice(sourceItem)) * quantity - fuelCost;
          return { profit, quantity };
        });
      });

    expect(opportunities.some((opportunity) => opportunity.quantity > 0 && opportunity.profit >= 8 && opportunity.profit <= 900)).toBe(true);
  });
});

function marketFor(system: StarSystem, state: ReturnType<typeof createEconomyState>): MarketItem[] {
  const station = getStationProfile(system);
  return generateDynamicMarket(system, state, station.marketScale, station.marketPriceModifier);
}

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 100,
    maxHull: 100,
    shield: 100,
    maxShield: 100,
    energy: 100,
    balance: 1000,
    fuel: 7.5,
    cargo: {},
    cargoCostBasis: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0],
    docked: false,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    missionCargoUnits: 0,
    ...overrides
  };
}
