import { describe, expect, it } from "vitest";
import {
  getAvailableCargoCapacity,
  getBulkBuyQuantity,
  getBulkSellQuantity,
  getTotalOccupiedCargo
} from "../src/game/Trading";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import type { MarketItem, PlayerState } from "../src/game/types";

describe("BulkTrading helpers", () => {
  describe("getTotalOccupiedCargo", () => {
    it("returns commodity cargo when no mission cargo", () => {
      const player = makePlayer({ cargo: { grain: 5, alloys: 3 } });
      expect(getTotalOccupiedCargo(player)).toBe(8);
    });

    it("adds mission cargo units to commodity cargo", () => {
      const player = makePlayer({ cargo: { grain: 5 }, missionCargoUnits: 3 });
      expect(getTotalOccupiedCargo(player)).toBe(8);
    });

    it("treats undefined missionCargoUnits as zero", () => {
      const player = makePlayer({ cargo: { grain: 4 } });
      expect(getTotalOccupiedCargo(player)).toBe(4);
    });
  });

  describe("getAvailableCargoCapacity", () => {
    it("returns full capacity when hold is empty", () => {
      const player = makePlayer({ cargoCapacity: 20 });
      expect(getAvailableCargoCapacity(player)).toBe(20);
    });

    it("subtracts commodity and mission cargo", () => {
      const player = makePlayer({ cargo: { grain: 5 }, missionCargoUnits: 3, cargoCapacity: 20 });
      expect(getAvailableCargoCapacity(player)).toBe(12);
    });
  });

  describe("getBulkBuyQuantity", () => {
    it("returns quantity limited by market supply", () => {
      const player = makePlayer({ balance: 10000, cargoCapacity: 20 });
      const item = makeItem({ quantity: 5, price: 10 });
      expect(getBulkBuyQuantity(player, item)).toBe(5);
    });

    it("returns quantity limited by available BAL", () => {
      const player = makePlayer({ balance: 30, cargoCapacity: 20 });
      const item = makeItem({ quantity: 20, price: 10 });
      expect(getBulkBuyQuantity(player, item)).toBe(3);
    });

    it("returns quantity limited by free cargo space", () => {
      const player = makePlayer({ balance: 10000, cargo: { grain: 17 }, cargoCapacity: 20 });
      const item = makeItem({ quantity: 20, price: 10 });
      expect(getBulkBuyQuantity(player, item)).toBe(3);
    });

    it("accounts for mission cargo when calculating free space", () => {
      const player = makePlayer({ balance: 10000, missionCargoUnits: 5, cargoCapacity: 20 });
      const item = makeItem({ quantity: 20, price: 10 });
      expect(getBulkBuyQuantity(player, item)).toBe(15);
    });

    it("returns zero when hold is full", () => {
      const player = makePlayer({ balance: 10000, cargo: { grain: 20 }, cargoCapacity: 20 });
      const item = makeItem({ quantity: 10, price: 10 });
      expect(getBulkBuyQuantity(player, item)).toBe(0);
    });

    it("returns zero when BAL is insufficient for one unit", () => {
      const player = makePlayer({ balance: 5, cargoCapacity: 20 });
      const item = makeItem({ quantity: 10, price: 10 });
      expect(getBulkBuyQuantity(player, item)).toBe(0);
    });
  });

  describe("getBulkSellQuantity", () => {
    it("returns held quantity of the commodity", () => {
      const player = makePlayer({ cargo: { grain: 7 } });
      const item = makeItem({ id: "grain" });
      expect(getBulkSellQuantity(player, item)).toBe(7);
    });

    it("returns zero when commodity is not held", () => {
      const player = makePlayer({ cargo: {} });
      const item = makeItem({ id: "grain" });
      expect(getBulkSellQuantity(player, item)).toBe(0);
    });
  });
});

const grain: MarketItem = {
  id: "grain",
  name: "Grain",
  basePrice: 7,
  baseQuantity: 18,
  mass: 1,
  price: 7,
  quantity: 18
};

function makeItem(overrides: Partial<MarketItem> = {}): MarketItem {
  return { ...grain, ...overrides };
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
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0],
    docked: false,
    legalRisk: 0,
    reputation: 0,
    missionCargoUnits: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    ...overrides
  };
}
