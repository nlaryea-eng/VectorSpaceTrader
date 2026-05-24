import type { SystemClassDefinition, SystemClassId, WorldProfile, EconomyType } from "./types";
import { SeededPrng } from "./Universe";

export const WORLD_CLASSES: Record<SystemClassId, SystemClassDefinition> = {
  cradle: { id: "cradle", displayName: "Cradle", shortLabel: "CRD", description: "A densely populated homeworld.", tradeBias: 1.1, missionBias: 1.2, serviceBias: 1.2, hazardBias: 0.8, discoveryNoteStyle: "historical", mapHint: "Core population center" },
  forge: { id: "forge", displayName: "Forge", shortLabel: "FRG", description: "Heavy industrial processing.", tradeBias: 1.2, missionBias: 1.0, serviceBias: 1.1, hazardBias: 1.1, discoveryNoteStyle: "industrial", mapHint: "High material output" },
  archive: { id: "archive", displayName: "Archive", shortLabel: "ARC", description: "Data and historical repositories.", tradeBias: 0.9, missionBias: 1.1, serviceBias: 0.9, hazardBias: 0.8, discoveryNoteStyle: "data", mapHint: "Information hub" },
  garden: { id: "garden", displayName: "Garden", shortLabel: "GRD", description: "Bountiful agricultural yields.", tradeBias: 1.0, missionBias: 0.9, serviceBias: 0.9, hazardBias: 0.7, discoveryNoteStyle: "ecological", mapHint: "Food production" },
  drift: { id: "drift", displayName: "Drift", shortLabel: "DFT", description: "Scattered, loosely connected settlements.", tradeBias: 0.8, missionBias: 1.1, serviceBias: 0.8, hazardBias: 1.2, discoveryNoteStyle: "nomadic", mapHint: "Scattered settlements" },
  relay: { id: "relay", displayName: "Relay", shortLabel: "RLY", description: "Key navigation and communication node.", tradeBias: 1.1, missionBias: 1.2, serviceBias: 1.0, hazardBias: 0.9, discoveryNoteStyle: "navigational", mapHint: "Traffic junction" },
  bastion: { id: "bastion", displayName: "Bastion", shortLabel: "BST", description: "Heavily fortified security zone.", tradeBias: 0.9, missionBias: 1.1, serviceBias: 1.1, hazardBias: 1.3, discoveryNoteStyle: "military", mapHint: "Secure sector" },
  quarry: { id: "quarry", displayName: "Quarry", shortLabel: "QRY", description: "Resource extraction operations.", tradeBias: 1.2, missionBias: 0.9, serviceBias: 1.0, hazardBias: 1.2, discoveryNoteStyle: "geological", mapHint: "Raw material source" },
  veil: { id: "veil", displayName: "Veil", shortLabel: "VEL", description: "Obscured by natural or artificial phenomena.", tradeBias: 0.9, missionBias: 1.2, serviceBias: 0.8, hazardBias: 1.4, discoveryNoteStyle: "mysterious", mapHint: "Low visibility" },
  harbor: { id: "harbor", displayName: "Harbor", shortLabel: "HRB", description: "Deep space trade and logistics hub.", tradeBias: 1.3, missionBias: 1.0, serviceBias: 1.2, hazardBias: 0.9, discoveryNoteStyle: "commercial", mapHint: "Trade crossroads" },
  clinic: { id: "clinic", displayName: "Clinic", shortLabel: "CLN", description: "Medical and biological research center.", tradeBias: 1.0, missionBias: 1.1, serviceBias: 1.0, hazardBias: 0.8, discoveryNoteStyle: "medical", mapHint: "Medical services" },
  observatory: { id: "observatory", displayName: "Observatory", shortLabel: "OBS", description: "Deep space sensor and survey array.", tradeBias: 0.9, missionBias: 1.2, serviceBias: 0.9, hazardBias: 0.9, discoveryNoteStyle: "scientific", mapHint: "Survey center" },
  freehold: { id: "freehold", displayName: "Freehold", shortLabel: "FHD", description: "Independent, unregulated territory.", tradeBias: 1.1, missionBias: 1.1, serviceBias: 0.9, hazardBias: 1.3, discoveryNoteStyle: "independent", mapHint: "Unregulated zone" },
  crucible: { id: "crucible", displayName: "Crucible", shortLabel: "CRC", description: "Harsh environment, resilient inhabitants.", tradeBias: 1.0, missionBias: 1.2, serviceBias: 0.8, hazardBias: 1.5, discoveryNoteStyle: "extreme", mapHint: "Harsh conditions" },
  reserve: { id: "reserve", displayName: "Reserve", shortLabel: "RSV", description: "Protected or restricted area.", tradeBias: 0.8, missionBias: 0.9, serviceBias: 1.0, hazardBias: 1.0, discoveryNoteStyle: "restricted", mapHint: "Restricted access" }
};

export const WORLD_CLASS_IDS = Object.keys(WORLD_CLASSES) as SystemClassId[];

const TRADE_HINTS = ["Active exchange", "Quiet market", "High volume", "Specialized goods", "Fluctuating prices", "Steady flow"];
const SERVICE_HINTS = ["Extensive repair yards", "Basic provisions", "Contract boards active", "Fuel depots available", "Restricted docks", "Open market services"];
const MISSION_HINTS = ["Frequent postings", "High-risk offers", "Routine hauls", "Survey data needed", "Urgent couriers", "Local disputes"];
const TRAVEL_CAUTIONS = ["Clear lanes", "Heavy traffic", "Debris fields nearby", "Patrols active", "Pirate warnings", "Unstable signals"];
const DISCOVERY_NOTES = ["Early settlement", "Recent expansion", "Strategic outpost", "Historic site", "Isolated colony", "Deep survey marker"];
const LOCAL_DESCRIPTORS = ["bustling", "quiet", "industrialized", "militarized", "scenic", "barren", "wealthy", "impoverished"];

export function generateWorldProfile(seed: number, id: number, economy: EconomyType, techLevel: number): WorldProfile {
  const prng = new SeededPrng((seed + id * 881 + techLevel * 31) >>> 0);
  
  let classId: SystemClassId;
  
  if (economy === "Agricultural") classId = prng.pick(["garden", "cradle", "freehold"]);
  else if (economy === "Industrial") classId = prng.pick(["forge", "harbor", "quarry"]);
  else if (economy === "Research") classId = prng.pick(["archive", "clinic", "observatory"]);
  else if (economy === "Mining") classId = prng.pick(["quarry", "crucible", "drift"]);
  else if (economy === "Periphery") classId = prng.pick(["drift", "veil", "reserve"]);
  else if (economy === "Trade Hub") classId = prng.pick(["harbor", "relay", "cradle"]);
  else classId = prng.pick(WORLD_CLASS_IDS);

  const localDescriptor = prng.pick(LOCAL_DESCRIPTORS);
  const tradeHint = prng.pick(TRADE_HINTS);
  const serviceHint = prng.pick(SERVICE_HINTS);
  const missionHint = prng.pick(MISSION_HINTS);
  const travelCaution = prng.pick(TRAVEL_CAUTIONS);
  const discoveryNote = prng.pick(DISCOVERY_NOTES);
  const knownFor = prng.next() > 0.5 ? `${prng.pick(["Rare", "Common", "Unique"])} ${prng.pick(["alloys", "technologies", "artifacts"])}` : undefined;

  return {
    classId,
    localDescriptor,
    tradeHint,
    serviceHint,
    missionHint,
    travelCaution,
    discoveryNote,
    knownFor
  };
}
