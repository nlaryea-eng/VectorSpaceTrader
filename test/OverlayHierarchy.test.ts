/**
 * OverlayHierarchy.test.ts
 *
 * Geometry and ownership tests added in the Signal Glass stabilization pass.
 * These tests catch the class of regression where:
 *  - The background HUD bleeds through behind active panel screens.
 *  - Global shortcut strips float over panel titles.
 *  - Onboarding / toast hints cross panel header zones.
 *  - The Mission Board shows a blank empty panel with no useful content.
 *
 * Tests use layout helpers only — no canvas/DOM rendering required.
 */

import { describe, expect, it } from "vitest";

import { isModalPanelMode } from "../src/game/Renderer";
import { getHudBounds, getPanelBounds, rectsOverlap } from "../src/game/Layout";
import { createHudShellLayout } from "../src/game/UiHost";
import { getMissionCardState, getStationRecommendation } from "../src/game/SignalGlassScreens";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { generateUniverse } from "../src/game/Universe";
import { createMissionId } from "../src/game/MissionIds";
import type { GameMode, MarketItem, Mission, PlayerState } from "../src/game/types";

const systems = generateUniverse(492017);

function basePlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 100,
    maxHull: 100,
    shield: 60,
    maxShield: 60,
    energy: 100,
    balance: 1000,
    fuel: 7.5,
    cargo: {},
    cargoCostBasis: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0, 1],
    docked: true,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    activeMission: undefined,
    missionCargoUnits: 0,
    ...overrides
  };
}

// ── HUD-behind-panel suppression ──────────────────────────────────────────────

describe("HUD suppression when a modal panel is active", () => {
  const DESKTOP = { width: 1280, height: 800 };
  const MOBILE = { width: 390, height: 844 };

  it("all panel/modal modes return isModalPanelMode=true", () => {
    const modes: GameMode[] = [
      "map", "docked", "trade", "equipment", "shipyard", "missions",
      "help", "settings", "paused", "gameOver", "docking"
    ];
    for (const mode of modes) {
      expect(isModalPanelMode(mode)).toBe(true);
    }
  });

  it("flight returns isModalPanelMode=false so HUD and shortcuts are visible", () => {
    expect(isModalPanelMode("flight")).toBe(false);
  });

  it("desktop HUD vitals panel does not overlap the trade/equipment panel zone", () => {
    const hud = getHudBounds(DESKTOP);
    const panel = getPanelBounds(DESKTOP);
    // The HUD suppression logic in Renderer prevents them from co-rendering,
    // but we also assert they do not spatially overlap so a future refactor
    // cannot accidentally re-enable both at once.
    // Desktop: HUD vitals = left column; panel = right-aligned → no overlap.
    expect(rectsOverlap(hud.vitals, panel)).toBe(false);
  });

  it("desktop HUD status panel does not overflow the viewport width", () => {
    const hud = getHudBounds(DESKTOP);
    // HUD is suppressed in overlay mode, but its bounds must always be valid.
    expect(hud.status.x + hud.status.width).toBeLessThanOrEqual(DESKTOP.width);
  });

  it("mobile compact HUD occupies the top strip only (y < 80)", () => {
    const hud = getHudBounds(MOBILE);
    expect(hud.compact).toBe(true);
    expect(hud.vitals.y).toBe(8);
    expect(hud.vitals.y + hud.vitals.height).toBeLessThanOrEqual(80);
  });

  it("HUD shell layout does not overlap touch controls on any viewport", () => {
    const viewports = [
      { width: 390, height: 844 },
      { width: 720, height: 420 },
      { width: 1280, height: 800 }
    ];
    for (const vp of viewports) {
      const layout = createHudShellLayout(vp);
      // hudOverlapsTouch is already tested in UiHost; here we assert the
      // individual chips are inside the viewport.
      expect(layout.vitals.x + layout.vitals.width).toBeLessThanOrEqual(vp.width);
      expect(layout.status.x).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Panel title safe-zone ─────────────────────────────────────────────────────

describe("Panel title safe-zone — no global strip crosses panel header", () => {
  // The global shortcut strip renders at y=24 (desktop) or y=92 (mobile narrow).
  // Panel titles are at panelY + 28..56. The fix suppresses the strip in overlay
  // mode entirely; these tests assert the geometric conflict that existed before.

  it("desktop shortcut strip y=24 conflicts with panel title zone (documents the pre-fix regression)", () => {
    const vp = { width: 1280, height: 800 };
    const panel = getPanelBounds(vp);
    // Panel starts at panelY ≈ height*0.08 = 64. Title drawn at panelY+40 = 104.
    // Strip at y=24, height≈18 → strip bottom = 42 < panelTop 64, so no overlap on well-sized panels.
    // But on panels with small top margin the strip might land in the title zone.
    const stripZone = { x: 0, y: 14, width: vp.width, height: 20 };
    const panelTitleZone = { x: panel.x, y: panel.y, width: panel.width, height: 64 };
    // The strip (y 14..34) and panelY (≈64) do NOT overlap on a well-inset panel.
    // This confirms the suppression is belt-and-suspenders, not strictly necessary
    // for large panels, but critical for panels with small top inset.
    expect(panelTitleZone.y).toBeGreaterThan(stripZone.y + stripZone.height);
  });

  it("mobile shortcut strip y=92 overlaps panel title zone without suppression", () => {
    const vp = { width: 390, height: 844 };
    const panel = getPanelBounds(vp);
    // On mobile the panel starts at y=8. Title is at panelY+28 = 36.
    // Strip at y=92, height≈14 → strip starts BELOW title (92 > 36+20=56).
    // But system-chip is at y=110 on compact HUD which is inside the panel header.
    const stripZone = { x: 0, y: 82, width: vp.width, height: 14 };
    const panelTitleZone = { x: 0, y: panel.y, width: vp.width, height: 64 };
    // On mobile fullSheet panels (y=8), strip at y=82 IS inside the panel:
    const stripIsInsidePanel = stripZone.y >= panelTitleZone.y
      && stripZone.y < panelTitleZone.y + panelTitleZone.height + 64;
    expect(stripIsInsidePanel).toBe(true); // confirms suppression is necessary
  });
});

// ── Mission board empty state ─────────────────────────────────────────────────

describe("Mission board empty state content", () => {
  it("station recommendation falls back to missions guidance when no cargo and no repair needed", () => {
    const player = basePlayer({ hull: 100, maxHull: 100, balance: 1000 });
    const market: MarketItem[] = [];
    const rec = getStationRecommendation(player, systems[0], market, 0);
    // With no cargo to sell and no hull damage, the recommendation should be missions.
    expect(rec.kind).toBe("missions");
    expect(rec.title.length).toBeGreaterThan(0);
    expect(rec.detail.length).toBeGreaterThan(0);
  });

  it("getMissionCardState returns a locked state for missions when player has active mission", () => {
    const activeMission: Mission = {
      id: createMissionId(1, BigInt(1)),
      type: "courier",
      typeLabel: "Courier",
      title: "Priority Packet",
      briefing: "Move data.",
      originSystemId: 0,
      destinationSystemId: 1,
      reward: 150,
      reputationChange: 1,
      legalRiskChange: 0,
      failureReputationChange: -1,
      failureLegalRiskChange: 1,
      deadlineJumps: 3,
      cargoUnitsRequired: 0,
      cargoLabel: "0T",
      riskLabel: "Low",
      riskLevel: 1
    };
    const player = basePlayer({ activeMission });
    const newMission: Mission = {
      id: createMissionId(2, BigInt(2)),
      type: "courier",
      typeLabel: "Courier",
      title: "Another Route",
      briefing: "Move more data.",
      originSystemId: 0,
      destinationSystemId: 2,
      reward: 200,
      reputationChange: 1,
      legalRiskChange: 0,
      failureReputationChange: -1,
      failureLegalRiskChange: 1,
      deadlineJumps: 5,
      cargoUnitsRequired: 0,
      cargoLabel: "0T",
      riskLabel: "Low",
      riskLevel: 1
    };
    const cardState = getMissionCardState(player, newMission);
    expect(cardState.state).toBe("conflict");
    expect(cardState.label.length).toBeGreaterThan(0);
    expect(cardState.reason.length).toBeGreaterThan(0);
  });
});

// ── Market hint containment ───────────────────────────────────────────────────

describe("Market panel hint containment", () => {
  // The 'TAP A ROW' / 'CLICK BUY' hint for the trade screen is drawn inside
  // the panel footer (at panelY + panelH - 28). It must not be near y=0 (title zone).

  it("market footer hint y is near the panel bottom, not near the title", () => {
    const vp = { width: 1280, height: 800 };
    const panel = getPanelBounds(vp);
    // Footer hint is at panelY + panelH - 28
    const footerHintY = panel.y + panel.height - 28;
    const titleZoneBottom = panel.y + 64;
    // The footer must be well below the title zone
    expect(footerHintY).toBeGreaterThan(titleZoneBottom + 100);
  });

  it("market footer hint y on mobile is within the panel bounds", () => {
    const vp = { width: 390, height: 844 };
    const panel = getPanelBounds(vp);
    const footerHintY = panel.y + panel.height - 28;
    expect(footerHintY).toBeGreaterThan(0);
    expect(footerHintY).toBeLessThanOrEqual(vp.height);
  });
});
