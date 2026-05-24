import { describe, expect, it } from "vitest";

import { getCompactTouchControlRects, getOnboardingHintY } from "../src/game/Renderer";
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
