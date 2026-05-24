import { describe, expect, it } from "vitest";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { buyCommodity, sellCommodity } from "../src/game/Trading";
import type { MarketItem, PlayerState } from "../src/game/types";

describe("Trading", () => {
  it("cannot buy beyond cargo capacity", () => {
    const player = makePlayer({ cargo: { grain: 20 }, cargoCapacity: 20 });
    const result = buyCommodity(player, grain, 1);

    expect(result.ok).toBe(false);
    expect(result.player).toEqual(player);
  });

  it("cannot buy without enough BAL", () => {
    const player = makePlayer({ balance: 2 });
    const result = buyCommodity(player, grain, 1);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Not enough BAL");
  });

  it("selling increases balance and decreases cargo", () => {
    const player = makePlayer({ balance: 50, cargo: { grain: 3 } });
    const result = sellCommodity(player, grain, 2);

    expect(result.ok).toBe(true);
    expect(result.player.balance).toBe(64);
    expect(result.player.cargo.grain).toBe(1);
  });
});

const grain: MarketItem = {
  id: "grain",
  name: "Grain",
  basePrice: 7,
  baseQuantity: 18,
  mass: 1,
  price: 7,
  quantity: 10
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
