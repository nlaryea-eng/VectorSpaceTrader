import { describe, expect, it } from "vitest";

import {
  UI_LAYER_ORDER,
  createHudShellLayout,
  createPanelLayerBounds,
  createToastModel,
  getTopInteractiveLayer,
  hudOverlapsTouch,
  isLayerInteractive
} from "../src/game/UiHost";
import { isModalPanelMode } from "../src/game/Renderer";
import { getPanelBounds, rectsOverlap } from "../src/game/Layout";
import type { GameMode } from "../src/game/types";

describe("Signal Glass UI host", () => {
  it("keeps layer z-order stable", () => {
    const z = UI_LAYER_ORDER.map((layer) => layer.zIndex);
    expect(z).toEqual([...z].sort((a, b) => a - b));
  });

  it("selects only the topmost interactive layer", () => {
    expect(getTopInteractiveLayer("flight", false)).toBe("canvas");
    expect(getTopInteractiveLayer("flight", true)).toBe("touchControls");
    expect(getTopInteractiveLayer("trade", true)).toBe("panel");
    expect(getTopInteractiveLayer("help", true)).toBe("manual");
    expect(getTopInteractiveLayer("settings", true)).toBe("modal");
    expect(isLayerInteractive("hud", "flight", false)).toBe(false);
    expect(isLayerInteractive("panel", "missions", true)).toBe(true);
  });

  it("builds HUD layouts for mobile, desktop, and ultrawide without touch overlap", () => {
    for (const size of [
      { width: 390, height: 844 },
      { width: 1280, height: 800 },
      { width: 1800, height: 760 }
    ]) {
      const layout = createHudShellLayout(size);
      expect(layout.vitals.x).toBeGreaterThanOrEqual(0);
      expect(layout.status.x + layout.status.width).toBeLessThanOrEqual(size.width);
      expect(hudOverlapsTouch(layout)).toBe(false);
    }
  });

  it("creates panel bounds that stay inside the viewport", () => {
    const panel = createPanelLayerBounds({ width: 1280, height: 800 });
    expect(panel.x).toBeGreaterThanOrEqual(0);
    expect(panel.y).toBeGreaterThanOrEqual(0);
    expect(panel.x + panel.width).toBeLessThanOrEqual(1280);
    expect(panel.y + panel.height).toBeLessThanOrEqual(800);
  });

  it("models toasts as non-blocking notifications", () => {
    const toast = createToastModel("Transaction complete", { width: 1280, height: 800 });
    expect(toast?.tone).toBe("success");
    expect(toast?.bounds.x).toBeGreaterThan(0);
  });
});

// ── Overlay/layer ownership tests ─────────────────────────────────────────────
// These tests assert the deterministic layering contract introduced in the
// Signal Glass stabilization pass. They catch the class of regression where
// the HUD, shortcut strips, or floating hints bleed over active panel content.

describe("Modal panel mode classification", () => {
  const panelModes: GameMode[] = [
    "map", "docked", "trade", "equipment", "shipyard", "missions", "help",
    "settings", "paused", "gameOver", "docking"
  ];
  const flightModes: GameMode[] = ["flight"];

  it("classifies all panel/modal screens as overlay modes", () => {
    for (const mode of panelModes) {
      expect(isModalPanelMode(mode)).toBe(true);
    }
  });

  it("does not classify flight as an overlay mode", () => {
    for (const mode of flightModes) {
      expect(isModalPanelMode(mode)).toBe(false);
    }
  });
});

describe("Panel z-order and HUD suppression geometry", () => {
  const VIEWPORTS = [
    { label: "mobile 390x844", width: 390, height: 844 },
    { label: "desktop 1280x800", width: 1280, height: 800 },
    { label: "ultrawide 1800x760", width: 1800, height: 760 }
  ];

  it("panel bounds are inside viewport on all supported sizes", () => {
    for (const vp of VIEWPORTS) {
      const panel = getPanelBounds(vp);
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.y).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(vp.width + 1); // +1 for rounding
      expect(panel.y + panel.height).toBeLessThanOrEqual(vp.height + 1);
    }
  });

  it("HUD vitals panel does not overlap the modal panel zone on desktop", () => {
    const vp = { width: 1280, height: 800 };
    const hud = createHudShellLayout(vp);
    const panel = getPanelBounds(vp);
    // Desktop panels are right-aligned; HUD vitals are left-aligned — they must not overlap
    expect(rectsOverlap(hud.vitals, panel)).toBe(false);
  });

  it("HUD status panel does not overflow the viewport width on desktop", () => {
    const vp = { width: 1280, height: 800 };
    const hud = createHudShellLayout(vp);
    // Right-side HUD status panel must not exceed viewport width.
    // (HUD is suppressed in overlay mode, but its bounds must always be valid.)
    expect(hud.status.x + hud.status.width).toBeLessThanOrEqual(vp.width);
  });

  it("touch controls safe zone is in the bottom half on 390x844", () => {
    const vp = { width: 390, height: 844 };
    const hud = createHudShellLayout(vp);
    // On mobile, confirm touch reserved area is defined at bottom half of screen.
    expect(hud.touchReserved.y).toBeGreaterThan(vp.height / 2);
  });

  it("layer z-indices are monotonically increasing from canvas to toast", () => {
    const z = UI_LAYER_ORDER.map((layer) => layer.zIndex);
    for (let i = 1; i < z.length; i++) {
      expect(z[i]).toBeGreaterThan(z[i - 1]);
    }
  });

  it("panel z-index is higher than hud but lower than modal and toast", () => {
    const byId = Object.fromEntries(UI_LAYER_ORDER.map((l) => [l.id, l.zIndex]));
    expect(byId["panel"]).toBeGreaterThan(byId["hud"]);
    expect(byId["panel"]).toBeLessThan(byId["modal"]);
    expect(byId["panel"]).toBeLessThan(byId["toast"]);
  });
});
