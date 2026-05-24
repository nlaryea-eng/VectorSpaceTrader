import { describe, expect, it } from "vitest";
import { buyEquipment, DEFAULT_EQUIPMENT, EQUIPMENT, getLaserProfile } from "../src/game/Equipment";
import { getPlayerShipStats } from "../src/game/Ships";
import type { PlayerState } from "../src/game/types";

describe("Equipment", () => {
  it("defines unique priced equipment with real descriptions for all 15 categories", () => {
    const ids = new Set(EQUIPMENT.map((item) => item.id));
    expect(ids.size).toBe(EQUIPMENT.length);
    expect(EQUIPMENT.length).toBeGreaterThanOrEqual(75);

    const categories = new Set(EQUIPMENT.map(item => item.category));
    expect(categories.size).toBe(15);

    for (const item of EQUIPMENT) {
      expect(item.price).toBeGreaterThan(0);
      expect(item.description.trim()).not.toBe("");
      expect(item.effect).toBeDefined();
    }
  });

  it("ensures each category has at least 5 items", () => {
    const categories: Record<string, number> = {};
    EQUIPMENT.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + 1;
    });
    Object.values(categories).forEach(count => {
      expect(count).toBeGreaterThanOrEqual(5);
    });
  });

  it("prevents equipment purchase without enough BAL", () => {
    const result = buyEquipment(makePlayer({ balance: 1 }), "beamLaser");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Not enough BAL");
  });

  it("cargo expansion increases capacity", () => {
    const result = buyEquipment(makePlayer({ balance: 1000, equipment: { ...DEFAULT_EQUIPMENT, cargoExpansion: false } }), "cargoExpansion");

    expect(result.ok).toBe(true);
    expect(result.player.cargoCapacity).toBe(35);
  });

  it("beam laser changes laser damage and energy cost", () => {
    const result = buyEquipment(makePlayer({ balance: 1000 }), "beamLaser");
    const profile = getLaserProfile(result.player);

    expect(profile.label).toBe("Beam Laser");
    expect(profile.damage).toBeGreaterThan(28);
    expect(profile.energyCost).toBeGreaterThan(6);
  });

  it("prevents duplicate equipment purchase", () => {
    const result = buyEquipment(makePlayer(), "pulseLaser");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Already installed");
  });

  it("applies new equipment effects to ship stats", () => {
    const player = makePlayer({
      equipment: {
        ...DEFAULT_EQUIPMENT,
        arcSpoolDrive: true,
        thriftBurnRegulator: true,
        foldedHoldGrid: true,
        quietShieldMatrix: true,
        fieldPatchDrones: true,
        alloyPlating: true
      }
    });
    const stats = getPlayerShipStats(player);

    expect(stats.maxJumpRange).toBeGreaterThan(24);
    expect(stats.fuelUseModifier).toBeLessThan(1);
    expect(stats.cargoCapacity).toBe(30);
    expect(stats.maxShield).toBe(120);
    expect(stats.maxHull).toBe(150); // 100 + 50 from alloyPlating
    expect(stats.repairCostModifier).toBeLessThan(1);
  });
});

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
    equipment: { ...DEFAULT_EQUIPMENT },
    ...overrides
  };
}
