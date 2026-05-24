import type { EquipmentId, Mission, MissionType, PlayerState, StarSystem, StationService } from "./types";
import { getAvailableCargoCapacity } from "./Trading";
import { getJumpDistance } from "./Universe";
import type { StationProfile } from "./StationServices";

interface MissionTemplate {
  type: MissionType;
  typeLabel: string;
  title: string;
  cargoLabel: string;
  briefing: (origin: StarSystem, destination: StarSystem) => string;
  baseReward: number;
  reputationChange: number;
  legalRiskChange: number;
  failureReputationChange: number;
  failureLegalRiskChange: number;
  cargoUnitsRequired: number;
  deadlineJumps: number;
  riskLevel: number;
  requiredEquipment?: EquipmentId;
  minReputation?: number;
  requiredService?: StationService;
}

const TEMPLATES: MissionTemplate[] = [
  {
    type: "courier",
    typeLabel: "Courier",
    title: "Sealed Wafer Run",
    cargoLabel: "sealed wafer",
    briefing: (origin, destination) => `Carry a sealed wafer from ${origin.name} to ${destination.name}.`,
    baseReward: 130,
    reputationChange: 3,
    legalRiskChange: 0,
    failureReputationChange: -2,
    failureLegalRiskChange: 0,
    cargoUnitsRequired: 1,
    deadlineJumps: 5,
    riskLevel: 1
  },
  {
    type: "fragile",
    typeLabel: "Fragile",
    title: "Soft Crate Transfer",
    cargoLabel: "soft crates",
    briefing: (_origin, destination) => `Deliver shock-packed soft crates to ${destination.name}.`,
    baseReward: 210,
    reputationChange: 4,
    legalRiskChange: 0,
    failureReputationChange: -3,
    failureLegalRiskChange: 0,
    cargoUnitsRequired: 3,
    deadlineJumps: 5,
    riskLevel: 2
  },
  {
    type: "urgent",
    typeLabel: "Urgent",
    title: "Hot Clock Dispatch",
    cargoLabel: "dispatch case",
    briefing: (_origin, destination) => `Move a time-stamped dispatch case to ${destination.name}.`,
    baseReward: 260,
    reputationChange: 5,
    legalRiskChange: 0,
    failureReputationChange: -4,
    failureLegalRiskChange: 1,
    cargoUnitsRequired: 1,
    deadlineJumps: 3,
    riskLevel: 3
  },
  {
    type: "medical",
    typeLabel: "Relief",
    title: "Clinic Packet Lift",
    cargoLabel: "clinic packets",
    briefing: (_origin, destination) => `Deliver compact clinic packets to a port ward at ${destination.name}.`,
    baseReward: 230,
    reputationChange: 5,
    legalRiskChange: -1,
    failureReputationChange: -4,
    failureLegalRiskChange: 0,
    cargoUnitsRequired: 4,
    deadlineJumps: 4,
    riskLevel: 2
  },
  {
    type: "survey",
    typeLabel: "Survey",
    title: "Quiet Lane Scan",
    cargoLabel: "no cargo",
    briefing: (_origin, destination) => `Scan quiet lane markers around ${destination.name}.`,
    baseReward: 190,
    reputationChange: 4,
    legalRiskChange: 0,
    failureReputationChange: -2,
    failureLegalRiskChange: 0,
    cargoUnitsRequired: 0,
    deadlineJumps: 6,
    riskLevel: 2,
    requiredEquipment: "laneGlassScanner",
    requiredService: "survey"
  },
  {
    type: "passenger",
    typeLabel: "Passenger",
    title: "Cabin Seat Charter",
    cargoLabel: "cabin seat",
    briefing: (_origin, destination) => `Carry a single charter seat to ${destination.name}.`,
    baseReward: 280,
    reputationChange: 5,
    legalRiskChange: 0,
    failureReputationChange: -4,
    failureLegalRiskChange: 0,
    cargoUnitsRequired: 2,
    deadlineJumps: 5,
    riskLevel: 2,
    minReputation: 2
  },
  {
    type: "salvage",
    typeLabel: "Salvage",
    title: "Loose Panel Recovery",
    cargoLabel: "recovered panels",
    briefing: (_origin, destination) => `Recover marked panels from the approach track near ${destination.name}.`,
    baseReward: 300,
    reputationChange: 4,
    legalRiskChange: 1,
    failureReputationChange: -2,
    failureLegalRiskChange: 1,
    cargoUnitsRequired: 2,
    deadlineJumps: 6,
    riskLevel: 3,
    requiredEquipment: "salvageTongs",
    requiredService: "salvage"
  },
  {
    type: "supply",
    typeLabel: "Supply",
    title: "Berth Supply Run",
    cargoLabel: "berth stores",
    briefing: (origin, destination) => `Move berth stores from ${origin.name} to ${destination.name}.`,
    baseReward: 170,
    reputationChange: 3,
    legalRiskChange: 0,
    failureReputationChange: -2,
    failureLegalRiskChange: 0,
    cargoUnitsRequired: 5,
    deadlineJumps: 7,
    riskLevel: 1
  },
  {
    type: "restricted",
    typeLabel: "Restricted",
    title: "Sealed Hold Notice",
    cargoLabel: "sealed parcels",
    briefing: (_origin, destination) => `Carry sealed parcels to ${destination.name}; port records will be sparse.`,
    baseReward: 360,
    reputationChange: 3,
    legalRiskChange: 2,
    failureReputationChange: -3,
    failureLegalRiskChange: 2,
    cargoUnitsRequired: 2,
    deadlineJumps: 4,
    riskLevel: 4,
    requiredService: "restrictedContracts"
  },
  {
    type: "reputation",
    typeLabel: "Trusted",
    title: "Known-Hand Charter",
    cargoLabel: "charter parcel",
    briefing: (_origin, destination) => `Take a known-hand charter parcel to ${destination.name}.`,
    baseReward: 430,
    reputationChange: 6,
    legalRiskChange: -1,
    failureReputationChange: -5,
    failureLegalRiskChange: 1,
    cargoUnitsRequired: 1,
    deadlineJumps: 5,
    riskLevel: 3,
    minReputation: 6
  }
];

export function generateMissions(
  seed: number,
  current: StarSystem,
  systems: StarSystem[],
  player: PlayerState,
  station?: StationProfile
): Mission[] {
  if (station && !station.services.missions) return [];

  const candidates = systems
    .filter((system) => system.id !== current.id)
    .sort((a, b) => getJumpDistance(current, a) - getJumpDistance(current, b));

  const availableCargo = getAvailableCargoCapacity(player);
  const density = station?.missionDensity ?? 1;

  return TEMPLATES
    .filter((template) => !template.requiredService || station?.services[template.requiredService] || !station)
    .filter((template) => template.cargoUnitsRequired <= availableCargo || template.cargoUnitsRequired === 0)
    .slice(0, Math.max(6, Math.round(8 * density)))
    .map((template, index) => {
      const offset = Math.abs(seed + current.id * 5 + index * 7 + template.baseReward) % Math.max(1, candidates.length);
      const destination = candidates[offset] ?? candidates[0] ?? current;
      const distance = getJumpDistance(current, destination);
      const hazardBonus = destination.hazardLevel * 18 + template.riskLevel * 12;
      const riskBonus = Math.max(0, player.legalRisk) * 6;
      const reputationBonus = Math.max(0, player.reputation) * 2;
      const reward = Math.round(template.baseReward + distance * 9 + hazardBonus + riskBonus + reputationBonus);
      const riskLevel = Math.min(5, template.riskLevel + Math.floor(destination.hazardLevel / 3));

      return {
        id: `${current.id}-${destination.id}-${template.type}-${seed % 997}`,
        type: template.type,
        typeLabel: template.typeLabel,
        title: template.title,
        briefing: template.briefing(current, destination),
        originSystemId: current.id,
        destinationSystemId: destination.id,
        reward,
        reputationChange: template.reputationChange,
        legalRiskChange: template.legalRiskChange,
        failureReputationChange: template.failureReputationChange,
        failureLegalRiskChange: template.failureLegalRiskChange,
        cargoUnitsRequired: template.cargoUnitsRequired,
        cargoLabel: template.cargoLabel,
        deadlineJumps: template.deadlineJumps,
        riskLabel: getRiskLabel(riskLevel),
        riskLevel,
        requiredEquipment: template.requiredEquipment,
        minReputation: template.minReputation
      };
    });
}

export interface AcceptMissionResult {
  ok: boolean;
  reason?: string;
  player: PlayerState;
}

export function acceptMission(player: PlayerState, mission: Mission): AcceptMissionResult {
  if (mission.minReputation !== undefined && player.reputation < mission.minReputation) {
    return { ok: false, reason: `Need reputation ${mission.minReputation}`, player };
  }

  if (mission.requiredEquipment && !player.equipment[mission.requiredEquipment]) {
    return { ok: false, reason: `Requires ${formatEquipmentName(mission.requiredEquipment)}`, player };
  }

  const available = getAvailableCargoCapacity(player);
  if (mission.cargoUnitsRequired > 0 && available < mission.cargoUnitsRequired) {
    return {
      ok: false,
      reason: `Need ${mission.cargoUnitsRequired} free cargo unit${mission.cargoUnitsRequired !== 1 ? "s" : ""}`,
      player
    };
  }

  return {
    ok: true,
    player: {
      ...player,
      activeMissionId: mission.id,
      activeMission: mission,
      missionCargoUnits: mission.cargoUnitsRequired,
      legalRisk: Math.max(0, mission.legalRiskChange > 0 ? player.legalRisk + 1 : player.legalRisk)
    }
  };
}

export function completeMission(player: PlayerState, mission: Mission): PlayerState {
  return {
    ...player,
    credits: player.credits + mission.reward,
    reputation: player.reputation + mission.reputationChange,
    legalRisk: Math.max(0, player.legalRisk + mission.legalRiskChange),
    activeMissionId: undefined,
    activeMission: undefined,
    missionCargoUnits: 0
  };
}

export function failMission(player: PlayerState): PlayerState {
  const mission = player.activeMission;
  return {
    ...player,
    reputation: Math.max(-10, player.reputation + (mission?.failureReputationChange ?? -2)),
    legalRisk: Math.max(0, player.legalRisk + (mission?.failureLegalRiskChange ?? 1)),
    activeMissionId: undefined,
    activeMission: undefined,
    missionCargoUnits: 0
  };
}

export interface DeadlineResult {
  player: PlayerState;
  failed: boolean;
}

export function decrementMissionDeadline(player: PlayerState): DeadlineResult {
  const mission = player.activeMission;
  if (!mission || mission.deadlineJumps < 0) return { player, failed: false };

  const remaining = mission.deadlineJumps - 1;
  if (remaining <= 0) {
    return { player: failMission(player), failed: true };
  }

  const updatedMission: Mission = { ...mission, deadlineJumps: remaining };
  return {
    player: { ...player, activeMission: updatedMission },
    failed: false
  };
}

function getRiskLabel(riskLevel: number): string {
  if (riskLevel <= 1) return "low";
  if (riskLevel <= 2) return "standard";
  if (riskLevel <= 3) return "elevated";
  if (riskLevel <= 4) return "high";
  return "severe";
}

function formatEquipmentName(id: EquipmentId): string {
  return id.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}
