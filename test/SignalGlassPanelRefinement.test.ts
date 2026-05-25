import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";
import { Renderer, type RenderState } from "../src/game/Renderer";
import { getPanelChromeLayout, rectsOverlap } from "../src/game/Layout";
import { createMissionId } from "../src/game/MissionIds";
import { generateUniverse } from "../src/game/Universe";
import type { ButtonZone, GameMode, Mission, PlayerState } from "../src/game/types";

const systems = generateUniverse(492017);

function createStubCanvas(): HTMLCanvasElement {
  const ctx = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {},
    roundRect() {}, fill() {}, stroke() {}, fillText() {}, measureText(text: string) { return { width: text.length * 7 }; },
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
    message: "",
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
    ...overrides
  };
}

function render(mode: GameMode, viewport = { width: 390, height: 844 }, overrides: Partial<RenderState> = {}): ButtonZone[] {
  vi.stubGlobal("window", {
    devicePixelRatio: 1,
    innerWidth: viewport.width,
    innerHeight: viewport.height,
    location: { search: "" },
    localStorage: { getItem: () => null },
    matchMedia: () => ({ matches: false }),
    addEventListener() {}
  });
  const renderer = new Renderer(createStubCanvas());
  renderer.resize();
  renderer.render(state(mode, overrides));
  return renderer.getButtons();
}

function byId(buttons: ButtonZone[], id: string): ButtonZone {
  const button = buttons.find((candidate) => candidate.id === id);
  expect(button, `missing ${id}`).toBeDefined();
  return button!;
}

function expectNoOverlap(a: ButtonZone, b: ButtonZone): void {
  expect(rectsOverlap(a, b), `${a.id} overlaps ${b.id}`).toBe(false);
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

  it("keeps map filter chips away from Close and Help", () => {
    const buttons = render("map");
    const close = byId(buttons, "map-back");
    const help = byId(buttons, "help");
    for (const button of buttons.filter((candidate) => candidate.id.startsWith("map-filter-"))) {
      expectNoOverlap(button, close);
      expectNoOverlap(button, help);
    }
  });

  it("keeps Equipment repair, category, page, and Help actions in separate bands", () => {
    const buttons = render("equipment", { width: 390, height: 844 }, { player: player({ hull: 50, balance: 200 }) });
    const repair = byId(buttons, "equip-repair");
    const category = byId(buttons, "equip-category-cycle");
    const help = byId(buttons, "help");
    expectNoOverlap(repair, category);
    expectNoOverlap(repair, help);
    expectNoOverlap(category, help);
  });

  it("shows complete Equipment hull state without exposing a repair button when fully repaired", () => {
    const buttons = render("equipment", { width: 390, height: 844 }, { player: player({ hull: 100, maxHull: 100 }) });
    expect(buttons.some((button) => button.id === "equip-repair")).toBe(false);
    expect(buttons.some((button) => button.id === "equip-category-cycle")).toBe(true);
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
  });
});
