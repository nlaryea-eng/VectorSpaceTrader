import { type Mission, type MissionType, type PlayerState, type StarSystem, type EquipmentCategory } from "./types";
import { SeededPrng } from "./Universe";
import { findShortestRoute } from "./MissionRouting";
import { type MissionId, parseMissionId } from "./MissionIds";
import { getAvailableCargoCapacity } from "./Trading";

export interface MissionOfferContext {
  seed: number;
  origin: StarSystem;
  systems: StarSystem[];
  player: PlayerState;
}

const ARCHETYPES: MissionType[] = [
  "courier", "fragile", "urgent", "medical", "survey", "passenger", "salvage", "supply", "restricted", "reputation"
];

const TYPE_LABELS: Record<MissionType, string> = {
  courier: "Courier",
  fragile: "Fragile",
  urgent: "Urgent",
  medical: "Relief",
  survey: "Survey",
  passenger: "Passenger",
  salvage: "Salvage",
  supply: "Supply",
  restricted: "Restricted",
  reputation: "Trusted"
};

export function generateMissionOffer(
  id: MissionId,
  context: MissionOfferContext,
  _version = 4
): Mission | null {
  const { value } = parseMissionId(id);
  const prng = new SeededPrng(Number(value % BigInt(0x100000000)));

  const type = prng.pick(ARCHETYPES);
  const typeLabel = TYPE_LABELS[type];

  // Select destination
  const candidateDestinations = context.systems.filter(s => s.id !== context.origin.id);
  const destination = prng.pick(candidateDestinations);

  const route = findShortestRoute(context.origin, destination, context.systems, context.player);
  if (!route.reachable) return null;

  const cargoUnits = getRequiredCargo(type, prng);
  if (cargoUnits > getAvailableCargoCapacity(context.player) && cargoUnits > 0) return null;

  const baseReward = getBaseReward(type);
  const riskLevel = Math.min(5, getBaseRisk(type) + Math.floor(destination.hazardLevel / 3));
  
  const hazardBonus = destination.hazardLevel * 22 + riskLevel * 15;
  const distanceBonus = route.totalDistance * 12;
  const reputationBonus = Math.max(0, context.player.reputation) * 4;
  const reward = Math.round(baseReward + distanceBonus + hazardBonus + reputationBonus);

  const deadline = route.requiredJumps + getDeadlineBuffer(type, prng);

  const titles: Record<MissionType, string[]> = {
    courier: ["Data Wafer Lift", "Sealed Memo", "Small Packet", "Logic Chip Run"],
    fragile: ["Glassware Transfer", "Delicate Optics", "Pristine Sample", "Soft Crate Move"],
    urgent: ["Flash Dispatch", "Priority Memo", "Timed Delivery", "Rush Order"],
    medical: ["Clinic Supplies", "Organ Transport", "Vaccine Run", "Trauma Kit"],
    survey: ["Lanes Scan", "Beacon Check", "Marker Sync", "Area Survey"],
    passenger: ["Charter Seat", "Private Cabin", "Lane Commuter", "Pilot Cadet"],
    salvage: ["Wreck Scrap", "Lost Cargo", "Debris Probe", "Hull Salvage"],
    supply: ["Berth Stores", "Fuel Pack", "Station Parts", "Market Stock"],
    restricted: ["Grey Box", "Ghost Freight", "Quiet Load", "Private Seal"],
    reputation: ["Guild Parcel", "High-Hand Seal", "Council Cargo", "Special Trust"]
  };

  const title = prng.pick(titles[type]);
  const cargoLabel = getCargoLabel(type, prng);

  return {
    id,
    type,
    typeLabel,
    title,
    briefing: `Carry ${cargoLabel} from ${context.origin.name} to ${destination.name}. Shortest path: ${route.requiredJumps} jumps.`,
    originSystemId: context.origin.id,
    destinationSystemId: destination.id,
    reward,
    reputationChange: getRepChange(type),
    legalRiskChange: getRiskChange(type),
    failureReputationChange: -getRepChange(type) - 1,
    failureLegalRiskChange: Math.max(0, getRiskChange(type)),
    cargoUnitsRequired: cargoUnits,
    cargoLabel,
    deadlineJumps: deadline,
    riskLabel: getRiskLabel(riskLevel),
    riskLevel,
    requiredCategory: getRequiredCategory(type),
    minReputation: getMinRep(type)
  };
}

function getRequiredCargo(type: MissionType, prng: SeededPrng): number {
  switch (type) {
    case "courier": return 1;
    case "urgent": return 1;
    case "fragile": return prng.int(2, 6);
    case "medical": return prng.int(3, 8);
    case "passenger": return prng.int(1, 4);
    case "supply": return prng.int(6, 15);
    case "salvage": return prng.int(2, 5);
    case "restricted": return prng.int(1, 3);
    case "reputation": return prng.int(1, 5);
    default: return 0;
  }
}

function getBaseReward(type: MissionType): number {
  switch (type) {
    case "courier": return 120;
    case "urgent": return 280;
    case "fragile": return 240;
    case "medical": return 210;
    case "survey": return 190;
    case "passenger": return 320;
    case "salvage": return 350;
    case "supply": return 180;
    case "restricted": return 420;
    case "reputation": return 550;
  }
}

function getBaseRisk(type: MissionType): number {
  switch (type) {
    case "courier": return 1;
    case "urgent": return 3;
    case "restricted": return 4;
    case "salvage": return 3;
    default: return 2;
  }
}

function getDeadlineBuffer(type: MissionType, prng: SeededPrng): number {
  if (type === "urgent") return prng.int(1, 2);
  if (type === "supply") return prng.int(4, 8);
  return prng.int(3, 6);
}

function getRepChange(type: MissionType): number {
  switch (type) {
    case "reputation": return 8;
    case "medical": return 6;
    case "passenger": return 5;
    default: return 3;
  }
}

function getRiskChange(type: MissionType): number {
  if (type === "restricted") return 2;
  if (type === "salvage") return 1;
  if (type === "medical") return -1;
  return 0;
}

function getMinRep(type: MissionType): number | undefined {
  if (type === "reputation") return 8;
  if (type === "passenger") return 3;
  return undefined;
}

function getRequiredCategory(type: MissionType): EquipmentCategory | undefined {
  if (type === "survey") return "survey";
  if (type === "salvage") return "salvage";
  return undefined;
}

function getCargoLabel(type: MissionType, prng: SeededPrng): string {
  const labels: Record<MissionType, string[]> = {
    courier: ["data wafer", "memo chip", "small packet"],
    fragile: ["soft crates", "pristine optics", "bio samples"],
    urgent: ["flash dispatch", "time-sensitive case", "urgent meds"],
    medical: ["clinic packets", "emergency vials", "med-gear"],
    survey: ["lane data", "beacon logs", "sector scans"],
    passenger: ["charter seat", "cabin bunk", "guest pass"],
    salvage: ["wreck panels", "scavenged cores", "scrap pods"],
    supply: ["berth stores", "food packs", "common alloys"],
    restricted: ["sealed hold", "ghost cargo", "blind-auth box"],
    reputation: ["trusted hand", "council seal", "guild freight"]
  };
  return prng.pick(labels[type]);
}

function getRiskLabel(riskLevel: number): string {
  if (riskLevel <= 1) return "low";
  if (riskLevel <= 2) return "standard";
  if (riskLevel <= 3) return "elevated";
  if (riskLevel <= 4) return "high";
  return "severe";
}
