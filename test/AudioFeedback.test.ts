import { describe, expect, it } from "vitest";

import { getUiMotionDuration, getUiSoundEvent } from "../src/game/AudioFeedback";

describe("Signal Glass feedback mapping", () => {
  it("maps UI feedback to existing procedural audio events", () => {
    expect(getUiSoundEvent("filterCycle")).toBe("ui");
    expect(getUiSoundEvent("mapTarget")).toBe("ui");
    expect(getUiSoundEvent("missionAccepted")).toBe("missionAccepted");
    expect(getUiSoundEvent("equipmentInstall")).toBe("tradeOk");
    expect(getUiSoundEvent("routeBlocked")).toBe("tradeFail");
  });

  it("removes nonessential motion when reduced motion is requested", () => {
    expect(getUiMotionDuration("routeValid", true)).toBe(0);
    expect(getUiMotionDuration("routeValid", false)).toBeLessThanOrEqual(240);
    expect(getUiMotionDuration("button", false)).toBeLessThanOrEqual(120);
  });
});
