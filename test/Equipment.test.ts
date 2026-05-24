import { describe, expect, it } from "vitest";
import { buyEquipment, getLaserProfile } from "../src/game/Equipment";
import type { PlayerState } from "../src/game/types";

describe("Equipment", () => {
  it("prevents equipment purchase without enough credits", () => {
    const result = buyEquipment(makePlayer({ credits: 1 }), "beamLaser");

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("Not enough credits");
  });

  it("cargo expansion increases capacity", () => {
    const result = buyEquipment(makePlayer({ credits: 1000 }), "cargoExpansion");

    expect(result.ok).toBe(true);
    expect(result.player.cargoCapacity).toBe(35);
  });

  it("beam laser changes laser damage and energy cost", () => {
    const result = buyEquipment(makePlayer({ credits: 1000 }), "beamLaser");
    const profile = getLaserProfile(result.player);

    expect(profile.label).toBe("Beam Laser");
    expect(profile.damage).toBeGreaterThan(28);
    expect(profile.energyCost).toBeGreaterThan(6);
  });
});

function makePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    hull: 100,
    maxHull: 100,
    shield: 100,
    maxShield: 100,
    energy: 100,
    credits: 1000,
    fuel: 7.5,
    cargo: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    docked: false,
    legalRisk: 0,
    reputation: 0,
    equipment: {
      pulseLaser: true,
      beamLaser: false,
      cargoExpansion: false,
      fuelScoop: false,
      shieldBooster: false
    },
    ...overrides
  };
}
