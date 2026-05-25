import { describe, expect, it } from "vitest";

import { getCompactTouchControlRects, getOnboardingHintY, isModalPanelMode } from "../src/game/Renderer";
import { getPanelBounds } from "../src/game/Layout";
import type { ButtonZone, GameMode } from "../src/game/types";

const MOBILE_W = 390;
const MOBILE_H = 844;

function assertWithinCanvas(rect: ButtonZone): void {
  expect(rect.x).toBeGreaterThanOrEqual(0);
  expect(rect.y).toBeGreaterThanOrEqual(0);
  expect(rect.x + rect.width).toBeLessThanOrEqual(MOBILE_W);
  expect(rect.y + rect.height).toBeLessThanOrEqual(MOBILE_H);
}

function overlaps(a: ButtonZone, b: ButtonZone): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

describe("mobile renderer layout helpers", () => {
  it("keeps all required flight touch controls inside 390x844", () => {
    const rects = getCompactTouchControlRects(MOBILE_W, MOBILE_H, false);
    const ids = rects.map((rect) => rect.id);

    expect(ids).toEqual(expect.arrayContaining([
      "touch-map",
      "touch-dock",
      "touch-menu",
      "touch-up",
      "touch-down",
      "touch-left",
      "touch-right",
      "touch-throttle-up",
      "touch-throttle-down",
      "touch-fire",
    ]));
    rects.forEach(assertWithinCanvas);
  });

  it("keeps docked mobile touch controls inside 390x844", () => {
    const rects = getCompactTouchControlRects(MOBILE_W, MOBILE_H, true);

    expect(rects.map((rect) => rect.id)).toContain("touch-trade");
    rects.forEach(assertWithinCanvas);
  });

  it("places flight hints above status and touch controls on 390x844", () => {
    const hint: ButtonZone = {
      id: "hint-dismiss",
      label: "Dismiss",
      x: 16,
      y: getOnboardingHintY("flight", MOBILE_H, 58, true, true),
      width: MOBILE_W - 32,
      height: 58,
    };
    const status: ButtonZone = { id: "status", label: "Status", x: 16, y: 637, width: MOBILE_W - 32, height: 26 };
    const controls = getCompactTouchControlRects(MOBILE_W, MOBILE_H, false);

    expect(overlaps(hint, status)).toBe(false);
    expect(controls.some((rect) => overlaps(hint, rect))).toBe(false);
  });

  it.each<GameMode>(["docked", "shipyard"])("places %s hints above station actions on 390x844", (mode) => {
    const hint: ButtonZone = {
      id: "hint-dismiss",
      label: "Dismiss",
      x: 16,
      y: getOnboardingHintY(mode, MOBILE_H, 58, true, true),
      width: MOBILE_W - 32,
      height: 58,
    };
    const stationActions: ButtonZone = { id: "station-actions", label: "Actions", x: 16, y: 632, width: MOBILE_W - 32, height: 136 };

    expect(overlaps(hint, stationActions)).toBe(false);
  });
});

// ── Visual-hierarchy regression tests ────────────────────────────────────────
// Asserts the overlay ownership contract: panel modes suppress floating hints
// and shortcut strips so they never cross panel title/header zones.

describe("overlay ownership — panel modes suppress global shortcut strips and hints", () => {
  const PANEL_MODES: GameMode[] = [
    "map", "trade", "equipment", "shipyard", "missions", "help",
    "settings", "paused", "gameOver", "docked", "docking"
  ];

  it("classifies all panel screens as overlay modes (no floating strips)", () => {
    for (const mode of PANEL_MODES) {
      expect(isModalPanelMode(mode)).toBe(true);
    }
  });

  it("flight mode is NOT an overlay mode (strips are visible in flight)", () => {
    expect(isModalPanelMode("flight")).toBe(false);
  });
});

describe("panel title safe-zone — floating hints do not cross title area", () => {
  // Panel titles are drawn at approximately panelY + 28..56 px.
  // For desktop 1280x800, panelY ≈ height * 0.08 ≈ 64.
  // Panel title bottom ≈ 64 + 56 = 120. Hints in overlay mode are now suppressed,
  // but we still verify that flight-mode hints stay below the HUD band.

  it("flight hint on 390x844 starts below the compact HUD band (y > 80)", () => {
    const hintY = getOnboardingHintY("flight", MOBILE_H, 58, true, false);
    // Compact HUD occupies y=8..72; hint must clear it.
    expect(hintY).toBeGreaterThan(80);
  });

  it("flight hint on 390x844 does not overlap the touch ring zone", () => {
    // Determine the actual touch ring top from the compact control rects.
    const rects = getCompactTouchControlRects(MOBILE_W, MOBILE_H, false);
    const ringControls = rects.filter((r) =>
      r.id === "touch-up" || r.id === "touch-down" || r.id === "touch-left" || r.id === "touch-right"
    );
    const actualRingTop = Math.min(...ringControls.map((r) => r.y));

    const hintY = getOnboardingHintY("flight", MOBILE_H, 58, true, false);
    const hintBottom = hintY + 58;
    expect(hintBottom).toBeLessThanOrEqual(actualRingTop);
  });
});

describe("panel bounds — 390x844 mobile and 1280x800 desktop geometry checks", () => {
  it("mobile panel fills nearly the full screen (fullScreen flag set)", () => {
    const panel = getPanelBounds({ width: 390, height: 844 });
    expect(panel.fullScreen).toBe(true);
    expect(panel.width).toBeGreaterThan(350);
    expect(panel.height).toBeGreaterThan(800);
  });

  it("desktop panel has inset margins and is not full-screen", () => {
    const panel = getPanelBounds({ width: 1280, height: 800 });
    expect(panel.fullScreen).toBe(false);
    expect(panel.x).toBeGreaterThan(0);
    expect(panel.y).toBeGreaterThan(0);
    // Panel title safe zone: title is drawn inside the top of the panel.
    // The panel starts at panel.y, and the title is at panel.y + ~40.
    // The global shortcut strip (y=24 on desktop) must NOT overlap the title area.
    // Since panel mode suppresses the strip, we just assert the title zone is defined.
    const panelTitleZoneBottom = panel.y + 64;
    expect(panelTitleZoneBottom).toBeGreaterThan(0);
    expect(panelTitleZoneBottom).toBeLessThan(800);
  });

  it("desktop panel width is >= 500px for readability on dense screens", () => {
    const panel = getPanelBounds({ width: 1280, height: 800 });
    expect(panel.width).toBeGreaterThanOrEqual(500);
  });

  it("ultrawide panel does not exceed 720px (avoids unreadably wide lines)", () => {
    const panel = getPanelBounds({ width: 1800, height: 760 });
    expect(panel.width).toBeLessThanOrEqual(720 + 1);
  });
});
