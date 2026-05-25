import { describe, expect, it } from "vitest";
import { loadGame, saveGame, type StorageLike } from "../src/game/SaveGame";
import { DEFAULT_EQUIPMENT, isPurchasable } from "../src/game/Equipment";
import type { EquipmentId, EquipmentState } from "../src/game/types";

function makeStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map<string, string>(Object.entries(initial));
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  };
}

function buildRawSave(equipmentPatch: Partial<EquipmentState>): string {
  return JSON.stringify({
    version: 1,
    savedAt: Date.now(),
    seed: 12345,
    player: {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      orientation: { pitch: 0, yaw: 0, roll: 0 },
      speed: 0,
      shipId: "mirelle",
      hull: 100,
      maxHull: 100,
      shield: 60,
      maxShield: 60,
      energy: 100,
      balance: 1000,
      fuel: 7.5,
      cargo: {},
      cargoCostBasis: {},
      cargoCapacity: 10,
      currentSystemId: 0,
      discoveredSystemIds: [0],
      docked: true,
      legalRisk: 0,
      reputation: 0,
      missionCargoUnits: 0,
      equipment: { ...DEFAULT_EQUIPMENT, ...equipmentPatch },
    },
    settings: { muted: false, sfxVolume: 1.0, musicVolume: 0.6 },
  });
}

describe("SaveMigrationEquipmentHonesty", () => {
  it("a save with noop equipment loads cleanly and strips noop items", () => {
    const raw = buildRawSave({ signalJammer: true, tradeLedger: true });
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    expect(loaded!.player.equipment.signalJammer).toBe(false);
    expect(loaded!.player.equipment.tradeLedger).toBe(false);
  });

  it("pulseLaser (starter, implemented) is preserved through migration", () => {
    const raw = buildRawSave({});
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const loaded = loadGame(storage);
    expect(loaded!.player.equipment.pulseLaser).toBe(true);
  });

  it("implemented equipment is preserved through migration", () => {
    const raw = buildRawSave({ shieldBooster: true, fuelScoop: true });
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const loaded = loadGame(storage);
    expect(loaded!.player.equipment.shieldBooster).toBe(true);
    expect(loaded!.player.equipment.fuelScoop).toBe(true);
  });

  it("sanitization is idempotent — save and reload strips nothing extra", () => {
    const raw = buildRawSave({ signalJammer: true, cargoExpansion: true });
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const first = loadGame(storage)!;
    saveGame(first, storage);
    const second = loadGame(storage)!;
    expect(second.player.equipment.signalJammer).toBe(false);
    expect(second.player.equipment.cargoExpansion).toBe(first.player.equipment.cargoExpansion);
  });

  it("all loaded equipment values are boolean", () => {
    const raw = buildRawSave({ beamLaser: true, coolingFin: true });
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const loaded = loadGame(storage)!;
    for (const val of Object.values(loaded.player.equipment)) {
      expect(typeof val).toBe("boolean");
    }
  });

  it("no noop item survives migration even when saved as true", () => {
    const noops: EquipmentId[] = [
      "pulseAbsorber", "coolingFin", "heatSink", "circuitBreaker",
      "signalJammer", "decoyLauncher", "chaffDispenser", "flareArray",
      "stealthCoating", "contractLog", "priorityTransceiver", "secureLockbox",
      "diplomaticSeal", "cargoScanner", "tradeLedger", "marketLink", "pricePredictor",
    ];
    const patch: Partial<EquipmentState> = {};
    for (const id of noops) patch[id] = true;
    const raw = buildRawSave(patch);
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const loaded = loadGame(storage)!;
    for (const id of noops) {
      expect(loaded.player.equipment[id]).toBe(false);
    }
  });

  it("after migration all equipped items satisfy isPurchasable", () => {
    const raw = buildRawSave({ beamLaser: true, signalJammer: true, shieldBooster: true });
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const loaded = loadGame(storage)!;
    const equip = loaded.player.equipment as unknown as Record<string, boolean>;
    for (const [id, val] of Object.entries(equip)) {
      if (val) {
        expect(isPurchasable(id as EquipmentId)).toBe(true);
      }
    }
  });

  it("a clean save round-trips without loss of implemented equipment", () => {
    const raw = buildRawSave({ cargoExpansion: true, engineTuning: true });
    const storage = makeStorage({ "vector-space-trader:v1": raw });
    const first = loadGame(storage)!;
    saveGame(first, storage);
    const second = loadGame(storage)!;
    expect(second.player.equipment.cargoExpansion).toBe(first.player.equipment.cargoExpansion);
    expect(second.player.equipment.engineTuning).toBe(first.player.equipment.engineTuning);
  });
});
