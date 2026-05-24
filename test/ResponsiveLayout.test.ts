import { describe, expect, it } from "vitest";

import { getMapFilterBounds, getPanelBounds, getResponsiveUiProfile, getReservedTouchControlArea, rectsOverlap } from "../src/game/Layout";
import { createHudShellLayout, hudOverlapsTouch } from "../src/game/UiHost";

const viewports = [
  { width: 390, height: 844 },
  { width: 720, height: 420 },
  { width: 900, height: 1100 },
  { width: 1280, height: 800 },
  { width: 1800, height: 760 }
];

describe("Signal Glass responsive profiles", () => {
  it("defines panel modes for all supported breakpoints", () => {
    expect(getResponsiveUiProfile({ width: 390, height: 844 }).panelMode).toBe("fullSheet");
    expect(getResponsiveUiProfile({ width: 720, height: 420 }).panelMode).toBe("sideSheet");
    expect(getResponsiveUiProfile({ width: 900, height: 1100 }).panelMode).toBe("panel");
    expect(getResponsiveUiProfile({ width: 1280, height: 800 }).panelMode).toBe("panel");
    expect(getResponsiveUiProfile({ width: 1800, height: 760 }).viewport).toBe("ultrawide");
  });

  it("keeps HUD and panel bounds inside every supported viewport", () => {
    for (const size of viewports) {
      const hud = createHudShellLayout(size);
      const panel = getPanelBounds(size);
      expect(hud.vitals.x + hud.vitals.width).toBeLessThanOrEqual(size.width);
      expect(panel.x + panel.width).toBeLessThanOrEqual(size.width);
      expect(panel.y + panel.height).toBeLessThanOrEqual(size.height);
    }
  });

  it("keeps mobile HUD clear of the touch cluster", () => {
    const size = { width: 390, height: 844 };
    const hud = createHudShellLayout(size);
    const touch = getReservedTouchControlArea(size);
    expect(hudOverlapsTouch(hud)).toBe(false);
    expect(rectsOverlap(hud.vitals, touch)).toBe(false);
  });

  it("uses sheet-style map filters on compact viewports", () => {
    const mobile = getMapFilterBounds({ width: 390, height: 844 });
    const desktop = getMapFilterBounds({ width: 1280, height: 800 });
    expect(mobile.width).toBeGreaterThan(mobile.height);
    expect(desktop.height).toBeGreaterThan(desktop.width);
  });

  it("clamps font scale preferences to supported tolerance", () => {
    expect(getResponsiveUiProfile({ width: 390, height: 844 }, 1.5).fontScale).toBe(1.25);
    expect(getResponsiveUiProfile({ width: 1280, height: 800 }, 0.5).fontScale).toBe(0.875);
  });
});
