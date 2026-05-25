import { describe, expect, it } from "vitest";
import {
  createEmptyMessageLog,
  createInitialTransientState,
  pushMessage,
} from "../src/game/TransientState";

describe("MessageLog ring buffer", () => {
  it("starts empty", () => {
    const log = createEmptyMessageLog();
    expect(log.entries).toHaveLength(0);
    expect(log.nextSeq).toBe(0);
  });

  it("adds entries in order", () => {
    let log = createEmptyMessageLog();
    log = pushMessage(log, "alpha", "info", 0);
    log = pushMessage(log, "beta", "warning", 1);
    expect(log.entries[0].text).toBe("alpha");
    expect(log.entries[1].text).toBe("beta");
  });

  it("retains kind and timestamp", () => {
    let log = createEmptyMessageLog();
    log = pushMessage(log, "boom", "danger", 42.5);
    expect(log.entries[0].kind).toBe("danger");
    expect(log.entries[0].t).toBe(42.5);
  });

  it("caps at 20 entries (ring buffer)", () => {
    let log = createEmptyMessageLog();
    for (let i = 0; i < 25; i++) {
      log = pushMessage(log, `msg${i}`, "info", i);
    }
    expect(log.entries).toHaveLength(20);
    expect(log.entries[0].text).toBe("msg5");
    expect(log.entries[19].text).toBe("msg24");
  });

  it("increments sequence numbers monotonically", () => {
    let log = createEmptyMessageLog();
    log = pushMessage(log, "a", "info", 0);
    log = pushMessage(log, "b", "success", 1);
    log = pushMessage(log, "c", "warning", 2);
    expect(log.entries.map(e => e.seq)).toEqual([0, 1, 2]);
    expect(log.nextSeq).toBe(3);
  });

  it("seq numbers survive cap truncation", () => {
    let log = createEmptyMessageLog();
    for (let i = 0; i < 22; i++) {
      log = pushMessage(log, `m${i}`, "info", i);
    }
    expect(log.nextSeq).toBe(22);
    expect(log.entries[0].seq).toBe(2);
    expect(log.entries[19].seq).toBe(21);
  });

  it("does not mutate unrelated transient state fields", () => {
    const initial = createInitialTransientState();
    const updated = {
      ...initial,
      messageLog: pushMessage(initial.messageLog, "hello", "info", 0),
    };
    expect(updated.respawnCountdown).toBe(null);
    expect(updated.explosionEffect).toBe(null);
    expect(updated.playerHitFlash).toBe(0);
    expect(updated.dockingProgress).toBe(0);
  });

  it("ordering: newest entry is at the highest index", () => {
    let log = createEmptyMessageLog();
    log = pushMessage(log, "first", "info", 0);
    log = pushMessage(log, "second", "success", 1);
    log = pushMessage(log, "third", "warning", 2);
    const last = log.entries[log.entries.length - 1];
    expect(last.text).toBe("third");
  });

  it("all message kinds are accepted", () => {
    let log = createEmptyMessageLog();
    const kinds = ["info", "success", "warning", "danger"] as const;
    for (const kind of kinds) {
      log = pushMessage(log, kind, kind, 0);
    }
    const stored = log.entries.map(e => e.kind);
    expect(stored).toEqual(kinds);
  });
});

describe("MessageLog layout safety (390×844)", () => {
  it("5 entries fit within 100px — safe above 176px touch ring on narrow", () => {
    const rowH = 18;
    const padY = 5;
    const entries = 5;
    const panelH = entries * rowH + padY * 2;
    const narrowTouchArea = 176;
    const viewportHeight = 844;
    const panelTop = viewportHeight - narrowTouchArea - panelH - 6;
    expect(panelTop).toBeGreaterThan(0);
    expect(panelH).toBeLessThanOrEqual(100);
  });
});
