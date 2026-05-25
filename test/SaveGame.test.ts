import { describe, expect, it } from "vitest";
import { ALL_HINTS, shouldShowHint } from "../src/game/Onboarding";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { createEconomyState } from "../src/game/Economy";
import { getPilotRank } from "../src/game/Rank";
import { createRunStats } from "../src/game/RunStats";
import { deserializeSave, loadGame, saveGame, SAVE_KEY } from "../src/game/SaveGame";
import { generateUniverse } from "../src/game/Universe";
import type { SaveData } from "../src/game/types";


describe("SaveGame", () => {
  it("round-trips valid save data", () => {
    const storage = new MemoryStorage();
    const save = makeSave();

    saveGame(save, storage);

    expect(storage.getItem(SAVE_KEY)).toBeTypeOf("string");
    expect(loadGame(storage)).toEqual(save);
  });

  it("rejects invalid save data", () => {
    expect(deserializeSave(JSON.stringify({ version: 99 }))).toBeNull();
    expect(deserializeSave("not-json")).toBeNull();
  });
});

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

function makeSave(): SaveData {
  return {
    version: 1,
    savedAt: 123,
    seed: 830741,
    player: {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orientation: { pitch: 0, yaw: 0, roll: 0 },
      speed: 0,
      shipId: "mirelle",
      hull: 100,
      maxHull: 100,
      shield: 100,
      maxShield: 100,
      energy: 100,
      balance: 1000,
      fuel: 7.5,
      cargo: { grain: 2 },
      cargoCostBasis: { grain: 10 },
      cargoCapacity: 20,
      currentSystemId: 0,
      discoveredSystemIds: [0],
      docked: false,
      legalRisk: 0,
      reputation: 0,
      equipment: { ...DEFAULT_EQUIPMENT },
      missionCargoUnits: 0
    },
    runStats: createRunStats(0),
    settings: { muted: false, sfxVolume: 1.0, musicVolume: 0.6 }
  };
}

describe("SaveGame cost basis migration", () => {
  it("migrates old save without cargoCostBasis by defaulting to empty object", () => {
    const storage = new MemoryStorage();
    const save = makeSave();
    const playerWithoutBasis = { ...save.player } as Record<string, unknown>;
    delete playerWithoutBasis.cargoCostBasis;
    const rawOld = JSON.stringify({ ...save, player: playerWithoutBasis });
    storage.setItem(SAVE_KEY, rawOld);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.cargoCostBasis).toEqual({});
  });
});

describe("SaveGame economy compatibility", () => {
  it("loads old saves without economy while preserving cargo and cost basis", () => {
    const storage = new MemoryStorage();
    const save = makeSave();
    const oldShape = { ...save } as Record<string, unknown>;
    delete oldShape.economy;
    storage.setItem(SAVE_KEY, JSON.stringify(oldShape));

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.economy).toBeUndefined();
    expect(loaded!.player.cargo).toEqual(save.player.cargo);
    expect(loaded!.player.cargoCostBasis).toEqual(save.player.cargoCostBasis);
    expect(loaded!.player.balance).toBe(save.player.balance);
  });

  it("round-trips optional economy state", () => {
    const storage = new MemoryStorage();
    const systems = generateUniverse(492017);
    const save = { ...makeSave(), economy: createEconomyState(systems) };

    saveGame(save, storage);
    expect(loadGame(storage)?.economy).toEqual(save.economy);
  });

  it("sanitizes malformed economy fields without corrupting player state", () => {
    const storage = new MemoryStorage();
    const save = makeSave();
    storage.setItem(SAVE_KEY, JSON.stringify({
      ...save,
      economy: {
        day: "bad",
        drift: { 0: { grain: "hot", minerals: 999 } },
        supplyAdjustments: { 0: { grain: 1.7, computers: "many" } },
        priceHistory: [{ day: 2.8, systemId: 0, commodityId: "grain", price: 7.4 }, { day: 1, systemId: 0, commodityId: "bad", price: 10 }]
      }
    }));

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.cargo).toEqual(save.player.cargo);
    expect(loaded!.player.cargoCostBasis).toEqual(save.player.cargoCostBasis);
    expect(loaded!.economy).toEqual({
      day: 0,
      drift: { 0: { minerals: 2 } },
      supplyAdjustments: { 0: { grain: 2 } },
      priceHistory: [{ day: 2, systemId: 0, commodityId: "grain", price: 7 }]
    });
  });
});

describe("SaveGame meta and settings persistence", () => {
  it("round-trips meta with onboarding state", () => {
    const storage = new MemoryStorage();
    const save = makeSave();
    const withMeta = {
      ...save,
      meta: { hasSeenOnboarding: true, dismissedHints: ["flight", "trade"] },
      settings: { muted: true, sfxVolume: 0.8, musicVolume: 0.4 }
    };
    saveGame(withMeta, storage);
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.meta?.hasSeenOnboarding).toBe(true);
    expect(loaded!.meta?.dismissedHints).toContain("flight");
    expect(loaded!.settings?.muted).toBe(true);
    expect(loaded!.settings?.sfxVolume).toBe(0.8);
    expect(loaded!.settings?.musicVolume).toBe(0.4);
  });

  it("loads an old save without meta or settings (defaults are applied)", () => {
    const storage = new MemoryStorage();
    const save = makeSave(); // no meta, no settings
    saveGame(save, storage);
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.meta).toBeUndefined();
    expect(loaded!.settings).toEqual({ muted: false, sfxVolume: 1.0, musicVolume: 0.6 });
  });

  it("round-trips personal best inside meta", () => {
    const storage = new MemoryStorage();
    const save = {
      ...makeSave(),
      meta: {
        hasSeenOnboarding: false,
        dismissedHints: [] as string[],
        personalBest: { totalBalEarned: 12500 }
      }
    };
    saveGame(save, storage);
    const loaded = loadGame(storage);
    expect(loaded!.meta?.personalBest?.totalBalEarned).toBe(12500);
  });

  it("does not re-trigger completed onboarding after save/load", () => {
    const storage = new MemoryStorage();
    const save = {
      ...makeSave(),
      meta: { hasSeenOnboarding: true, dismissedHints: [...ALL_HINTS] }
    };
    saveGame(save, storage);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(loaded!.meta!, hint)).toBe(false);
    }
  });

  it("rejects invalid meta (wrong type for hasSeenOnboarding)", () => {
    const save = makeSave();
    const corrupted = JSON.stringify({
      ...save,
      meta: { hasSeenOnboarding: "yes", dismissedHints: [] }
    });
    expect(deserializeSave(corrupted)).toBeNull();
  });

  it("normalizes missing settings instead of rejecting", () => {
    const save = makeSave();
    const withPartialSettings = JSON.stringify({ ...save, settings: { muted: true } });
    const loaded = deserializeSave(withPartialSettings);
    expect(loaded).not.toBeNull();
    expect(loaded!.settings).toEqual({ muted: true, sfxVolume: 1.0, musicVolume: 0.6 });
  });
});

describe("SaveGame migration", () => {
  it("migrates legacy BAL fields without reserializing old keys", () => {
    const storage = new MemoryStorage();
    const oldSave = makeSave();
    const player = { ...oldSave.player } as Record<string, unknown>;
    player[legacyFundsKey()] = 777;
    delete player.balance;
    const runStats = { ...createRunStats(0), [legacyRunTotalKey()]: 2222 } as Record<string, unknown>;
    delete runStats.totalBalEarned;
    const rawOld = {
      ...oldSave,
      player,
      runStats,
      meta: {
        hasSeenOnboarding: false,
        dismissedHints: [] as string[],
        personalBest: { [legacyRunTotalKey()]: 3333 }
      }
    };
    storage.setItem(SAVE_KEY, JSON.stringify(rawOld));

    const loaded = loadGame(storage);

    expect(loaded).not.toBeNull();
    expect(loaded!.player.balance).toBe(777);
    expect(loaded!.runStats?.totalBalEarned).toBe(2222);
    expect(loaded!.meta?.personalBest?.totalBalEarned).toBe(3333);
    expect(legacyFundsKey() in loaded!.player).toBe(false);
  });

  it("migrates old save without runStats by defaulting from current system", () => {
    const storage = new MemoryStorage();
    const oldSave = makeSave();
    const oldShape = { ...oldSave, player: { ...oldSave.player, currentSystemId: 4 } } as Record<string, unknown>;
    delete oldShape.runStats;
    storage.setItem(SAVE_KEY, JSON.stringify(oldShape));

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.runStats).toEqual(createRunStats(4));
  });

  it("round-trips runStats through save/load", () => {
    const storage = new MemoryStorage();
    const save = {
      ...makeSave(),
      runStats: {
        ...createRunStats(0),
        totalBalEarned: 3200,
        jumpsCompleted: 3,
        systemsVisited: [0, 1, 4],
        missionsCompleted: 2,
        enemiesDestroyed: 5,
        timePlayed: 91,
        causeOfDeath: "Unknown"
      }
    };

    saveGame(save, storage);

    expect(loadGame(storage)?.runStats).toEqual(save.runStats);
  });

  it("preserves rank inputs derived from runStats after save/load", () => {
    const storage = new MemoryStorage();
    const save = {
      ...makeSave(),
      runStats: {
        ...createRunStats(0),
        totalBalEarned: 3000,
        missionsCompleted: 2,
        enemiesDestroyed: 1
      }
    };
    const before = getPilotRank(save.runStats);

    saveGame(save, storage);
    const loaded = loadGame(storage);

    expect(loaded).not.toBeNull();
    expect(getPilotRank(loaded!.runStats!)).toEqual(before);
  });

  it("rejects malformed present runStats", () => {
    const corrupted = JSON.stringify({
      ...makeSave(),
      runStats: { totalBalEarned: "lots" }
    });

    expect(deserializeSave(corrupted)).toBeNull();
  });

  it("migrates completed legacy onboarding meta to hasSeenOnboarding true", () => {
    const storage = new MemoryStorage();
    const rawOld = JSON.stringify({
      ...makeSave(),
      meta: { hasSeenOnboarding: false, dismissedHints: [...ALL_HINTS] }
    });
    storage.setItem(SAVE_KEY, rawOld);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.meta?.hasSeenOnboarding).toBe(true);
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(loaded!.meta!, hint)).toBe(false);
    }
  });

  it("migrates old save without missionCargoUnits by defaulting to 0", () => {
    const storage = new MemoryStorage();
    const oldSave = makeSave();
    const playerWithoutNewFields = { ...oldSave.player } as Record<string, unknown>;
    delete playerWithoutNewFields.missionCargoUnits;
    const rawOld = JSON.stringify({ ...oldSave, player: playerWithoutNewFields });
    storage.setItem(SAVE_KEY, rawOld);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.missionCargoUnits).toBe(0);
  });

  it("migrates old save without ship and discovery fields", () => {
    const storage = new MemoryStorage();
    const oldSave = makeSave();
    const playerWithoutNewFields = { ...oldSave.player, currentSystemId: 7 } as Record<string, unknown>;
    delete playerWithoutNewFields.shipId;
    delete playerWithoutNewFields.discoveredSystemIds;
    const oldEquipment = {
      pulseLaser: true,
      beamLaser: false,
      cargoExpansion: false,
      fuelScoop: false,
      shieldBooster: false
    };
    playerWithoutNewFields.equipment = oldEquipment;
    storage.setItem(SAVE_KEY, JSON.stringify({ ...oldSave, player: playerWithoutNewFields }));

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.shipId).toBe("mirelle");
    expect(loaded!.player.currentSystemId).toBe(7);
    expect(loaded!.player.discoveredSystemIds).toContain(7);
    expect(loaded!.player.equipment.laneGlassScanner).toBe(false);
  });

  it("rejects malformed equipment fields instead of silently accepting them", () => {
    const save = makeSave();
    const corrupted = JSON.stringify({
      ...save,
      player: {
        ...save.player,
        equipment: { ...save.player.equipment, laneGlassScanner: "yes" }
      }
    });

    expect(deserializeSave(corrupted)).toBeNull();
  });

  it("migrates activeMission missing cargoUnitsRequired and deadlineJumps", () => {
    const storage = new MemoryStorage();
    const oldSave = makeSave();
    const activeMission = {
      id: "m1",
      type: "courier",
      title: "Test",
      briefing: "Go there.",
      originSystemId: 0,
      destinationSystemId: 1,
      reward: 200,
      reputationChange: 3,
      legalRiskChange: 0
      // cargoUnitsRequired and deadlineJumps intentionally omitted
    };
    const rawOld = JSON.stringify({
      ...oldSave,
      player: { ...oldSave.player, activeMission, activeMissionId: "m1" }
    });
    storage.setItem(SAVE_KEY, rawOld);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.activeMission?.cargoUnitsRequired).toBe(0);
    expect(loaded!.player.activeMission?.deadlineJumps).toBe(-1);
  });

  it("normalizes malformed settings during migration", () => {
    const storage = new MemoryStorage();
    const save = makeSave();
    const rawOld = JSON.stringify({
      ...save,
      settings: {
        muted: "maybe", // invalid type
        sfxVolume: 1.5, // needs clamping
        musicVolume: -0.2 // needs clamping
      }
    });
    storage.setItem(SAVE_KEY, rawOld);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.settings).toEqual({
      muted: false, // defaulted
      sfxVolume: 1.0, // clamped
      musicVolume: 0.0 // clamped
    });
  });

  it("handles NaN in settings during migration", () => {
    const storage = new MemoryStorage();
    const save = makeSave();
    const rawOld = JSON.stringify({
      ...save,
      settings: {
        muted: true,
        sfxVolume: NaN,
        musicVolume: 0.5
      }
    });
    storage.setItem(SAVE_KEY, rawOld);

    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.settings?.sfxVolume).toBe(1.0); // defaulted
    expect(loaded!.settings?.musicVolume).toBe(0.5);
  });
});

function legacyFundsKey(): string {
  return ["cre", "dits"].join("");
}

function legacyRunTotalKey(): string {
  return ["total", "Cre", "dits", "Earned"].join("");
}
