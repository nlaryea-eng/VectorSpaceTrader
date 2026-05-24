import type { StarSystem, PlayerState } from "./types";
import { getJumpDistance, getFuelRequired } from "./Universe";
import { getPlayerShipStats } from "./Ships";

export interface RouteInfo {
  reachable: boolean;
  path: number[];
  requiredJumps: number;
  totalDistance: number;
}

export function findShortestRoute(
  origin: StarSystem,
  destination: StarSystem,
  systems: StarSystem[],
  player: Pick<PlayerState, "shipId" | "equipment">
): RouteInfo {
  const shipStats = getPlayerShipStats(player);
  const maxJumpRange = shipStats.maxJumpRange;
  const fuelCapacity = shipStats.fuelCapacity;

  // Dijkstra's algorithm
  const dists = new Map<number, number>();
  const prev = new Map<number, number>();
  const queue = new Set<number>();

  systems.forEach((s) => {
    dists.set(s.id, Infinity);
    queue.add(s.id);
  });

  dists.set(origin.id, 0);

  while (queue.size > 0) {
    let uId = -1;
    let minDist = Infinity;

    for (const id of queue) {
      const d = dists.get(id)!;
      if (d < minDist) {
        minDist = d;
        uId = id;
      }
    }

    if (uId === -1 || uId === destination.id) break;

    queue.delete(uId);
    const u = systems[uId];

    for (const vId of queue) {
      const v = systems[vId];
      const jumpDist = getJumpDistance(u, v);
      
      // We assume player can refuel at any station.
      // So we just check if a single jump is possible within fuel/range limits.
      if (jumpDist <= maxJumpRange && getFuelRequired(u, v, player) <= fuelCapacity) {
        const alt = dists.get(uId)! + jumpDist;
        if (alt < dists.get(vId)!) {
          dists.set(vId, alt);
          prev.set(vId, uId);
        }
      }
    }
  }

  const finalDist = dists.get(destination.id)!;
  if (finalDist === Infinity) {
    return { reachable: false, path: [], requiredJumps: 0, totalDistance: 0 };
  }

  const path: number[] = [];
  let curr: number | undefined = destination.id;
  while (curr !== undefined) {
    path.unshift(curr);
    curr = prev.get(curr);
  }

  return {
    reachable: true,
    path,
    requiredJumps: path.length - 1,
    totalDistance: finalDist
  };
}
