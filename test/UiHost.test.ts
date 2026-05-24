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
