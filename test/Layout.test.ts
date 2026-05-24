import { afterEach, describe, expect, it, vi } from "vitest";

import {
  UI_LAYERS,
  assertLayerOrder,
  getHudBounds,
  getPanelBounds,
  getReservedTouchControlArea,
  getViewportKind,
  rectsOverlap,
  respectsReducedMotion
} from "../src/game/Layout";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Signal Glass layout primitives", () => {
  it("classifies breakpoints", () => {
    expect(getViewportKind({ width: 390, height: 844 })).toBe("mobilePortrait");
    expect(getViewportKind({ width: 720, height: 420 })).toBe("mobileLandscape");
    expect(getViewportKind({ width: 900, height: 1100 })).toBe("tablet");
    expect(getViewportKind({ width: 1280, height: 800 })).toBe("desktop");
    expect(getViewportKind({ width: 1800, height: 760 })).toBe("ultrawide");
  });

  it("reserves a touch-control area inside the viewport", () => {
    const area = getReservedTouchControlArea({ width: 390, height: 844 });
    expect(area.x).toBeGreaterThanOrEqual(0);
    expect(area.y).toBeGreaterThanOrEqual(0);
    expect(area.x + area.width).toBeLessThanOrEqual(390);
    expect(area.y + area.height).toBeLessThanOrEqual(844);
  });

  it("keeps compact HUD outside the touch reserved zone at 390x844", () => {
    const size = { width: 390, height: 844 };
    const hud = getHudBounds(size);
    const touch = getReservedTouchControlArea(size);

    expect(hud.compact).toBe(true);
    expect(rectsOverlap(hud.vitals, touch)).toBe(false);
    expect(rectsOverlap(hud.status, touch)).toBe(false);
  });

  it("creates mobile sheets and desktop panels", () => {
    expect(getPanelBounds({ width: 390, height: 844 }).fullScreen).toBe(true);
    const desktopPanel = getPanelBounds({ width: 1280, height: 800 });
    expect(desktopPanel.fullScreen).toBe(false);
    expect(desktopPanel.width).toBeLessThanOrEqual(640);
    expect(desktopPanel.x + desktopPanel.width).toBeLessThanOrEqual(1280);
  });

  it("orders UI layers from canvas to toast", () => {
    expect(assertLayerOrder()).toBe(true);
    expect(UI_LAYERS.canvas).toBe(0);
    expect(UI_LAYERS.toast).toBeGreaterThan(UI_LAYERS.touchControls);
  });

  it("reads reduced-motion preference without changing game state", () => {
    const matchMedia = vi.fn().mockReturnValue({ matches: true });
    vi.stubGlobal("window", { matchMedia });

    expect(respectsReducedMotion()).toBe(true);
    expect(matchMedia).toHaveBeenCalledWith("(prefers-reduced-motion: reduce)");
  });
});
