import type { Mission, MissionType, PlayerState, StarSystem } from "./types";
import { getAvailableCargoCapacity } from "./Trading";
import { getJumpDistance } from "./Universe";

interface MissionTemplate {
  type: MissionType;
  title: string;
  briefing: (origin: StarSystem, destination: StarSystem) => string;
  baseReward: number;
  reputationChange: number;
  legalRiskChange: number;
  cargoUnitsRequired: number;
  deadlineJumps: number;
}

const TEMPLATES: MissionTemplate[] = [
  {
    type: "courier",
    title: "Sealed Courier Run",
    briefing: (origin, destination) => `Carry a sealed data wafer from ${origin.name} to ${destination.name}.`,
    baseReward: 120,
    reputationChange: 3,
    legalRiskChange: 0,
    cargoUnitsRequired: 1,
    deadlineJumps: 5
  },
  {
    type: "survey",
    title: "Quiet Survey Contract",
    briefing: (origin, destination) => `Map the outer beacon lanes near ${destination.name} for analysts on ${origin.name}.`,
    baseReward: 150,
    reputationChange: 4,
    legalRiskChange: 0,
    cargoUnitsRequired: 0,
    deadlineJumps: 7
  },
  {
    type: "rescue",
    title: "Medical Lift",
    briefing: (origin, destination) => `Move compact clinic supplies from ${origin.name} to a remote ward at ${destination.name}.`,
    baseReward: 180,
    reputationChange: 5,
    legalRiskChange: -1,
    cargoUnitsRequired: 3,
    deadlineJumps: 4
  },
  {
    type: "audit",
    title: "Harbor Audit",
    briefing: (origin, destination) => `Deliver a port audit packet from ${origin.name} to inspectors near ${destination.name}.`,
    baseReward: 140,
    reputationChange: 2,
    legalRiskChange: -2,
    cargoUnitsRequired: 1,
    deadlineJumps: 6
  },
  {
    type: "prototype",
    title: "Prototype Custody",
    briefing: (origin, destination) => `Transport a fragile machine core from ${origin.name} to a lab on ${destination.name}.`,
    baseReward: 260,
    reputationChange: 6,
    legalRiskChange: 2,
    cargoUnitsRequired: 2,
    deadlineJumps: 4
  },
  {
    type: "escort",
    title: "Beacon Escort",
    briefing: (origin, destination) => `Shadow a ${origin.economy.toLowerCase()} maintenance skiff through the corridor toward ${destination.name}.`,
    baseReward: 220,
    reputationChange: 5,
    legalRiskChange: 1,
    cargoUnitsRequired: 0,
    deadlineJumps: 6
  }
];

export function generateMissions(seed: number, current: StarSystem, systems: StarSystem[], player: PlayerState): Mission[] {
  const candidates = systems
    .filter((system) => system.id !== current.id)
    .sort((a, b) => getJumpDistance(current, a) - getJumpDistance(current, b));

  return TEMPLATES.map((template, index) => {
    const destination = candidates[(seed + current.id * 5 + index * 7) % candidates.length];
    const distance = getJumpDistance(current, destination);
    const riskBonus = Math.max(0, player.legalRisk) * 6;
    const reputationBonus = Math.max(0, player.reputation) * 2;
    const reward = Math.round(template.baseReward + distance * 9 + riskBonus + reputationBonus);

    return {
      id: `${current.id}-${destination.id}-${template.type}-${seed % 997}`,
      type: template.type,
      title: template.title,
      briefing: template.briefing(current, destination),
      originSystemId: current.id,
      destinationSystemId: destination.id,
      reward,
      reputationChange: template.reputationChange,
      legalRiskChange: template.legalRiskChange,
      cargoUnitsRequired: template.cargoUnitsRequired,
      deadlineJumps: template.deadlineJumps
    };
  });
}

export interface AcceptMissionResult {
  ok: boolean;
  reason?: string;
  player: PlayerState;
}

export function acceptMission(player: PlayerState, mission: Mission): AcceptMissionResult {
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
  return {
    ...player,
    reputation: Math.max(-10, player.reputation - 2),
    legalRisk: player.legalRisk + 1,
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
