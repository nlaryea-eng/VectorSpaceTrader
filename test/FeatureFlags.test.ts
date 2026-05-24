import { afterEach, describe, expect, it, vi } from "vitest";

import { SIGNAL_GLASS_UI_STORAGE_KEY, isSignalGlassUiEnabled } from "../src/game/FeatureFlags";

afterEach(() => {
  vi.unstubAllGlobals();
});

function stubWindow(search: string, stored: string | null): void {
  vi.stubGlobal("window", {
    location: { search },
    localStorage: {
      getItem: vi.fn((key: string) => key === SIGNAL_GLASS_UI_STORAGE_KEY ? stored : null)
    }
  });
}

describe("Signal Glass feature flag", () => {
  it("defaults to enabled without mutating saves", () => {
    stubWindow("", null);
    expect(isSignalGlassUiEnabled()).toBe(true);
  });

  it("can be disabled by query string", () => {
    stubWindow("?signalGlass=0", null);
    expect(isSignalGlassUiEnabled()).toBe(false);
  });

  it("uses the namespaced UI-local storage key", () => {
    stubWindow("", "false");
    expect(SIGNAL_GLASS_UI_STORAGE_KEY).toMatch(/^vst\.signalglass\.v1\./);
    expect(isSignalGlassUiEnabled()).toBe(false);
  });
});
