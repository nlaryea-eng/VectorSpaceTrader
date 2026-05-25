import { describe, expect, it } from "vitest";
import { getStationProfile, hasStationService } from "../src/game/StationServices";
import { generateUniverse } from "../src/game/Universe";

describe("StationServices", () => {
  it("generates deterministic service profiles", () => {
    const systemsA = generateUniverse(492017);
    const systemsB = generateUniverse(492017);

    expect(systemsA.map(getStationProfile)).toEqual(systemsB.map(getStationProfile));
  });

  it("guarantees starter station services", () => {
    const start = generateUniverse(492017)[0];
    const profile = getStationProfile(start);

    expect(profile.services.market).toBe(true);
    expect(profile.services.fuel).toBe(true);
    expect(profile.services.repair).toBe(true);
    expect(profile.services.missions).toBe(true);
    expect(profile.services.equipment).toBe(true);
    expect(profile.services.shipyard).toBe(true);
  });

  it("keeps fuel and basic repair available across stations", () => {
    const systems = generateUniverse(492017);

    expect(systems.every((system) => hasStationService(system, "fuel"))).toBe(true);
    expect(systems.every((system) => hasStationService(system, "repair"))).toBe(true);
  });

  it("places shipyards and advanced vendors in the expanded universe", () => {
    const systems = generateUniverse(492017);
    const profiles = systems.map(getStationProfile);

    expect(profiles.filter((profile) => profile.services.shipyard).length).toBeGreaterThanOrEqual(8);
    expect(profiles.filter((profile) => profile.services.advancedEquipment).length).toBeGreaterThanOrEqual(8);
  });

  it("keeps station market price modifiers derived and bounded", () => {
    const profiles = generateUniverse(492017).map(getStationProfile);

    expect(profiles.every((profile) => profile.marketPriceModifier >= 0.94)).toBe(true);
    expect(profiles.every((profile) => profile.marketPriceModifier <= 1.08)).toBe(true);
    expect(getStationProfile(generateUniverse(492017)[0]).marketPriceModifier).toBe(1);
  });
});
