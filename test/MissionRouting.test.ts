import { describe, expect, it } from "vitest";
import { findShortestRoute } from "../src/game/MissionRouting";
import { generateUniverse } from "../src/game/Universe";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import type { PlayerShipId } from "../src/game/types";

describe("Mission Routing", () => {
  it("finds a route between reachable systems", () => {
    const systems = generateUniverse(42);
    const origin = systems[0];
    const dest = systems[5];
    const player = { shipId: "mirelle" as PlayerShipId, equipment: DEFAULT_EQUIPMENT };

    const route = findShortestRoute(origin, dest, systems, player);
    expect(route.reachable).toBe(true);
    expect(route.path.length).toBeGreaterThanOrEqual(2);
    expect(route.requiredJumps).toBe(route.path.length - 1);
  });
});
