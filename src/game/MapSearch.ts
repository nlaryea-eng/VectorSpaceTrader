import { getStationProfile } from "./StationServices";
import { WORLD_CLASS_IDS } from "./WorldClasses";
import type { EconomyType, GovernmentType, HazardTag, OpportunityTag, PlayerState, StarSystem, StationService, SystemClassId } from "./types";

export type DiscoveryFilter = "all" | "discovered" | "undiscovered";

export interface MapFilterState {
  query: string;
  hazard: HazardTag | "all";
  economy: EconomyType | "all";
  government: GovernmentType | "all";
  opportunity: OpportunityTag | "all";
  discovery: DiscoveryFilter;
  service: StationService | "all";
  systemClass: SystemClassId | "all";
}

export interface MapProjection {
  x: number;
  y: number;
}

export interface MapSystemVisualState {
  matched: boolean;
  protected: boolean;
  dimmed: boolean;
}

export const DEFAULT_MAP_FILTERS: MapFilterState = {
  query: "",
  hazard: "all",
  economy: "all",
  government: "all",
  opportunity: "all",
  discovery: "all",
  service: "all",
  systemClass: "all"
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
  if (filters.government !== "all" && system.government !== filters.government) return false;
  if (filters.opportunity !== "all" && system.opportunityTag !== filters.opportunity) return false;
  if (filters.systemClass !== "all" && system.profile.classId !== filters.systemClass) return false;
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
    filters.government !== "all" ||
    filters.opportunity !== "all" ||
    filters.discovery !== "all" ||
    filters.service !== "all" ||
    filters.systemClass !== "all"
  );
}

export function cycleMapFilterState(filters: MapFilterState, zoneId: string): MapFilterState {
  if (zoneId === "map-filter-clear") return { ...DEFAULT_MAP_FILTERS };

  if (zoneId === "map-filter-hazard") {
    const values: MapFilterState["hazard"][] = ["all", "calm", "ionWeather", "debris", "patrolGap", "signalNoise", "raiderTrace"];
    return { ...filters, hazard: nextValue(values, filters.hazard) };
  }

  if (zoneId === "map-filter-economy") {
    const values: MapFilterState["economy"][] = ["all", "Agricultural", "Industrial", "Research", "Mining", "Periphery", "Trade Hub"];
    return { ...filters, economy: nextValue(values, filters.economy) };
  }

  if (zoneId === "map-filter-government") {
    const values: MapFilterState["government"][] = ["all", "Cooperative", "Council", "Syndicate", "Corporate", "Collective", "Independent"];
    return { ...filters, government: nextValue(values, filters.government) };
  }

  if (zoneId === "map-filter-opportunity") {
    const values: MapFilterState["opportunity"][] = ["all", "steadyDemand", "shortHaul", "surveyData", "repairQueue", "contractFlow", "salvageTrace"];
    return { ...filters, opportunity: nextValue(values, filters.opportunity) };
  }

  if (zoneId === "map-filter-discovery") {
    const values: MapFilterState["discovery"][] = ["all", "discovered", "undiscovered"];
    return { ...filters, discovery: nextValue(values, filters.discovery) };
  }

  if (zoneId === "map-filter-service") {
    const values: MapFilterState["service"][] = ["all", "shipyard", "equipment", "advancedEquipment", "missions", "survey", "salvage", "restrictedContracts"];
    return { ...filters, service: nextValue(values, filters.service) };
  }

  if (zoneId === "map-filter-systemClass") {
    const values: MapFilterState["systemClass"][] = ["all", ...WORLD_CLASS_IDS];
    return { ...filters, systemClass: nextValue(values, filters.systemClass) };
  }

  return filters;
}

export function getMapSystemVisualState(
  system: StarSystem,
  filters: MapFilterState,
  player: Pick<PlayerState, "currentSystemId" | "discoveredSystemIds">,
  selectedSystemId: number
): MapSystemVisualState {
  const matched = matchesMapFilters(system, filters, player);
  const protectedSystem = system.id === player.currentSystemId || system.id === selectedSystemId;
  return {
    matched,
    protected: protectedSystem,
    dimmed: hasActiveMapFilter(filters) && !matched && !protectedSystem
  };
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
  player: Pick<PlayerState, "currentSystemId" | "discoveredSystemIds" | "fuel" | "shipId" | "equipment">,
  filters: MapFilterState,
  hitRadius = 12
): StarSystem | null {
  let closest: StarSystem | null = null;
  let minDist = hitRadius;

  const current = systems.find(s => s.id === player.currentSystemId);

  for (const system of systems) {
    const point = projectSystemToMap(system, mapX, mapY, mapW, mapH, universeWidth, universeHeight);
    const dist = Math.hypot(clickX - point.x, clickY - point.y);

    if (dist < hitRadius) {
      // Tie-breaking: if distances are close, prefer matched/discovered/in-range
      let effectiveDist = dist;

      const discovered = isSystemDiscovered(player, system.id);
      const matched = matchesMapFilters(system, filters, player);
      const inRange = current ? canJump(current, system, player.fuel, player) : false;

      if (matched) effectiveDist -= 2;
      if (discovered) effectiveDist -= 1;
      if (inRange) effectiveDist -= 1;

      if (effectiveDist < minDist) {
        minDist = effectiveDist;
        closest = system;
      }
    }
  }

  return closest;
}

// Re-export canJump for hit testing
import { canJump } from "./Universe";

function nextValue<T>(values: T[], current: T): T {
  const index = values.findIndex((value) => value === current);
  return values[(index + 1 + values.length) % values.length];
}
