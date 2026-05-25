import { describe, expect, it } from "vitest";

import { getPanelLayout, rectsOverlap } from "../src/game/Layout";
import type { SubRect } from "../src/game/Layout";

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

function withinBounds(region: SubRect, outer: SubRect): boolean {
  return region.x >= outer.x
    && region.y >= outer.y
    && region.x + region.width <= outer.x + outer.width
    && region.y + region.height <= outer.y + outer.height;
}

describe("getPanelLayout — sub-region geometry", () => {
  for (const [label, vp] of [["mobile 390x844", MOBILE], ["desktop 1280x800", DESKTOP]] as const) {
    it(`all sub-regions have positive dimensions on ${label}`, () => {
      const layout = getPanelLayout(vp);
      expect(layout.headerBand.height).toBeGreaterThan(0);
      expect(layout.subheaderRow.height).toBeGreaterThan(0);
      expect(layout.contentBounds.height).toBeGreaterThan(0);
      expect(layout.footerRow.height).toBeGreaterThan(0);
      expect(layout.emptyStateArea.height).toBeGreaterThan(0);
    });

    it(`sub-regions are within panelBounds on ${label}`, () => {
      const layout = getPanelLayout(vp);
      const pb = layout.panelBounds;
      const panelRect: SubRect = { x: pb.x, y: pb.y, width: pb.width, height: pb.height };
      expect(withinBounds(layout.headerBand, panelRect)).toBe(true);
      expect(withinBounds(layout.subheaderRow, panelRect)).toBe(true);
      expect(withinBounds(layout.contentBounds, panelRect)).toBe(true);
      expect(withinBounds(layout.footerRow, panelRect)).toBe(true);
    });

    it(`headerBand, subheaderRow, contentBounds, footerRow do not overlap on ${label}`, () => {
      const layout = getPanelLayout(vp);
      const { headerBand, subheaderRow, contentBounds, footerRow } = layout;
      expect(rectsOverlap(headerBand, subheaderRow)).toBe(false);
      expect(rectsOverlap(headerBand, contentBounds)).toBe(false);
      expect(rectsOverlap(headerBand, footerRow)).toBe(false);
      expect(rectsOverlap(subheaderRow, contentBounds)).toBe(false);
      expect(rectsOverlap(subheaderRow, footerRow)).toBe(false);
      expect(rectsOverlap(contentBounds, footerRow)).toBe(false);
    });

    it(`contentBounds.height / panelBounds.height >= 0.55 on ${label}`, () => {
      const layout = getPanelLayout(vp);
      const ratio = layout.contentBounds.height / layout.panelBounds.height;
      expect(ratio).toBeGreaterThanOrEqual(0.55);
    });
  }

  it("content utilization >= 0.55 holds for wider preferred panels (market/missions/equipment)", () => {
    for (const preferredWidth of [600, 640, 720]) {
      const mobileLayout = getPanelLayout(MOBILE, preferredWidth);
      const desktopLayout = getPanelLayout(DESKTOP, preferredWidth);
      expect(mobileLayout.contentBounds.height / mobileLayout.panelBounds.height).toBeGreaterThanOrEqual(0.55);
      expect(desktopLayout.contentBounds.height / desktopLayout.panelBounds.height).toBeGreaterThanOrEqual(0.55);
    }
  });
});

describe("getPanelLayout — emptyStateArea geometry", () => {
  it("emptyStateArea is horizontally centered within contentBounds on mobile", () => {
    const layout = getPanelLayout(MOBILE);
    const { emptyStateArea, contentBounds } = layout;
    const panelCenterX = contentBounds.x + contentBounds.width / 2;
    const emptyCenterX = emptyStateArea.x + emptyStateArea.width / 2;
    expect(Math.abs(emptyCenterX - panelCenterX)).toBeLessThan(2);
  });

  it("emptyStateArea is horizontally centered within contentBounds on desktop", () => {
    const layout = getPanelLayout(DESKTOP);
    const { emptyStateArea, contentBounds } = layout;
    const panelCenterX = contentBounds.x + contentBounds.width / 2;
    const emptyCenterX = emptyStateArea.x + emptyStateArea.width / 2;
    expect(Math.abs(emptyCenterX - panelCenterX)).toBeLessThan(2);
  });

  it("emptyStateArea y is within contentBounds on both viewports", () => {
    for (const vp of [MOBILE, DESKTOP]) {
      const layout = getPanelLayout(vp);
      const { emptyStateArea, contentBounds } = layout;
      expect(emptyStateArea.y).toBeGreaterThanOrEqual(contentBounds.y);
      expect(emptyStateArea.y + emptyStateArea.height).toBeLessThanOrEqual(
        contentBounds.y + contentBounds.height
      );
    }
  });
});

describe("getPanelLayout — structural ordering", () => {
  it("regions are stacked top-to-bottom in logical order on desktop", () => {
    const layout = getPanelLayout(DESKTOP);
    const { headerBand, subheaderRow, contentBounds, footerRow } = layout;
    expect(headerBand.y + headerBand.height).toBeLessThanOrEqual(subheaderRow.y);
    expect(subheaderRow.y + subheaderRow.height).toBeLessThanOrEqual(contentBounds.y);
    expect(contentBounds.y + contentBounds.height).toBeLessThanOrEqual(footerRow.y);
  });

  it("regions are stacked top-to-bottom in logical order on mobile", () => {
    const layout = getPanelLayout(MOBILE);
    const { headerBand, subheaderRow, contentBounds, footerRow } = layout;
    expect(headerBand.y + headerBand.height).toBeLessThanOrEqual(subheaderRow.y);
    expect(subheaderRow.y + subheaderRow.height).toBeLessThanOrEqual(contentBounds.y);
    expect(contentBounds.y + contentBounds.height).toBeLessThanOrEqual(footerRow.y);
  });
});
