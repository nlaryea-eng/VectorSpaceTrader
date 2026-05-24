import type { CargoHold, Meta, PlayerState, SaveData, Settings } from "./types";
import { DEFAULT_EQUIPMENT } from "./Equipment";
import { normalizeOnboardingMeta } from "./Onboarding";
import { createRunStats, type RunStats } from "./RunStats";
import { TRADE_CONSTANTS } from "./Trading";

export const SAVE_KEY = "vector-space-trader:v1";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data);
}

export function deserializeSave(raw: string): SaveData | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isValidSaveData(parsed)) return null;
    return migrateSaveData(parsed);
  } catch {
    return null;
  }
}

function migrateSaveData(data: SaveData): SaveData {
  const raw = data.player as unknown as Record<string, unknown>;

  const hasHull = "hull" in raw && typeof raw.hull === "number";
  const hasMaxHull = "maxHull" in raw && typeof raw.maxHull === "number";

  let player = data.player;
  if (!hasHull || !hasMaxHull) {
    player = {
      ...player,
      hull: hasHull ? (raw.hull as number) : 100,
      maxHull: hasMaxHull ? (raw.maxHull as number) : 100
    };
  }

  if (player.missionCargoUnits === undefined) {
    player = { ...player, missionCargoUnits: 0 };
  }

  if (player.activeMission) {
    const am = player.activeMission as unknown as Record<string, unknown>;
    if (am.cargoUnitsRequired === undefined || am.deadlineJumps === undefined) {
      player = {
        ...player,
        activeMission: {
          ...player.activeMission,
          cargoUnitsRequired: (am.cargoUnitsRequired as number | undefined) ?? 0,
          deadlineJumps: (am.deadlineJumps as number | undefined) ?? -1
        }
      };
    }
  }

  const migrated: SaveData = {
    ...data,
    player,
    runStats: data.runStats ?? createRunStats(player.currentSystemId)
  };

  if (data.meta !== undefined) {
    migrated.meta = normalizeOnboardingMeta(data.meta);
  }

  return migrated;
}

export function saveGame(data: SaveData, storage: StorageLike = window.localStorage): void {
  storage.setItem(SAVE_KEY, serializeSave(data));
}

export function loadGame(storage: StorageLike = window.localStorage): SaveData | null {
  const raw = storage.getItem(SAVE_KEY);
  return raw ? deserializeSave(raw) : null;
}

export function hasSave(storage: StorageLike = window.localStorage): boolean {
  return loadGame(storage) !== null;
}

export function clearSave(storage: StorageLike = window.localStorage): void {
  storage.removeItem(SAVE_KEY);
}

export function isValidSaveData(value: unknown): value is SaveData {
  if (!isRecord(value)) return false;
  if (value.version !== 1) return false;
  if (typeof value.savedAt !== "number" || typeof value.seed !== "number") return false;
  if (!isValidPlayerState(value.player)) return false;
  if (value.meta !== undefined && !isValidMeta(value.meta)) return false;
  if (value.settings !== undefined && !isValidSettings(value.settings)) return false;
  if (value.runStats !== undefined && !isValidRunStats(value.runStats)) return false;
  return true;
}

function isValidMeta(value: unknown): value is Meta {
  if (!isRecord(value)) return false;
  if (typeof value.hasSeenOnboarding !== "boolean") return false;
  if (!Array.isArray(value.dismissedHints)) return false;
  if (!value.dismissedHints.every((h: unknown) => typeof h === "string")) return false;
  if (value.personalBest !== undefined) {
    if (!isRecord(value.personalBest)) return false;
    if (typeof value.personalBest.totalCreditsEarned !== "number") return false;
  }
  return true;
}

function isValidSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  return typeof value.muted === "boolean";
}

function isValidRunStats(value: unknown): value is RunStats {
  if (!isRecord(value)) return false;
  if (typeof value.totalCreditsEarned !== "number" || value.totalCreditsEarned < 0) return false;
  if (typeof value.jumpsCompleted !== "number" || value.jumpsCompleted < 0) return false;
  if (!Array.isArray(value.systemsVisited)) return false;
  if (!value.systemsVisited.every((id: unknown) => typeof id === "number" && id >= 0)) return false;
  if (typeof value.missionsCompleted !== "number" || value.missionsCompleted < 0) return false;
  if (typeof value.missionsFailed !== "number" || value.missionsFailed < 0) return false;
  if (typeof value.enemiesDestroyed !== "number" || value.enemiesDestroyed < 0) return false;
  if (typeof value.timePlayed !== "number" || value.timePlayed < 0) return false;
  if (typeof value.causeOfDeath !== "string") return false;
  return true;
}

function isValidPlayerState(value: unknown): value is PlayerState {
  if (!isRecord(value)) return false;
  if (!isVector(value.position) || !isVector(value.velocity)) return false;
  if (!isRecord(value.orientation)) return false;
  if (typeof value.orientation.pitch !== "number") return false;
  if (typeof value.orientation.yaw !== "number") return false;
  if (typeof value.orientation.roll !== "number") return false;
  if (typeof value.speed !== "number") return false;
  if (typeof value.maxShield !== "number" || value.maxShield < 1 || value.maxShield > 160) return false;
  if (typeof value.shield !== "number" || value.shield < 0 || value.shield > value.maxShield) return false;
  if (typeof value.energy !== "number" || value.energy < 0 || value.energy > 100) return false;
  if (typeof value.credits !== "number" || value.credits < 0) return false;
  if (typeof value.fuel !== "number" || value.fuel < 0 || value.fuel > TRADE_CONSTANTS.maxFuel) return false;
  if (!isRecord(value.cargo)) return false;
  if (typeof value.cargoCapacity !== "number" || value.cargoCapacity <= 0) return false;
  if (typeof value.currentSystemId !== "number" || value.currentSystemId < 0) return false;
  if (typeof value.docked !== "boolean") return false;
  if (typeof value.legalRisk !== "number" || value.legalRisk < 0) return false;
  if (typeof value.reputation !== "number") return false;
  if (!isRecord(value.equipment)) return false;
  const equipment = value.equipment;
  if (!Object.keys(DEFAULT_EQUIPMENT).every((key) => typeof equipment[key] === "boolean")) return false;
  if (value.activeMissionId !== undefined && typeof value.activeMissionId !== "string") return false;
  if (value.activeMission !== undefined && !isRecord(value.activeMission)) return false;
  if (value.hull !== undefined && (typeof value.hull !== "number" || value.hull < 0)) return false;
  if (value.maxHull !== undefined && (typeof value.maxHull !== "number" || value.maxHull < 1)) return false;
  if (value.missionCargoUnits !== undefined && typeof value.missionCargoUnits !== "number") return false;
  return isValidCargo(value.cargo as CargoHold);
}

function isValidCargo(cargo: CargoHold): boolean {
  return Object.values(cargo).every((quantity) => typeof quantity === "number" && quantity >= 0);
}

function isVector(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.x === "number" &&
    typeof value.y === "number" &&
    typeof value.z === "number"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
