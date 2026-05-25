/**
 * Phase 3 layout geometry tests.
 * Verifies Station Hub zone structure and Flight HUD top-capsule constraints.
 */
import { describe, expect, it } from "vitest";

import { getStationHubZones, rectsOverlap } from "../src/game/Layout";
import { createHudShellLayout, hudOverlapsTouch } from "../src/game/UiHost";

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

// ── Station Hub ───────────────────────────────────────────────────────────────

describe("Station Hub zones — non-overlapping and gap constraint", () => {
  for (const [label, vp] of [["mobile 390x844", MOBILE], ["desktop 1280x800", DESKTOP]] as const) {
    it(`all four zones are non-overlapping on ${label}`, () => {
      const zones = getStationHubZones(vp);
      const { identity, pilotSummary, recommendation, serviceActions } = zones;
      expect(rectsOverlap(identity, recommendation)).toBe(false);
      expect(rectsOverlap(identity, serviceActions)).toBe(false);
      expect(rectsOverlap(pilotSummary, recommendation)).toBe(false);
      expect(rectsOverlap(pilotSummary, serviceActions)).toBe(false);
      expect(rectsOverlap(recommendation, serviceActions)).toBe(false);
    });

    it(`all four zones have positive height on ${label}`, () => {
      const zones = getStationHubZones(vp);
      expect(zones.identity.height).toBeGreaterThan(0);
      expect(zones.pilotSummary.height).toBeGreaterThan(0);
      expect(zones.recommendation.height).toBeGreaterThan(0);
      expect(zones.serviceActions.height).toBeGreaterThan(0);
    });
  }

  it("recommendation bottom is within 24px of serviceActions top on desktop", () => {
    const zones = getStationHubZones(DESKTOP);
    const recBottom = zones.recommendation.y + zones.recommendation.height;
    const gap = zones.serviceActions.y - recBottom;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(24);
  });

  it("recommendation bottom is within 16px of serviceActions top on mobile", () => {
    const zones = getStationHubZones(MOBILE);
    const recBottom = zones.recommendation.y + zones.recommendation.height;
    const gap = zones.serviceActions.y - recBottom;
    expect(gap).toBeGreaterThanOrEqual(0);
    expect(gap).toBeLessThanOrEqual(16);
  });

  it("service actions zone is in the lower portion of the panel on desktop", () => {
    const zones = getStationHubZones(DESKTOP);
    const panelBottom = DESKTOP.height * 0.1 + DESKTOP.height * 0.68;
    expect(zones.serviceActions.y).toBeLessThan(panelBottom);
    expect(zones.serviceActions.y + zones.serviceActions.height).toBeLessThanOrEqual(panelBottom + 1);
  });

  it("identity zone starts at the panel top on both viewports", () => {
    const mobileZones = getStationHubZones(MOBILE);
    const desktopZones = getStationHubZones(DESKTOP);
    expect(mobileZones.identity.y).toBe(12); // panelY mobile
    expect(desktopZones.identity.y).toBe(DESKTOP.height * 0.1); // panelY desktop
  });
});

// ── Flight HUD top capsule ────────────────────────────────────────────────────

describe("Flight HUD — top capsule dimensions and non-overlap", () => {
  it("top capsule height is ≤ 48px on desktop", () => {
    const layout = createHudShellLayout(DESKTOP);
    expect(layout.topCapsule.height).toBeLessThanOrEqual(48);
  });

  it("top capsule height is ≤ 36px on mobile", () => {
    const layout = createHudShellLayout(MOBILE);
    expect(layout.topCapsule.height).toBeLessThanOrEqual(36);
  });

  it("top capsule has positive dimensions on both viewports", () => {
    for (const vp of [MOBILE, DESKTOP]) {
      const layout = createHudShellLayout(vp);
      expect(layout.topCapsule.width).toBeGreaterThan(0);
      expect(layout.topCapsule.height).toBeGreaterThan(0);
    }
  });

  it("top capsule does not overlap left vitals panel on desktop", () => {
    const layout = createHudShellLayout(DESKTOP);
    expect(rectsOverlap(layout.topCapsule, layout.vitals)).toBe(false);
  });

  it("top capsule does not overlap right status panel on desktop", () => {
    const layout = createHudShellLayout(DESKTOP);
    expect(rectsOverlap(layout.topCapsule, layout.status)).toBe(false);
  });

  it("top capsule does not overlap vitals on mobile (stacked vertically)", () => {
    const layout = createHudShellLayout(MOBILE);
    // On mobile vitals is at y=8,h=64; capsule is at y=110 — they must not overlap
    expect(rectsOverlap(layout.topCapsule, layout.vitals)).toBe(false);
  });

  it("top capsule does not overlap touch reserved zone on mobile", () => {
    const layout = createHudShellLayout(MOBILE);
    expect(rectsOverlap(layout.topCapsule, layout.touchReserved)).toBe(false);
  });

  it("hudOverlapsTouch returns false for all supported viewports", () => {
    for (const vp of [MOBILE, DESKTOP, { width: 1800, height: 760 }]) {
      const layout = createHudShellLayout(vp);
      expect(hudOverlapsTouch(layout)).toBe(false);
    }
  });

  it("top capsule is horizontally centered between vitals and status on desktop", () => {
    const layout = createHudShellLayout(DESKTOP);
    // Capsule must start after vitals right edge and end before status left edge
    expect(layout.topCapsule.x).toBeGreaterThan(layout.vitals.x + layout.vitals.width);
    expect(layout.topCapsule.x + layout.topCapsule.width).toBeLessThan(layout.status.x);
  });
});
