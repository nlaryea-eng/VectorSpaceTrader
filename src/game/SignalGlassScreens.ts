import { EQUIPMENT, isEquipmentAvailableAtStation, type EquipmentDefinition } from "./Equipment";
import { acceptMission } from "./Missions";
import { getPlayerShipStats, PLAYER_SHIPS } from "./Ships";
import { getStationProfile, type StationProfile } from "./StationServices";
import { getAvailableCargoCapacity, getTotalOccupiedCargo } from "./Trading";
import { canJump, getFuelRequired, getJumpDistance } from "./Universe";
import type { MarketItem, Mission, PlayerShipId, PlayerState, StarSystem } from "./types";

export type StationRecommendationKind = "deliver" | "repair" | "sell" | "missions";

export interface StationRecommendation {
  kind: StationRecommendationKind;
  title: string;
  detail: string;
  actionId: "touch-missions" | "touch-equipment" | "touch-trade";
}

export interface ServiceTile {
  id: "touch-trade" | "touch-missions" | "touch-shipyard" | "touch-equipment";
  label: string;
  shortLabel: string;
  available: boolean;
  why: string;
}

export interface DeltaBadge {
  text: string;
  tone: "success" | "danger" | "neutral";
  total: number;
  percent: number;
}

export interface MissionCardState {
  state: "acceptable" | "warning" | "locked" | "conflict";
  label: string;
  reason: string;
  slackLabel: string;
}

export interface RouteValidity {
  state: "valid" | "warning" | "outOfRange" | "restricted";
  label: string;
  reason: string;
  distance: number;
  fuelRequired: number;
}

export interface EquipmentSections {
  installed: EquipmentDefinition[];
  available: EquipmentDefinition[];
  unavailable: EquipmentDefinition[];
}

export interface ShipComparisonRow {
  label: string;
  current: number;
  selected: number;
  delta: number;
}

export interface ShipComparisonSummary {
  rows: ShipComparisonRow[];
  cargoOverflow: number;
  affordabilityLabel: string;
}

export function getStationRecommendation(
  player: PlayerState,
  system: StarSystem,
  market: readonly MarketItem[],
  repairCost: number
): StationRecommendation {
  const active = player.activeMission;
  if (active && active.destinationSystemId === player.currentSystemId) {
    return {
      kind: "deliver",
      title: "Deliver active mission",
      detail: `${active.title} is ready for completion at ${system.name}.`,
      actionId: "touch-missions"
    };
  }

  if (player.hull / player.maxHull < 0.7) {
    return {
      kind: "repair",
      title: "Repair in Equipment",
      detail: repairCost > 0 ? `Equipment bay repair: ${repairCost} BAL to restore integrity.` : "Hull service is handled in Equipment.",
      actionId: "touch-equipment"
    };
  }

  const profitable = getBestProfitableCargo(player, market);
  if (profitable) {
    return {
      kind: "sell",
      title: "Sell high-margin cargo",
      detail: `${profitable.item.name}: ${formatDeltaBadge(profitable.held, profitable.basis, profitable.item.price).text}.`,
      actionId: "touch-trade"
    };
  }

  return {
    kind: "missions",
    title: "Browse mission board",
    detail: "Look for route-validated contracts before the next launch.",
    actionId: "touch-missions"
  };
}

export function getStationServiceTiles(system: StarSystem): ServiceTile[] {
  const profile = getStationProfile(system);
  return [
    { id: "touch-trade", label: "Trade Market", shortLabel: "MARKET", available: profile.services.market, why: serviceWhy(profile, "market") },
    { id: "touch-missions", label: "Mission Board", shortLabel: "MISSIONS", available: profile.services.missions, why: serviceWhy(profile, "missions") },
    { id: "touch-shipyard", label: "Shipyard", shortLabel: "SHIPYARD", available: profile.services.shipyard, why: serviceWhy(profile, "shipyard") },
    {
      id: "touch-equipment",
      label: "Equipment & Hull Repair",
      shortLabel: "EQUIPMENT",
      available: profile.services.equipment || profile.services.repair,
      why: profile.services.equipment ? serviceWhy(profile, "equipment") : "Hull repair available; equipment vendor offline."
    }
  ];
}

export function formatDeltaBadge(held: number, basis: number | undefined, localPrice: number): DeltaBadge {
  if (held <= 0 || !basis) return { text: "No basis", tone: "neutral", total: 0, percent: 0 };
  const total = Math.round((localPrice - basis) * held);
  const percent = basis > 0 ? ((localPrice - basis) / basis) * 100 : 0;
  const sign = total > 0 ? "+" : total < 0 ? "-" : "";
  const absTotal = Math.abs(total);
  const absPercent = Math.abs(percent);
  const tone = total > 0 ? "success" : total < 0 ? "danger" : "neutral";
  return {
    text: `${sign}${absTotal} BAL / ${sign}${absPercent.toFixed(1)}%`,
    tone,
    total,
    percent
  };
}

export function getMissionCardState(player: PlayerState, mission: Mission): MissionCardState {
  const slackLabel = mission.deadlineJumps >= 0 ? `${mission.deadlineJumps} jumps` : "Open";
  if (player.activeMission) {
    return { state: "conflict", label: "Active mission conflict", reason: "Complete the pinned mission first.", slackLabel };
  }

  const accepted = acceptMission(player, mission);
  if (!accepted.ok) {
    return { state: "locked", label: "Locked by requirements", reason: accepted.reason ?? "Requirements not met.", slackLabel };
  }

  const cargoFree = getAvailableCargoCapacity(player);
  if (mission.cargoUnitsRequired > cargoFree * 0.75 || (mission.deadlineJumps >= 0 && mission.deadlineJumps <= 1)) {
    return { state: "warning", label: "Acceptable with warning", reason: "Cargo or timing is tight.", slackLabel };
  }

  return { state: "acceptable", label: "Acceptable", reason: "All requirements pass.", slackLabel };
}

export function getRouteValidity(current: StarSystem, selected: StarSystem, player: PlayerState): RouteValidity {
  const distance = getJumpDistance(current, selected);
  const fuelRequired = getFuelRequired(current, selected, player);
  const shipStats = getPlayerShipStats(player);
  if (selected.id === current.id) {
    return { state: "warning", label: "Current system", reason: "Already in this system.", distance, fuelRequired };
  }
  if (distance > shipStats.maxJumpRange) {
    return { state: "outOfRange", label: "Out of range", reason: "Selected system exceeds current jump range.", distance, fuelRequired };
  }
  if (!canJump(current, selected, player.fuel, player)) {
    return { state: "outOfRange", label: "Fuel blocked", reason: "Insufficient fuel for this jump.", distance, fuelRequired };
  }
  const fuelAfter = player.fuel - fuelRequired;
  if (fuelAfter < fuelRequired) {
    return { state: "warning", label: "Valid with warning", reason: "Return fuel is limited after arrival.", distance, fuelRequired };
  }
  return { state: "valid", label: "Valid route", reason: "Range and fuel requirements pass.", distance, fuelRequired };
}

export function classifyEquipment(player: PlayerState, station: StationProfile): EquipmentSections {
  return EQUIPMENT.reduce<EquipmentSections>((sections, item) => {
    if (player.equipment[item.id]) sections.installed.push(item);
    else if (isEquipmentAvailableAtStation(item, station)) sections.available.push(item);
    else sections.unavailable.push(item);
    return sections;
  }, { installed: [], available: [], unavailable: [] });
}

export function getEquipmentAffordability(player: PlayerState, item: EquipmentDefinition): string {
  if (player.equipment[item.id]) return "Installed";
  if (player.balance >= item.price) return `${item.price} BAL`;
  return `Short by ${item.price - Math.floor(player.balance)} BAL`;
}

export function getShipComparison(player: PlayerState, selectedShipId: PlayerShipId): ShipComparisonSummary {
  const current = getPlayerShipStats(player);
  const selected = getPlayerShipStats({ ...player, shipId: selectedShipId });
  const selectedShip = PLAYER_SHIPS.find((ship) => ship.id === selectedShipId);
  const cargoUsed = getTotalOccupiedCargo(player);
  const price = selectedShip?.price ?? 0;
  return {
    rows: [
      row("Hull", current.maxHull, selected.maxHull),
      row("Shield", current.maxShield, selected.maxShield),
      row("Range", current.maxJumpRange, selected.maxJumpRange),
      row("Cargo", current.cargoCapacity, selected.cargoCapacity),
      row("Handling", current.handlingModifier, selected.handlingModifier)
    ],
    cargoOverflow: Math.max(0, cargoUsed - selected.cargoCapacity),
    affordabilityLabel: player.balance >= price ? `${price} BAL` : `Short by ${price - Math.floor(player.balance)} BAL`
  };
}

function row(label: string, current: number, selected: number): ShipComparisonRow {
  return { label, current, selected, delta: Number((selected - current).toFixed(2)) };
}

function serviceWhy(profile: StationProfile, service: keyof StationProfile["services"]): string {
  return profile.services[service] ? `${profile.label} provides this service.` : `Unavailable at ${profile.label}.`;
}

function getBestProfitableCargo(player: PlayerState, market: readonly MarketItem[]): { item: MarketItem; held: number; basis: number } | null {
  let best: { item: MarketItem; held: number; basis: number; total: number } | null = null;
  for (const item of market) {
    const held = player.cargo[item.id] ?? 0;
    const basis = player.cargoCostBasis[item.id];
    if (held <= 0 || !basis) continue;
    const total = (item.price - basis) * held;
    if (total < 50) continue;
    if (!best || total > best.total) best = { item, held, basis, total };
  }
  return best;
}
