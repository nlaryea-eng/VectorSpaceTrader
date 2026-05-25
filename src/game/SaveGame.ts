import type { CargoHold, CommodityId, EconomyState, EquipmentState, Meta, Mission, PlayerState, PriceHistoryEntry, SaveData, Settings } from "./types";
import { DEFAULT_EQUIPMENT } from "./Equipment";
import { normalizeOnboardingMeta } from "./Onboarding";
import { createRunStats, type RunStats } from "./RunStats";
import { applyPlayerShipStats, isPlayerShipId, normalizeShipId } from "./Ships";
import { isValidMissionId, createMissionId } from "./MissionIds";
import { COMMODITIES } from "./Trading";

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
    const migrated = migrateSaveData(parsed);
    if (!migrated || !isValidSaveData(migrated)) return null;
    return migrated;
  } catch {
    return null;
  }
}

function legacyFundsKey(): string {
  return ["cre", "dits"].join("");
}

function legacyRunTotalKey(): string {
  return ["total", "Cre", "dits", "Earned"].join("");
}

function migrateSaveData(value: unknown): SaveData | null {
  if (!isRecord(value)) return null;
  if (value.version !== 1) return null;
  if (typeof value.savedAt !== "number" || typeof value.seed !== "number") return null;
  if (!isRecord(value.player)) return null;

  const raw = value.player;
  const equipment = normalizeEquipment(raw.equipment);
  if (!equipment) return null;

  const playerBase: Record<string, unknown> = { ...raw };
  const balance = readNumber(playerBase, "balance") ?? readNumber(playerBase, legacyFundsKey());
  delete playerBase[legacyFundsKey()];

  const hasHull = "hull" in raw && typeof raw.hull === "number";
  const hasMaxHull = "maxHull" in raw && typeof raw.maxHull === "number";
  const currentSystemId = typeof raw.currentSystemId === "number" ? raw.currentSystemId : 0;

  let player = {
    ...playerBase,
    equipment,
    shipId: normalizeShipId(raw.shipId),
    balance: balance ?? -1,
    hull: hasHull ? raw.hull : 100,
    maxHull: hasMaxHull ? raw.maxHull : 100,
    missionCargoUnits: typeof raw.missionCargoUnits === "number" ? raw.missionCargoUnits : 0,
    discoveredSystemIds: normalizeDiscoveredSystemIds(raw.discoveredSystemIds, currentSystemId),
    cargoCostBasis: isRecord(raw.cargoCostBasis) ? (raw.cargoCostBasis as Partial<Record<CommodityId, number>>) : {}
  } as unknown as PlayerState;

  if (player.activeMission) {
    player = { ...player, activeMission: migrateMission(player.activeMission) };
  }

  player = applyPlayerShipStats(player);

  const migrated: SaveData = {
    ...(value as unknown as SaveData),
    player,
    settings: normalizeSettings(value.settings),
    runStats: migrateRunStats(value.runStats, player.currentSystemId)
  };

  if (value.economy !== undefined) {
    migrated.economy = normalizeEconomyState(value.economy);
  }

  if (value.meta !== undefined) {
    migrated.meta = migrateMeta(value.meta);
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
  if (value.economy !== undefined && !isValidEconomyState(value.economy)) return false;
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
    if (typeof value.personalBest.totalBalEarned !== "number") return false;
  }
  return true;
}

function isValidSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  return (
    typeof value.muted === "boolean" &&
    typeof value.sfxVolume === "number" &&
    typeof value.musicVolume === "number"
  );
}

function normalizeSettings(value: unknown): Settings {
  const defaults: Settings = {
    muted: false,
    sfxVolume: 1.0,
    musicVolume: 0.6
  };

  if (!isRecord(value)) return defaults;

  const muted = typeof value.muted === "boolean" ? value.muted : defaults.muted;

  let sfxVolume = defaults.sfxVolume;
  if (typeof value.sfxVolume === "number" && !isNaN(value.sfxVolume)) {
    sfxVolume = Math.max(0, Math.min(1, value.sfxVolume));
  }

  let musicVolume = defaults.musicVolume;
  if (typeof value.musicVolume === "number" && !isNaN(value.musicVolume)) {
    musicVolume = Math.max(0, Math.min(1, value.musicVolume));
  }

  return { muted, sfxVolume, musicVolume };
}

function migrateMeta(value: unknown): Meta {
  if (!isRecord(value)) return value as Meta;
  const meta: Record<string, unknown> = { ...value };
  if (isRecord(meta.personalBest)) {
    const personalBest: Record<string, unknown> = { ...meta.personalBest };
    if (typeof personalBest.totalBalEarned !== "number") {
      const legacyTotal = readNumber(personalBest, legacyRunTotalKey());
      if (legacyTotal !== undefined) personalBest.totalBalEarned = legacyTotal;
    }
    delete personalBest[legacyRunTotalKey()];
    meta.personalBest = personalBest;
  }
  return normalizeOnboardingMeta(meta as unknown as Meta);
}

function migrateRunStats(value: unknown, startSystemId: number): RunStats {
  if (!isRecord(value)) return createRunStats(startSystemId);
  const runStats: Record<string, unknown> = { ...value };
  if (typeof runStats.totalBalEarned !== "number") {
    const legacyTotal = readNumber(runStats, legacyRunTotalKey());
    if (legacyTotal !== undefined) runStats.totalBalEarned = legacyTotal;
  }
  delete runStats[legacyRunTotalKey()];
  return runStats as unknown as RunStats;
}

function isValidRunStats(value: unknown): value is RunStats {
  if (!isRecord(value)) return false;
  if (typeof value.totalBalEarned !== "number" || value.totalBalEarned < 0) return false;
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

function normalizeEconomyState(value: unknown): EconomyState {
  if (!isRecord(value)) return createEmptyEconomyState();
  return {
    day: typeof value.day === "number" && value.day >= 0 ? Math.floor(value.day) : 0,
    drift: normalizeEconomyDrift(value.drift),
    supplyAdjustments: normalizeSupplyAdjustments(value.supplyAdjustments),
    priceHistory: normalizePriceHistory(value.priceHistory)
  };
}

function createEmptyEconomyState(): EconomyState {
  return { day: 0, drift: {}, supplyAdjustments: {}, priceHistory: [] };
}

function isValidEconomyState(value: unknown): value is EconomyState {
  if (!isRecord(value)) return false;
  if (typeof value.day !== "number" || value.day < 0) return false;
  if (!isRecord(value.drift) || !isRecord(value.supplyAdjustments)) return false;
  if (!Array.isArray(value.priceHistory)) return false;
  return true;
}

function normalizeEconomyDrift(value: unknown): EconomyState["drift"] {
  if (!isRecord(value)) return {};
  const result: EconomyState["drift"] = {};
  for (const [systemId, rawValues] of Object.entries(value)) {
    const numericSystemId = Number(systemId);
    if (!Number.isInteger(numericSystemId) || numericSystemId < 0 || !isRecord(rawValues)) continue;
    const values: Partial<Record<CommodityId, number>> = {};
    for (const commodity of COMMODITIES) {
      const raw = rawValues[commodity.id];
      if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
        values[commodity.id] = Math.max(0.5, Math.min(2, raw));
      }
    }
    result[numericSystemId] = values as Record<CommodityId, number>;
  }
  return result;
}

function normalizeSupplyAdjustments(value: unknown): EconomyState["supplyAdjustments"] {
  if (!isRecord(value)) return {};
  const result: EconomyState["supplyAdjustments"] = {};
  for (const [systemId, rawValues] of Object.entries(value)) {
    const numericSystemId = Number(systemId);
    if (!Number.isInteger(numericSystemId) || numericSystemId < 0 || !isRecord(rawValues)) continue;
    const values: Partial<Record<CommodityId, number>> = {};
    for (const commodity of COMMODITIES) {
      const raw = rawValues[commodity.id];
      if (typeof raw === "number" && Number.isFinite(raw)) {
        values[commodity.id] = Math.max(-200, Math.min(200, Math.round(raw)));
      }
    }
    result[numericSystemId] = values;
  }
  return result;
}

function normalizePriceHistory(value: unknown): PriceHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const commodityIds = new Set(COMMODITIES.map((commodity) => commodity.id));
  return value
    .filter((entry): entry is Record<string, unknown> => isRecord(entry))
    .filter((entry) => (
      typeof entry.day === "number" &&
      typeof entry.systemId === "number" &&
      typeof entry.commodityId === "string" &&
      commodityIds.has(entry.commodityId as CommodityId) &&
      typeof entry.price === "number" &&
      entry.day >= 0 &&
      entry.systemId >= 0 &&
      entry.price >= 0
    ))
    .map((entry) => ({
      day: Math.floor(entry.day as number),
      systemId: Math.floor(entry.systemId as number),
      commodityId: entry.commodityId as CommodityId,
      price: Math.max(0, Math.round(entry.price as number))
    }))
    .slice(-240);
}

function isValidPlayerState(value: unknown): value is PlayerState {
  if (!isRecord(value)) return false;
  if (!isVector(value.position) || !isVector(value.velocity)) return false;
  if (!isRecord(value.orientation)) return false;
  if (typeof value.orientation.pitch !== "number") return false;
  if (typeof value.orientation.yaw !== "number") return false;
  if (typeof value.orientation.roll !== "number") return false;
  if (typeof value.speed !== "number") return false;
  if (!isPlayerShipId(value.shipId)) return false;
  if (typeof value.maxShield !== "number" || value.maxShield < 1 || value.maxShield > 240) return false;
  if (typeof value.shield !== "number" || value.shield < 0 || value.shield > value.maxShield) return false;
  if (typeof value.energy !== "number" || value.energy < 0 || value.energy > 100) return false;
  if (typeof value.balance !== "number" || value.balance < 0) return false;
  if (typeof value.fuel !== "number" || value.fuel < 0 || value.fuel > 12) return false;
  if (!isRecord(value.cargo)) return false;
  if (typeof value.cargoCapacity !== "number" || value.cargoCapacity <= 0) return false;
  if (typeof value.currentSystemId !== "number" || value.currentSystemId < 0) return false;
  if (!Array.isArray(value.discoveredSystemIds)) return false;
  if (!value.discoveredSystemIds.every((id: unknown) => typeof id === "number" && id >= 0)) return false;
  if (typeof value.docked !== "boolean") return false;
  if (typeof value.legalRisk !== "number" || value.legalRisk < 0) return false;
  if (typeof value.reputation !== "number") return false;
  if (!isRecord(value.equipment)) return false;
  const equipment = value.equipment;
  if (!Object.keys(DEFAULT_EQUIPMENT).every((key) => typeof equipment[key] === "boolean")) return false;
  if (value.activeMissionId !== undefined && typeof value.activeMissionId !== "string") return false;
  if (value.activeMission !== undefined && !isValidMission(value.activeMission)) return false;
  if (value.hull !== undefined && (typeof value.hull !== "number" || value.hull < 0)) return false;
  if (value.maxHull !== undefined && (typeof value.maxHull !== "number" || value.maxHull < 1)) return false;
  if (value.missionCargoUnits !== undefined && typeof value.missionCargoUnits !== "number") return false;
  return isValidCargo(value.cargo as CargoHold) && isValidCargoCostBasis(value.cargoCostBasis as Record<CommodityId, number>);
}

function isValidCargoCostBasis(basis: Record<CommodityId, number> | undefined): basis is Record<CommodityId, number> {
  if (basis === undefined) return true;
  if (!isRecord(basis)) return false;
  return Object.values(basis).every((price) => typeof price === "number" && price >= 0);
}


function isValidMission(value: unknown): value is Mission {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || !isValidMissionId(value.id) || typeof value.type !== "string") return false;
  if (typeof value.typeLabel !== "string" || typeof value.title !== "string" || typeof value.briefing !== "string") return false;
  if (typeof value.originSystemId !== "number" || value.originSystemId < 0) return false;
  if (typeof value.destinationSystemId !== "number" || value.destinationSystemId < 0) return false;
  if (typeof value.reward !== "number" || value.reward < 0) return false;
  if (typeof value.reputationChange !== "number" || typeof value.legalRiskChange !== "number") return false;
  if (typeof value.failureReputationChange !== "number" || typeof value.failureLegalRiskChange !== "number") return false;
  if (typeof value.cargoUnitsRequired !== "number" || value.cargoUnitsRequired < 0) return false;
  if (typeof value.cargoLabel !== "string") return false;
  if (typeof value.deadlineJumps !== "number") return false;
  if (typeof value.riskLabel !== "string" || typeof value.riskLevel !== "number") return false;
  if (value.requiredEquipment !== undefined && typeof value.requiredEquipment !== "string") return false;
  if (value.minReputation !== undefined && typeof value.minReputation !== "number") return false;
  return true;
}


function migrateMission(value: Mission): Mission {
  const raw = value as unknown as Record<string, unknown>;
  const type = typeof raw.type === "string" ? raw.type : "courier";
  const id = typeof raw.id === "string" && isValidMissionId(raw.id)
    ? (raw.id as Mission["id"])
    : createMissionId(0, BigInt(Math.floor(Math.random() * 1000000))); // Fallback for old missions

  return {
    ...value,
    id,
    typeLabel: typeof raw.typeLabel === "string" ? raw.typeLabel : type,
    failureReputationChange: typeof raw.failureReputationChange === "number" ? raw.failureReputationChange : -2,
    failureLegalRiskChange: typeof raw.failureLegalRiskChange === "number" ? raw.failureLegalRiskChange : 1,
    cargoUnitsRequired: typeof raw.cargoUnitsRequired === "number" ? raw.cargoUnitsRequired : 0,
    cargoLabel: typeof raw.cargoLabel === "string" ? raw.cargoLabel : "contract cargo",
    deadlineJumps: typeof raw.deadlineJumps === "number" ? raw.deadlineJumps : -1,
    riskLabel: typeof raw.riskLabel === "string" ? raw.riskLabel : "standard",
    riskLevel: typeof raw.riskLevel === "number" ? raw.riskLevel : 1,
    requiredEquipment: typeof raw.requiredEquipment === "string" ? raw.requiredEquipment as Mission["requiredEquipment"] : undefined,
    minReputation: typeof raw.minReputation === "number" ? raw.minReputation : undefined
  };
}

function normalizeEquipment(value: unknown): EquipmentState | null {
  if (!isRecord(value)) return null;
  const result: EquipmentState = { ...DEFAULT_EQUIPMENT };
  for (const key of Object.keys(DEFAULT_EQUIPMENT) as Array<keyof EquipmentState>) {
    if (value[key] === undefined) continue;
    if (typeof value[key] !== "boolean") return null;
    result[key] = value[key];
  }
  return result;
}

function normalizeDiscoveredSystemIds(value: unknown, currentSystemId: number): number[] {
  const discovered = new Set<number>([currentSystemId]);
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "number" && item >= 0) discovered.add(item);
    }
  }
  return [...discovered].sort((a, b) => a - b);
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

function readNumber(value: Record<string, unknown>, key: string): number | undefined {
  return typeof value[key] === "number" ? value[key] : undefined;
}
