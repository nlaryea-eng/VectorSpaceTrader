import { getStationProfile } from "./StationServices";
import type { EconomyType, HazardTag, PlayerState, StarSystem, StationService } from "./types";

export type DiscoveryFilter = "all" | "discovered" | "undiscovered";

export interface MapFilterState {
  query: string;
  hazard: HazardTag | "all";
  economy: EconomyType | "all";
  discovery: DiscoveryFilter;
  service: StationService | "all";
}

export interface MapProjection {
  x: number;
  y: number;
}

export const DEFAULT_MAP_FILTERS: MapFilterState = {
  query: "",
  hazard: "all",
  economy: "all",
  discovery: "all",
  service: "all"
};

export function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

export function isSystemDiscovered(player: Pick<PlayerState, "currentSystemId" | "discoveredSystemIds">, systemId: number): boolean {
  return systemId === player.currentSystemId || player.discoveredSystemIds.includes(systemId);
}

export function matchesMapFilters(
  system: StarSystem,
  filters: MapFilterState,
  player: Pick<PlayerState, "currentSystemId" | "discoveredSystemIds">
): boolean {
  const query = normalizeQuery(filters.query);
  if (query && !system.name.toLowerCase().includes(query)) return false;
  if (filters.hazard !== "all" && system.hazardTag !== filters.hazard) return false;
  if (filters.economy !== "all" && system.economy !== filters.economy) return false;
  if (filters.service !== "all" && !getStationProfile(system).services[filters.service]) return false;

  if (filters.discovery !== "all") {
    const discovered = isSystemDiscovered(player, system.id);
    if (filters.discovery === "discovered" && !discovered) return false;
    if (filters.discovery === "undiscovered" && discovered) return false;
  }

  return true;
}

export function filterSystems(
  systems: StarSystem[],
  filters: MapFilterState,
  player: Pick<PlayerState, "currentSystemId" | "discoveredSystemIds">
): StarSystem[] {
  return systems.filter((system) => matchesMapFilters(system, filters, player));
}

export function hasActiveMapFilter(filters: MapFilterState): boolean {
  return (
    normalizeQuery(filters.query) !== "" ||
    filters.hazard !== "all" ||
    filters.economy !== "all" ||
    filters.discovery !== "all" ||
    filters.service !== "all"
  );
}

export function selectAdjacentFilteredSystem(
  systems: StarSystem[],
  selectedSystemId: number,
  direction: -1 | 1,
  filters: MapFilterState,
  player: Pick<PlayerState, "currentSystemId" | "discoveredSystemIds">
): number {
  const matches = filterSystems(systems, filters, player);
  const pool = matches.length > 0 ? matches : systems;
  const currentIndex = pool.findIndex((system) => system.id === selectedSystemId);
  if (currentIndex === -1) {
    return direction > 0 ? pool[0]?.id ?? selectedSystemId : pool[pool.length - 1]?.id ?? selectedSystemId;
  }
  return pool[(currentIndex + direction + pool.length) % pool.length].id;
}

export function projectSystemToMap(
  system: StarSystem,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
  universeWidth: number,
  universeHeight: number
): MapProjection {
  return {
    x: mapX + (system.x / universeWidth) * mapW,
    y: mapY + (system.y / universeHeight) * mapH
  };
}

export function getSystemAtProjectedMapPoint(
  systems: StarSystem[],
  clickX: number,
  clickY: number,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
  universeWidth: number,
  universeHeight: number,
  hitRadius = 8
): StarSystem | null {
  let closest: StarSystem | null = null;
  let minDist = hitRadius;

  for (const system of systems) {
    const point = projectSystemToMap(system, mapX, mapY, mapW, mapH, universeWidth, universeHeight);
    const dist = Math.hypot(clickX - point.x, clickY - point.y);
    if (dist < minDist) {
      minDist = dist;
      closest = system;
    }
  }

  return closest;
}
