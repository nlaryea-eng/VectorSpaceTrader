import { describe, expect, it } from "vitest";
import { createInitialTransientState } from "../src/game/TransientState";

describe("createInitialTransientState", () => {
  it("resets runtime-only visual and timer state", () => {
    expect(createInitialTransientState()).toEqual({
      respawnCountdown: null,
      explosionEffect: null,
      playerHitFlash: 0,
      dockingProgress: 0,
      messageLog: { entries: [], nextSeq: 0 },
    });
  });
});
