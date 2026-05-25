import { describe, expect, it } from "vitest";
import {
  EQUIPMENT,
  EQUIPMENT_AUDIT,
  isPurchasable,
  type EquipmentStatus,
} from "../src/game/Equipment";
import type { EquipmentId } from "../src/game/types";

const VALID_STATUSES: EquipmentStatus[] = ["implemented", "partial", "noop", "cosmetic"];

describe("EquipmentHonestyAudit", () => {
  it("every EquipmentId has an audit entry", () => {
    for (const item of EQUIPMENT) {
      expect(EQUIPMENT_AUDIT[item.id]).toBeDefined();
    }
  });

  it("no audit entry references an unknown EquipmentId", () => {
    const knownIds = new Set<EquipmentId>(EQUIPMENT.map(e => e.id));
    for (const key of Object.keys(EQUIPMENT_AUDIT) as EquipmentId[]) {
      expect(knownIds.has(key)).toBe(true);
    }
  });

  it("all status values are valid enum members", () => {
    for (const [id, status] of Object.entries(EQUIPMENT_AUDIT)) {
      expect(VALID_STATUSES).toContain(status as EquipmentStatus);
      void id;
    }
  });

  it("isPurchasable returns true for implemented and partial items", () => {
    for (const [id, status] of Object.entries(EQUIPMENT_AUDIT) as [EquipmentId, EquipmentStatus][]) {
      const expected = status === "implemented" || status === "partial";
      expect(isPurchasable(id)).toBe(expected);
    }
  });

  it("pulseLaser (starter weapon) is purchasable", () => {
    expect(isPurchasable("pulseLaser")).toBe(true);
  });

  it("known noop items are not purchasable", () => {
    const noops: EquipmentId[] = [
      "pulseAbsorber", "coolingFin", "heatSink", "circuitBreaker",
      "signalJammer", "decoyLauncher", "chaffDispenser", "flareArray",
      "stealthCoating", "contractLog", "priorityTransceiver", "secureLockbox",
      "diplomaticSeal", "cargoScanner", "tradeLedger", "marketLink", "pricePredictor",
    ];
    for (const id of noops) {
      expect(isPurchasable(id)).toBe(false);
    }
  });

  it("at least 30 items remain purchasable (implemented + partial)", () => {
    const count = EQUIPMENT.filter(e => isPurchasable(e.id)).length;
    expect(count).toBeGreaterThanOrEqual(30);
  });

  it("noop items are fewer than 25 (audit is not overly aggressive)", () => {
    const noopCount = Object.values(EQUIPMENT_AUDIT).filter(s => s === "noop").length;
    expect(noopCount).toBeLessThan(25);
  });

  it("audit covers exactly the same count as EQUIPMENT array", () => {
    expect(Object.keys(EQUIPMENT_AUDIT).length).toBe(EQUIPMENT.length);
  });
});
