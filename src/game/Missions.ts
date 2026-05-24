import type { Mission, PlayerState, StarSystem } from "./types";
import { getAvailableCargoCapacity } from "./Trading";
import { canJump } from "./Universe";
import type { StationProfile } from "./StationServices";
import { createMissionId } from "./MissionIds";
import { generateMissionOffer } from "./MissionGenerator";

const MISSION_VERSION = 4;
const BOARD_SIZE_MIN = 6;
const BOARD_SIZE_MAX = 12;
const MAX_CANDIDATES = 40;

import { EQUIPMENT } from "./Equipment";

export function generateMissions(
  universeSeed: number,
  current: StarSystem,
  systems: StarSystem[],
  player: PlayerState,
  station?: StationProfile
): Mission[] {
  if (station && !station.services.missions) return [];

  const density = station?.missionDensity ?? 1;
  const targetCount = Math.max(BOARD_SIZE_MIN, Math.min(BOARD_SIZE_MAX, Math.round(8 * density)));

  // Deterministic board seed
  const boardSeed = BigInt(universeSeed) + BigInt(current.id) * BigInt(1000) + BigInt(MISSION_VERSION) * BigInt(1000000);

  const offers: Mission[] = [];
  let candidateIndex = 0;

  while (offers.length < targetCount && candidateIndex < MAX_CANDIDATES) {
    const missionValue = boardSeed + BigInt(candidateIndex);
    const missionId = createMissionId(MISSION_VERSION, missionValue);

    const offer = generateMissionOffer(missionId, {
      seed: universeSeed,
      origin: current,
      systems,
      player
    }, MISSION_VERSION);

    if (offer) {
      const requirementsMet = (!offer.requiredEquipment || player.equipment[offer.requiredEquipment]) &&
                             (!offer.requiredCategory || hasEquipmentInCategory(player, offer.requiredCategory));
      const reputationMet = offer.minReputation === undefined || player.reputation >= offer.minReputation;

      // For starter station, initially only accept 1-jump missions until we have at least 3
      const starterConstraint = current.id === 0 && offers.length < 3
        ? canJump(current, systems[offer.destinationSystemId], player.fuel, player)
        : true;

      if (requirementsMet && reputationMet && starterConstraint) {
        offers.push(offer);
      }
    }
    candidateIndex++;
  }

  // Starter station fallback if too few offers
  if (current.id === 0 && offers.length < 3) {
    // Specifically target nearby systems for guaranteed reachable missions
    const nearby = systems
      .filter(s => s.id !== current.id && canJump(current, s, player.fuel, player))
      .sort((a, b) => {
        const distA = Math.hypot(a.x - current.x, a.y - current.y);
        const distB = Math.hypot(b.x - current.x, b.y - current.y);
        return distA - distB;
      })
      .slice(0, 10);

    for (let i = 0; i < 3 - offers.length; i++) {
        const target = nearby[i % nearby.length] ?? systems[1]; // Fallback to system 1 if nothing in range
        const fallbackValue = boardSeed + BigInt(2000 + i);
        const fallbackId = createMissionId(MISSION_VERSION, fallbackValue);

        // We use a custom generator context for fallback to force the destination
        const offer = generateMissionOffer(fallbackId, {
            seed: universeSeed,
            origin: current,
            systems: systems.map(s => s.id === target.id ? target : s), // Ensure target is in there
            player
        }, MISSION_VERSION);

        // If even fallback fails (e.g. cargo), try a very basic courier mission
        if (offer && canJump(current, systems[offer.destinationSystemId], player.fuel, player)) {
            offers.push(offer);
        } else {
             // Hard-coded starter safe mission if all else fails
             offers.push({
                 id: fallbackId,
                 type: "courier",
                 typeLabel: "Courier",
                 title: "Priority Wafer",
                 briefing: `Carry a data wafer to ${target.name}.`,
                 originSystemId: current.id,
                 destinationSystemId: target.id,
                 reward: 150,
                 reputationChange: 2,
                 legalRiskChange: 0,
                 failureReputationChange: -2,
                 failureLegalRiskChange: 1,
                 cargoUnitsRequired: 1,
                 cargoLabel: "data wafer",
                 deadlineJumps: 10,
                 riskLabel: "low",
                 riskLevel: 1
             });
        }
    }
  }

  return offers;
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

  if (mission.requiredCategory && !hasEquipmentInCategory(player, mission.requiredCategory)) {
    return { ok: false, reason: `Requires ${mission.requiredCategory} equipment`, player };
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
      activeMission: mission, // Snapshot
      missionCargoUnits: mission.cargoUnitsRequired,
      legalRisk: Math.max(0, mission.legalRiskChange > 0 ? player.legalRisk + 1 : player.legalRisk)
    }
  };
}

function hasEquipmentInCategory(player: PlayerState, category: string): boolean {
  return EQUIPMENT.some(e => e.category === category && player.equipment[e.id]);
}

export function completeMission(player: PlayerState, mission: Mission): PlayerState {
  return {
    ...player,
    balance: player.balance + mission.reward,
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

function formatEquipmentName(id: string | undefined): string {
  if (!id) return "unknown equipment";
  return id.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}