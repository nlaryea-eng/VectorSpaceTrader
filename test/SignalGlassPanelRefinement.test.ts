import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { Renderer, type RenderState } from "../src/game/Renderer";
import { getPanelChromeLayout, getScreenPanelBounds, rectsOverlap } from "../src/game/Layout";
import { createMissionId } from "../src/game/MissionIds";
import { SIGNAL_GLASS_TEXT_SIZES, THEME } from "../src/game/Theme";
import { generateUniverse } from "../src/game/Universe";
import type { ButtonZone, GameMode, Mission, PlayerState } from "../src/game/types";

const systems = generateUniverse(492017);

interface DrawnText {
  text: string;
  x: number;
  y: number;
  font: string;
  align: CanvasTextAlign;
  color: string;
}

interface RenderTrace {
  texts: DrawnText[];
  clips: Array<{ x: number; y: number; width: number; height: number }>;
}

function createStubCanvas(trace?: RenderTrace): HTMLCanvasElement {
  let pendingRect: { x: number; y: number; width: number; height: number } | null = null;
  const ctx = {
    font: "",
    textAlign: "left" as CanvasTextAlign,
    fillStyle: "" as string | CanvasGradient | CanvasPattern,
    strokeStyle: "" as string | CanvasGradient | CanvasPattern,
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: "",
    globalAlpha: 1,
    textBaseline: "middle" as CanvasTextBaseline,
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {},
    roundRect() {}, fill() {}, stroke() {},
    rect(x: number, y: number, width: number, height: number) { pendingRect = { x, y, width, height }; },
    clip() { if (pendingRect) trace?.clips.push(pendingRect); },
    fillText(text: string, x: number, y: number) {
      trace?.texts.push({ text: String(text), x, y, font: ctx.font, align: ctx.textAlign, color: String(ctx.fillStyle) });
    },
    measureText(text: string) { return { width: text.length * 7 }; },
    moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, setLineDash() {}, save() {}, restore() {},
    translate() {}, rotate() {}, closePath() {}, strokeRect() {}
  } as unknown as CanvasRenderingContext2D;
  return {
    getContext: () => ctx,
    width: 1280,
    height: 800,
    style: {},
    addEventListener() {},
    removeEventListener() {}
  } as unknown as HTMLCanvasElement;
}

function player(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 55,
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
    discoveredSystemIds: [0, 1, 2, 3, 4, 5],
    docked: true,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    missionCargoUnits: 0,
    ...overrides
  };
}

function mission(): Mission {
  return {
    id: createMissionId(4, BigInt(1)),
    type: "courier",
    typeLabel: "Courier",
    title: "Signal Packet",
    briefing: "Move a sealed packet.",
    originSystemId: 0,
    destinationSystemId: 1,
    reward: 120,
    reputationChange: 1,
    legalRiskChange: 0,
    failureReputationChange: -1,
    failureLegalRiskChange: 1,
    cargoUnitsRequired: 1,
    cargoLabel: "packet",
    deadlineJumps: 4,
    riskLabel: "low",
    riskLevel: 1
  };
}

function state(mode: GameMode, overrides: Partial<RenderState> = {}): RenderState {
  return {
    mode,
    player: player(),
    systems,
    selectedSystemId: 1,
    market: [{ id: "grain", name: "Grain", basePrice: 7, baseQuantity: 18, mass: 1, price: 9, quantity: 12 }],
    enemy: {
      id: "e", classId: "c", name: "Test", behavior: "direct",
      position: { x: 0, y: 0, z: 0 }, velocity: { x: 0, y: 0, z: 0 },
      orientation: { pitch: 0, yaw: 0, roll: 0 },
      radius: 1, hull: 1, maxHull: 1, shield: 0, maxShield: 0,
      damage: 0, fireCooldown: 1, turnSpeed: 0, thrust: 0, alive: true,
      wireframe: [], edges: []
    },
    projectiles: [],
    hasSave: false,
    messageLog: { entries: [], nextSeq: 0 },
    stationPosition: { x: 0, y: 0, z: 0 },
    dockingProgress: 0,
    phosphorGlow: true,
    audioMuted: false,
    missions: [mission()],
    economy: { day: 0, drift: {}, supplyAdjustments: {}, priceHistory: [] },
    mousePosition: null,
    playerHitFlash: 0,
    explosionEffect: null,
    previousPrices: {},
    runStats: {
      totalBalEarned: 0,
      jumpsCompleted: 0,
      systemsVisited: [],
      missionsCompleted: 0,
      missionsFailed: 0,
      enemiesDestroyed: 0,
      timePlayed: 0,
      causeOfDeath: "test"
    },
    meta: { hasSeenOnboarding: true, dismissedHints: [] },
    pilotRank: { tier: 0, title: "Cadet" },
    isNewPersonalBest: false,
    activeHint: null,
    mapFilters: { query: "", hazard: "all", economy: "all", government: "all", opportunity: "all", discovery: "all", service: "all", systemClass: "all" },
    sfxVolume: 0.7,
    musicVolume: 0.5,
    selectedShipId: "vaskRelay",
    equipmentPage: 0,
    equipmentCategoryFilter: "all",
    helpSectionId: "quickStart",
    helpPageIndex: 0,
    shipyardPage: 0,
    shipyardClassFilter: "all",
    showTouchControls: true,
    mapFilterSheetOpen: false,
    ...overrides
  };
}

function renderWithTrace(mode: GameMode, viewport = { width: 390, height: 844 }, overrides: Partial<RenderState> = {}): { buttons: ButtonZone[]; trace: RenderTrace } {
  vi.stubGlobal("window", {
    devicePixelRatio: 1,
    innerWidth: viewport.width,
    innerHeight: viewport.height,
    location: { search: "" },
    localStorage: { getItem: () => null },
    matchMedia: () => ({ matches: false }),
    addEventListener() {}
  });
  const trace: RenderTrace = { texts: [], clips: [] };
  const renderer = new Renderer(createStubCanvas(trace));
  renderer.resize();
  renderer.render(state(mode, overrides));
  return { buttons: renderer.getButtons(), trace };
}

function render(mode: GameMode, viewport = { width: 390, height: 844 }, overrides: Partial<RenderState> = {}): ButtonZone[] {
  return renderWithTrace(mode, viewport, overrides).buttons;
}

function byId(buttons: ButtonZone[], id: string): ButtonZone {
  const button = buttons.find((candidate) => candidate.id === id);
  expect(button, `missing ${id}`).toBeDefined();
  return button!;
}

function expectNoOverlap(a: ButtonZone, b: ButtonZone): void {
  expect(rectsOverlap(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
}

function fontSize(draw: DrawnText): number {
  const match = draw.font.match(/^(\d+(?:\.\d+)?)px\s/);
  return match ? Number(match[1]) : 0;
}

function drawnText(trace: RenderTrace): string {
  return trace.texts.map((entry) => entry.text).join("\n");
}

describe("Signal Glass panel refinement button zones", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it.each<GameMode>(["docked", "trade", "missions", "equipment", "shipyard", "map", "settings", "paused", "gameOver"])(
    "exposes Help on %s",
    (mode) => {
      expect(byId(render(mode), "help").label).toMatch(/HELP/i);
    }
  );

  it("removes the standalone Station Repair tile", () => {
    const buttons = render("docked");
    expect(buttons.some((button) => button.id === "touch-repair")).toBe(false);
    expect(buttons.some((button) => button.id === "touch-equipment")).toBe(true);
  });

  // Desktop: individual filter chips visible and non-overlapping.
  it("keeps map filter chips and header actions visible without overlap at 1280x800", () => {
    const viewport = { width: 1280, height: 800 };
    const buttons = render("map", viewport);
    const close = byId(buttons, "map-back");
    const help = byId(buttons, "help");
    const systemClass = byId(buttons, "map-filter-systemClass");
    const clear = byId(buttons, "map-filter-clear");
    expect(systemClass.label).toContain("CLASS");
    expect(clear.label).toBe("CLR");
    for (const button of [close, help, systemClass, clear]) {
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.y).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(viewport.width);
      expect(button.y + button.height).toBeLessThanOrEqual(viewport.height);
    }
    const filters = buttons.filter((candidate) => candidate.id.startsWith("map-filter-"));
    for (let i = 0; i < filters.length; i += 1) {
      expectNoOverlap(filters[i], close);
      expectNoOverlap(filters[i], help);
      for (let j = i + 1; j < filters.length; j += 1) {
        expectNoOverlap(filters[i], filters[j]);
      }
    }
  });

  // R3: compact map shows FILTERS toggle, not individual chips (sheet closed).
  it("R3: compact map shows FILTERS toggle button instead of individual chips (sheet closed)", () => {
    const buttons = render("map", { width: 390, height: 844 });
    const toggle = byId(buttons, "map-filters-toggle");
    expect(toggle.label).toBe("FILTERS");
    // Individual filter chips must NOT be present when sheet is closed.
    expect(buttons.some((b) => b.id.startsWith("map-filter-"))).toBe(false);
    expect(toggle.x).toBeGreaterThanOrEqual(0);
    expect(toggle.y).toBeGreaterThanOrEqual(0);
    expect(toggle.x + toggle.width).toBeLessThanOrEqual(390);
    expect(toggle.y + toggle.height).toBeLessThanOrEqual(844);
  });

  it("R3: FILTERS button label shows active count when filters are set", () => {
    const activeFilters = { ...state("map").mapFilters, hazard: "debris" as const, economy: "Mining" as const };
    const buttons = render("map", { width: 390, height: 844 }, { mapFilters: activeFilters });
    const toggle = byId(buttons, "map-filters-toggle");
    expect(toggle.label).toBe("FILTERS [2]");
  });

  it("R3: opening the filter sheet reveals all individual filter chips above the toggle row", () => {
    const viewport = { width: 390, height: 844 };
    const buttons = render("map", viewport, { mapFilterSheetOpen: true });
    // Individual chips must be present when sheet is open.
    expect(buttons.some((b) => b.id === "map-filter-systemClass")).toBe(true);
    expect(buttons.some((b) => b.id === "map-filter-clear")).toBe(true);
    const toggle = byId(buttons, "map-filters-toggle");
    expect(toggle.label).toBe("DONE");
    // All chips must be above the toggle row and within bounds.
    const chips = buttons.filter((b) => b.id.startsWith("map-filter-"));
    for (const chip of chips) {
      expect(chip.y + chip.height).toBeLessThanOrEqual(toggle.y);
      expect(chip.x).toBeGreaterThanOrEqual(0);
      expect(chip.x + chip.width).toBeLessThanOrEqual(viewport.width);
    }
  });

  it("clips map-only decorations to the plot rect", () => {
    const { trace } = renderWithTrace("map", { width: 390, height: 844 });
    expect(trace.clips.length).toBeGreaterThan(0);
    const plotClip = trace.clips[0];
    expect(plotClip.x).toBeGreaterThanOrEqual(0);
    expect(plotClip.y).toBeGreaterThan(100);
    expect(plotClip.x + plotClip.width).toBeLessThanOrEqual(390);
    expect(plotClip.y + plotClip.height).toBeLessThan(844);
  });

  it("keeps Equipment repair, category, page, and Help actions in separate bands", () => {
    const buttons = render("equipment", { width: 390, height: 844 }, { player: player({ hull: 50, balance: 200 }) });
    const repair = byId(buttons, "equip-repair");
    const category = byId(buttons, "equip-category-cycle");
    const next = buttons.find((button) => button.id === "equip-page-next");
    const help = byId(buttons, "help");
    expectNoOverlap(repair, category);
    if (next) expectNoOverlap(repair, next);
    expectNoOverlap(repair, help);
    expectNoOverlap(category, help);
  });

  it("shows compact hull-full affordance without a repair button or progress bar when fully repaired", () => {
    const { buttons, trace } = renderWithTrace("equipment", { width: 390, height: 844 }, { player: player({ hull: 100, maxHull: 100 }) });
    // R4: no repair button when hull is full.
    expect(buttons.some((button) => button.id === "equip-repair")).toBe(false);
    expect(buttons.some((button) => button.id === "equip-category-cycle")).toBe(true);
    // R4: compact one-line affordance replaces the old full-caps label.
    const status = trace.texts.find((entry) => entry.text === "Hull fully operational · Repair available here");
    expect(status).toBeDefined();
    expect(status!.y).toBeLessThan(byId(buttons, "equip-category-cycle").y);
  });

  it("keeps Mission empty-state actions above the shared footer", () => {
    const viewport = { width: 390, height: 844 };
    const buttons = render("missions", viewport, { missions: [] });
    const chrome = getPanelChromeLayout({ x: 8, y: 12, width: viewport.width - 16, height: viewport.height - 24 }, true);
    for (const id of ["touch-dock", "map-open"]) {
      const button = byId(buttons, id);
      expect(button.y + button.height).toBeLessThanOrEqual(chrome.footerRow.y);
    }
  });

  it("keeps Settings controls inside stable non-overlapping rows", () => {
    const buttons = render("settings");
    for (const id of ["settings-sfx-down", "settings-sfx-up", "settings-music-down", "settings-music-up", "settings-glow", "settings-mute", "settings-back"]) {
      const button = byId(buttons, id);
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.y).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(390);
      expect(button.y + button.height).toBeLessThanOrEqual(844);
    }
    expectNoOverlap(byId(buttons, "settings-sfx-up"), byId(buttons, "settings-music-up"));
    expectNoOverlap(byId(buttons, "settings-glow"), byId(buttons, "settings-mute"));
    expect(byId(buttons, "settings-sfx-down").x).toBe(byId(buttons, "settings-music-down").x);
    expect(byId(buttons, "settings-sfx-up").x).toBe(byId(buttons, "settings-music-up").x);
    expect(byId(buttons, "settings-glow").x + byId(buttons, "settings-glow").width).toBe(byId(buttons, "settings-sfx-up").x + byId(buttons, "settings-sfx-up").width);
    expect(byId(buttons, "settings-mute").x + byId(buttons, "settings-mute").width).toBe(byId(buttons, "settings-sfx-up").x + byId(buttons, "settings-sfx-up").width);
    expect(byId(buttons, "settings-back").width).toBeLessThanOrEqual(150);
    expectNoOverlap(byId(buttons, "settings-back"), byId(buttons, "settings-mute"));
  });

  it("keeps Settings header actions and footer action inside panel bounds at desktop and 390x844", () => {
    for (const viewport of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
      const buttons = render("settings", viewport);
      const help = byId(buttons, "help");
      const close = byId(buttons, "settings-back");
      expect(help.x + help.width).toBeLessThanOrEqual(viewport.width);
      expect(help.y).toBeGreaterThanOrEqual(0);
      expect(close.x).toBeGreaterThanOrEqual(0);
      expect(close.x + close.width).toBeLessThanOrEqual(viewport.width);
      expect(close.y + close.height).toBeLessThanOrEqual(viewport.height);
    }
  });

  it("suppresses the docked instruction strip so station cards stay clear", () => {
    const buttons = render("docked", { width: 390, height: 844 }, { activeHint: "docking" });
    expect(buttons.some((button) => button.id === "hint-dismiss")).toBe(false);
    expect(buttons.some((button) => button.id === "touch-equipment")).toBe(true);
    expect(buttons.some((button) => button.id === "touch-missions")).toBe(true);
  });

  it("uses clear Mission Board copy for postings, empty state, and active contract states", () => {
    const postings = renderWithTrace("missions", { width: 390, height: 844 });
    expect(drawnText(postings.trace)).toContain("NO ACTIVE CONTRACT");
    expect(drawnText(postings.trace)).not.toContain("NO ACTIVE CONTRACTS");
    expect(drawnText(postings.trace)).toContain("1 POSTING AVAILABLE");

    const empty = renderWithTrace("missions", { width: 390, height: 844 }, { missions: [] });
    expect(drawnText(empty.trace)).toContain("NO CONTRACTS AVAILABLE HERE");
    expect(drawnText(empty.trace)).not.toContain("0 POSTINGS AVAILABLE");

    const activeMission = mission();
    const active = renderWithTrace("missions", { width: 390, height: 844 }, { player: player({ activeMission }) });
    expect(drawnText(active.trace)).toContain("ACTIVE CONTRACT IN PROGRESS");
    expect(drawnText(active.trace)).toContain("ACTIVE: SIGNAL PACKET");
  });

  // R2: docked screen title must not overlap the HELP button on mobile.
  it("R2: docked station title stays clear of HELP button at 390×844", () => {
    const viewport = { width: 390, height: 844 };
    const { trace } = renderWithTrace("docked", viewport);

    // Station title is "{SYSTEM NAME} STATION" (space before STATION) and center-aligned.
    // Exclude the standalone "STATION" wireframe label drawn by renderStation in the flight view.
    const titleEntry = trace.texts.find((entry) => entry.text.includes(" STATION") && entry.align === "center");
    expect(titleEntry, "no STATION title found").toBeDefined();

    // Compute estimated right edge: center X + half stub text width.
    const titleRightEdge = titleEntry!.x + (titleEntry!.text.length * 7) / 2;

    // Compute headerActionRow.x for this viewport.
    const panelBounds = getScreenPanelBounds(viewport, "docked");
    const chrome = getPanelChromeLayout(
      { x: panelBounds.x, y: panelBounds.y, width: panelBounds.width, height: panelBounds.height }, true
    );

    expect(titleRightEdge).toBeLessThanOrEqual(chrome.headerActionRow.x - 8);
  });

  // R2: pilot summary must be entirely muted when the player is in nominal state.
  it("R2: pilot summary uses muted text when hull full, reputation ≥ 0, legalRisk 0", () => {
    const viewport = { width: 1280, height: 800 };
    const { trace } = renderWithTrace("docked", viewport, {
      player: player({ hull: 100, maxHull: 100, reputation: 0, legalRisk: 0 })
    });

    const muted = THEME.colors.textSecondary;
    // Every segment of every pilot-summary line must use the muted color.
    // Match exact segment texts produced by renderDocked's drawInfoLine calls.
    // Use precise prefixes to avoid accidentally matching footer/status strings
    // (e.g. "EQUIPMENT INCLUDES HULL REPAIR" also contains "HULL").
    const summarySegments = trace.texts.filter((entry) => {
      const t = entry.text;
      return t === "PILOT RANK  " || t === "CADET" ||
             t === "HULL  " || t.startsWith("100/") || t.startsWith("   BAL  ") ||
             t === "REPUTATION  " || t === "   STATUS  ";
    });
    expect(summarySegments.length).toBeGreaterThan(0);
    for (const seg of summarySegments) {
      expect(seg.color, `"${seg.text}" should be muted but got ${seg.color}`).toBe(muted);
    }
  });

  // R5: touch button zones must be absent when showTouchControls is false (desktop pointer detected).
  it("R5: suppresses touch overlay button zones when showTouchControls is false", () => {
    const viewport = { width: 390, height: 844 };
    // Flight mode, pointer device detected → no touch-* zones registered.
    const buttons = render("flight", viewport, { showTouchControls: false });
    const touchZones = buttons.filter((b) => b.id.startsWith("touch-"));
    expect(touchZones).toHaveLength(0);
  });

  it("R5: registers touch overlay button zones when showTouchControls is true", () => {
    const viewport = { width: 390, height: 844 };
    const buttons = render("flight", viewport, { showTouchControls: true });
    const touchZones = buttons.filter((b) => b.id.startsWith("touch-"));
    expect(touchZones.length).toBeGreaterThan(0);
  });

  it("keeps Pause summary microcopy readable and buttons separated", () => {
    const { buttons, trace } = renderWithTrace("paused");
    const summaryLines = trace.texts.filter((entry) => entry.text.startsWith("SAVE CARD") || entry.text.startsWith("BAL / ACTIVE"));
    expect(summaryLines.length).toBe(2);
    for (const line of summaryLines) {
      expect(fontSize(line)).toBeGreaterThanOrEqual(SIGNAL_GLASS_TEXT_SIZES.pauseMicrocopy);
    }
    const pauseButtons = ["pause-resume", "help", "pause-settings", "pause-menu"].map((id) => byId(buttons, id));
    for (let i = 0; i < pauseButtons.length; i += 1) {
      for (let j = i + 1; j < pauseButtons.length; j += 1) {
        expectNoOverlap(pauseButtons[i], pauseButtons[j]);
      }
    }
  });
});
