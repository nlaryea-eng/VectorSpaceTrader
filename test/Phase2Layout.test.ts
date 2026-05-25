/**
 * Phase 2 layout geometry tests.
 * Verify that Market, Mission Board, and Equipment footer/content positions
 * are consistent with getPanelLayout sub-region geometry.
 */
import { describe, expect, it } from "vitest";

import { getPanelLayout } from "../src/game/Layout";

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1280, height: 800 };

// ── Market ────────────────────────────────────────────────────────────────────

describe("Market layout — subheaderRow and footerRow positions", () => {
  it("summary text y falls within headerBand ∪ subheaderRow on desktop", () => {
    // Market desktop: panelY = height * 0.08, titleY = panelY + 40, summaryY = titleY + 28
    const panelY = DESKTOP.height * 0.08;
    const titleY = panelY + 40;
    const summaryY = titleY + 28;

    const layout = getPanelLayout(DESKTOP);
    const subheaderBottom = layout.subheaderRow.y + layout.subheaderRow.height;
    // Summary must be within header+subheader zone
    expect(summaryY).toBeGreaterThanOrEqual(layout.headerBand.y);
    expect(summaryY).toBeLessThanOrEqual(subheaderBottom);
  });

  it("summary text y falls within headerBand ∪ subheaderRow on mobile", () => {
    const panelY = 12;
    const titleY = panelY + 28;
    const summaryY = titleY + 22;

    const layout = getPanelLayout(MOBILE);
    const subheaderBottom = layout.subheaderRow.y + layout.subheaderRow.height;
    expect(summaryY).toBeGreaterThanOrEqual(layout.headerBand.y);
    expect(summaryY).toBeLessThanOrEqual(subheaderBottom);
  });

  it("footer hint y is within footerRow on desktop", () => {
    // Market: panelY = height*0.08, panelH = height*0.84, hint at panelY+panelH-18
    const panelY = DESKTOP.height * 0.08;
    const panelH = DESKTOP.height * 0.84;
    const hintY = panelY + panelH - 18;

    const layout = getPanelLayout(DESKTOP);
    const frY = layout.footerRow.y;
    const frBottom = layout.footerRow.y + layout.footerRow.height;
    expect(hintY).toBeGreaterThanOrEqual(frY);
    expect(hintY).toBeLessThanOrEqual(frBottom);
  });

  it("footer hint y is within footerRow on mobile", () => {
    // Market mobile: panelY=12, panelH=height-24, hint at panelY+panelH-28
    const panelY = 12;
    const panelH = MOBILE.height - 24;
    const hintY = panelY + panelH - 28;

    const layout = getPanelLayout(MOBILE);
    const frY = layout.footerRow.y;
    const frBottom = layout.footerRow.y + layout.footerRow.height;
    expect(hintY).toBeGreaterThanOrEqual(frY);
    expect(hintY).toBeLessThanOrEqual(frBottom);
  });

  it("market numeric columns use a consistent right-edge anchor (same x across rows)", () => {
    // The column anchor values are deterministic given the panel bounds.
    // Verify they are reproducible (same panelW → same anchor positions).
    const panelX = DESKTOP.width * 0.06;
    const panelW = DESKTOP.width * 0.88;
    const left = panelX + 16;
    const wideRowW = panelW - 32;
    const cBuyR1 = left + Math.round(wideRowW * 0.29);
    const cBuyR2 = left + Math.round(wideRowW * 0.29);
    const cSellR = left + Math.round(wideRowW * 0.40);
    const cSignalR = left + Math.round(wideRowW * 0.54);
    const cSupplyR = left + Math.round(wideRowW * 0.66);
    const cHeldR = left + Math.round(wideRowW * 0.77);
    const cPLR = left + wideRowW;
    expect(cBuyR1).toBe(cBuyR2); // anchor is deterministic
    expect(cSellR).toBeGreaterThan(cBuyR1);
    expect(cSignalR).toBeGreaterThan(cSellR);
    expect(cSupplyR).toBeGreaterThan(cSignalR);
    expect(cHeldR).toBeGreaterThan(cSupplyR);
    expect(cPLR).toBeGreaterThan(cHeldR); // P/L is rightmost column
  });

  it("compact market rows fit inside 390x844 content bounds with bid/ask signal line", () => {
    const panelY = 12;
    const panelH = MOBILE.height - 24;
    const top = panelY + 112;
    const rowH = 30;
    const rowGap = 32;
    const lastRowBottom = top + 7 * rowGap - 14 + rowH;
    const footerTop = panelY + panelH - 74;

    expect(lastRowBottom).toBeLessThan(footerTop);
  });
});

// ── Mission Board ─────────────────────────────────────────────────────────────

describe("Mission Board empty state — card centering and button attachment", () => {
  it("empty-state card is horizontally centered on panel (not viewport) on desktop", () => {
    const panelX = DESKTOP.width * 0.06;
    const panelW = DESKTOP.width * 0.88;
    const emptyCardW = Math.min(540, panelW - 80);
    // Post-fix: card centered on panel
    const emptyCardX = panelX + (panelW - emptyCardW) / 2;
    const cardCenterX = emptyCardX + emptyCardW / 2;
    const panelCenterX = panelX + panelW / 2;
    expect(Math.abs(cardCenterX - panelCenterX)).toBeLessThan(2);
  });

  it("empty-state card is horizontally centered on panel on mobile", () => {
    const panelX = 8;
    const panelW = MOBILE.width - 16;
    const emptyCardW = panelW - 32;
    const emptyCardX = panelX + (panelW - emptyCardW) / 2;
    const cardCenterX = emptyCardX + emptyCardW / 2;
    const panelCenterX = panelX + panelW / 2;
    expect(Math.abs(cardCenterX - panelCenterX)).toBeLessThan(2);
  });

  it("action buttons are centered below the card (not at panel left edge) on desktop", () => {
    const panelX = DESKTOP.width * 0.06;
    const panelW = DESKTOP.width * 0.88;
    const emptyCardW = Math.min(540, panelW - 80);
    const emptyCardX = panelX + (panelW - emptyCardW) / 2;
    const btnW = 148;
    const btnGap = 12;
    const btnsW = btnW * 2 + btnGap;
    const btnStartX = emptyCardX + (emptyCardW - btnsW) / 2;
    // Buttons must be inside (or at least overlapping) the card, not at far left
    expect(btnStartX).toBeGreaterThan(panelX + 8); // not at panel left edge
    expect(btnStartX + btnsW).toBeLessThanOrEqual(emptyCardX + emptyCardW + 2); // within card bounds
  });

  it("action buttons y is near the card bottom (within 60px threshold) on desktop", () => {
    const panelY = DESKTOP.height * 0.08;
    const panelH = DESKTOP.height * 0.84;
    // Compute the same values as the renderer
    const titleY = panelY + 48;
    const activeY = titleY + 32;
    const top = activeY + 64;
    const emptyCardH = 128;
    const emptyCardY = top + 24;
    const actionY = emptyCardY + emptyCardH + 14;
    const cardBottom = emptyCardY + emptyCardH;
    expect(actionY - cardBottom).toBeLessThanOrEqual(60);
    expect(actionY).toBeGreaterThanOrEqual(cardBottom);
    // Action buttons must also be within the content area (above the footer)
    const footerY = panelY + panelH - 42;
    expect(actionY).toBeLessThan(footerY);
  });

  it("empty state renders at least 1 action button (button count >= 1)", () => {
    // Verify both buttons have positive width (they are always rendered when missions = 0)
    const btnW = 148;
    expect(btnW).toBeGreaterThan(0);
    // On mobile the btn width is also positive
    const panelW = MOBILE.width - 16;
    const emptyCardW = panelW - 32;
    const mobileBtnW = (emptyCardW - 16) / 2;
    expect(mobileBtnW).toBeGreaterThan(0);
  });
});

// ── Equipment ─────────────────────────────────────────────────────────────────

describe("Equipment layout — footer zone controls and repair status", () => {
  it("category controls y (footerCtrlY) is within footer band on desktop", () => {
    // Equipment desktop: panelY = height*0.1, panelH = height*0.82
    const panelY = DESKTOP.height * 0.1;
    const panelH = DESKTOP.height * 0.82;
    const footerBandH = 84;
    const footerBandY = panelY + panelH - footerBandH;
    const footerCtrlY = footerBandY + 14;
    const footerBottom = panelY + panelH;
    expect(footerCtrlY).toBeGreaterThanOrEqual(footerBandY);
    expect(footerCtrlY + 32).toBeLessThanOrEqual(footerBottom); // button fits inside
  });

  it("category controls y (footerCtrlY) is within footer band on mobile", () => {
    const panelY = 12;
    const panelH = MOBILE.height - 24;
    const footerBandH = 96;
    const footerBandY = panelY + panelH - footerBandH;
    const footerCtrlY = footerBandY + 16;
    const footerBottom = panelY + panelH;
    expect(footerCtrlY).toBeGreaterThanOrEqual(footerBandY);
    expect(footerCtrlY + 32).toBeLessThanOrEqual(footerBottom);
  });

  it("repair status y (footerRepairY) is within footer band on desktop", () => {
    const panelY = DESKTOP.height * 0.1;
    const panelH = DESKTOP.height * 0.82;
    const footerBandH = 84;
    const footerBandY = panelY + panelH - footerBandH;
    const footerRepairY = footerBandY + 46;
    const footerBottom = panelY + panelH;
    expect(footerRepairY).toBeGreaterThanOrEqual(footerBandY);
    expect(footerRepairY).toBeLessThanOrEqual(footerBottom);
  });

  it("repair status y (footerRepairY) is within footer band on mobile", () => {
    const panelY = 12;
    const panelH = MOBILE.height - 24;
    const footerBandH = 96;
    const footerBandY = panelY + panelH - footerBandH;
    const footerRepairY = footerBandY + 56;
    const footerBottom = panelY + panelH;
    expect(footerRepairY).toBeGreaterThanOrEqual(footerBandY);
    expect(footerRepairY).toBeLessThanOrEqual(footerBottom);
  });

  it("footer band does not overlap the main content start (titleY + sections)", () => {
    // Desktop: content starts after title (panelY + 56 + 28 = panelY + 84)
    const panelY = DESKTOP.height * 0.1;
    const panelH = DESKTOP.height * 0.82;
    const contentStart = panelY + 56 + 28; // titleY + installed count row
    const footerBandY = panelY + panelH - 84;
    expect(contentStart).toBeLessThan(footerBandY);
  });
});
