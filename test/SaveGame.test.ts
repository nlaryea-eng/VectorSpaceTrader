import { describe, expect, it } from "vitest";
import { ALL_HINTS, shouldShowHint } from "../src/game/Onboarding";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { getPilotRank } from "../src/game/Rank";
import { createRunStats } from "../src/game/RunStats";
import { deserializeSave, loadGame, saveGame, SAVE_KEY } from "../src/game/SaveGame";
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
      credits: 1000,
      fuel: 7.5,
      cargo: { grain: 2 },
      cargoCapacity: 20,
      currentSystemId: 0,
      discoveredSystemIds: [0],
      docked: false,
      legalRisk: 0,
      reputation: 0,
      equipment: { ...DEFAULT_EQUIPMENT },
      missionCargoUnits: 0
    },
    runStats: createRunStats(0)
  };
}

describe("SaveGame meta and settings persistence", () => {
  it("round-trips meta with onboarding state", () => {
    const storage = new MemoryStorage();
    const save = makeSave();
    const withMeta = {
      ...save,
      meta: { hasSeenOnboarding: true, dismissedHints: ["flight", "trade"] },
      settings: { muted: true }
    };
    saveGame(withMeta, storage);
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.meta?.hasSeenOnboarding).toBe(true);
    expect(loaded!.meta?.dismissedHints).toContain("flight");
    expect(loaded!.settings?.muted).toBe(true);
  });

  it("loads an old save without meta or settings (defaults to absent)", () => {
    const storage = new MemoryStorage();
    const save = makeSave(); // no meta, no settings
    saveGame(save, storage);
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.meta).toBeUndefined();
    expect(loaded!.settings).toBeUndefined();
  });

  it("round-trips personal best inside meta", () => {
    const storage = new MemoryStorage();
    const save = {
      ...makeSave(),
      meta: {
        hasSeenOnboarding: false,
        dismissedHints: [] as string[],
        personalBest: { totalCreditsEarned: 12500 }
      }
    };
    saveGame(save, storage);
    const loaded = loadGame(storage);
    expect(loaded!.meta?.personalBest?.totalCreditsEarned).toBe(12500);
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

  it("rejects invalid settings (missing muted field)", () => {
    const save = makeSave();
    const corrupted = JSON.stringify({ ...save, settings: { volume: 0.5 } });
    expect(deserializeSave(corrupted)).toBeNull();
  });
});

describe("SaveGame migration", () => {
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
        totalCreditsEarned: 3200,
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
        totalCreditsEarned: 3000,
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
      runStats: { totalCreditsEarned: "lots" }
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
});
