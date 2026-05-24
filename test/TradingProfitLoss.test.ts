import { describe, expect, it } from "vitest";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { buyCommodity, sellCommodity } from "../src/game/Trading";
import type { MarketItem, PlayerState } from "../src/game/types";

describe("Trading Profit/Loss", () => {
  it("updates cost basis when buying", () => {
    let player = makePlayer({ balance: 1000, cargo: {}, cargoCostBasis: {} });

    // Buy 10 at 10 BAL
    player = buyCommodity(player, { ...grain, price: 10 }, 10).player;
    expect(player.cargo.grain).toBe(10);
    expect(player.cargoCostBasis.grain).toBe(10);

    // Buy 10 more at 20 BAL
    player = buyCommodity(player, { ...grain, price: 20 }, 10).player;
    expect(player.cargo.grain).toBe(20);
    // Weighted average: (10*10 + 10*20) / 20 = 15
    expect(player.cargoCostBasis.grain).toBe(15);
  });

  it("preserves cost basis when selling partially", () => {
    let player = makePlayer({ balance: 1000, cargo: { grain: 20 }, cargoCostBasis: { grain: 15 } });

    // Sell 10 at 25 BAL
    player = sellCommodity(player, { ...grain, price: 25 }, 10).player;
    expect(player.cargo.grain).toBe(10);
    expect(player.cargoCostBasis.grain).toBe(15);
  });

  it("clears cost basis when selling fully", () => {
    let player = makePlayer({ balance: 1000, cargo: { grain: 10 }, cargoCostBasis: { grain: 15 } });

    // Sell all 10
    player = sellCommodity(player, { ...grain, price: 25 }, 10).player;
    expect(player.cargo.grain).toBeUndefined();
    expect(player.cargoCostBasis.grain).toBeUndefined();
  });

  it("handles buying additional units with zero initial basis (migration case)", () => {
    let player = makePlayer({ balance: 1000, cargo: { grain: 10 }, cargoCostBasis: {} });

    // Buy 10 more at 20 BAL
    player = buyCommodity(player, { ...grain, price: 20 }, 10).player;
    expect(player.cargo.grain).toBe(20);
    // (10*0 + 10*20) / 20 = 10
    expect(player.cargoCostBasis.grain).toBe(10);
  });
});

const grain: MarketItem = {
  id: "grain",
  name: "Grain",
  basePrice: 7,
  baseQuantity: 18,
  mass: 1,
  price: 7,
  quantity: 100
};

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  const player: PlayerState = {
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
    balance: 100,
    fuel: 7.5,
    cargo: {},
    cargoCostBasis: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0],
    docked: false,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT }
  };
  return { ...player, ...overrides };
}
