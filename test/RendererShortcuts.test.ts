/**
 * Regression coverage for HUD shortcut text. The flight HUD must never
 * advertise a key that does nothing in the current mode (assessment P0).
 *
 * We exercise `Renderer.getModeShortcuts` against a stub state for each game
 * mode and assert the rules the assessment called out:
 *  - flight does NOT show [T] Trade (only valid when docked)
 *  - trade DOES show [F] Fuel (only valid in market context)
 *  - equipment DOES show [H] Repair (only valid in equipment bay)
 *  - docked does NOT advertise [Space] Fire
 */
import { describe, expect, it, beforeAll } from "vitest";

import { Renderer, type RenderState } from "../src/game/Renderer";
import type { GameMode, PlayerState } from "../src/game/types";
import { DEFAULT_EQUIPMENT } from "../src/game/Equipment";

function stubPlayer(docked: boolean): PlayerState {
  return {
    position: { x: 0, y: 0, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: "mirelle",
    hull: 100,
    maxHull: 100,
    shield: 100,
    maxShield: 100,
    energy: 100,
    balance: 1000,
    fuel: 7.5,
    cargo: {},
    cargoCostBasis: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0],
    docked,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT }
  };
}

function stubState(mode: GameMode, docked = false): RenderState {
  return {
    mode,
    player: stubPlayer(docked),
    systems: [],
    selectedSystemId: 0,
    market: [],
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
    phosphorGlow: false,
    audioMuted: false,
    missions: [],
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
      causeOfDeath: ""
    },
    meta: { hasSeenOnboarding: true, dismissedHints: [] },
    pilotRank: { tier: 0, title: "Cadet" },
    isNewPersonalBest: false,
    activeHint: null,
    mapFilters: { query: "", hazard: "all", economy: "all", government: "all", opportunity: "all", discovery: "all", service: "all", systemClass: "all" },
    sfxVolume: 1,
    musicVolume: 0.6,
    selectedShipId: "vaskRelay",
    equipmentPage: 0,
    equipmentCategoryFilter: "all",
    helpSectionId: "quickStart",
    helpPageIndex: 0,
    shipyardPage: 0,
    shipyardClassFilter: "all",
    showTouchControls: true,
    mapFilterSheetOpen: false
  };
}

// Renderer needs a canvas context; build a minimal stub for Node.
function createStubCanvas(): HTMLCanvasElement {
  const ctx = {
    setTransform() {}, clearRect() {}, fillRect() {}, beginPath() {},
    roundRect() {}, fill() {}, stroke() {}, rect() {}, clip() {}, fillText() {}, measureText() { return { width: 0 }; },
    moveTo() {}, lineTo() {}, arc() {}, ellipse() {}, setLineDash() {}, save() {}, restore() {},
    translate() {}, rotate() {}, closePath() {}, strokeRect() {}
  } as unknown as CanvasRenderingContext2D;
  return {
    getContext: () => ctx,
    width: 1280, height: 720,
    style: {},
    addEventListener() {}, removeEventListener() {}
  } as unknown as HTMLCanvasElement;
}

let renderer: Renderer;

beforeAll(() => {
  (globalThis as unknown as { window?: unknown }).window = {
    devicePixelRatio: 1,
    innerWidth: 1280,
    innerHeight: 720,
    addEventListener() {}
  } as unknown as Window;
  renderer = new Renderer(createStubCanvas());
});

describe("Renderer.getModeShortcuts — state-accurate HUD", () => {

  it("flight mode does NOT advertise [T] Trade", () => {
    const tips = renderer.getModeShortcuts(stubState("flight", false));
    expect(tips.some((t) => /\[T\]/i.test(t))).toBe(false);
  });

  it("flight mode shows [Space] Fire and [Esc] Pause", () => {
    const tips = renderer.getModeShortcuts(stubState("flight", false));
    expect(tips.some((t) => /\[Space\]\s*Fire/i.test(t))).toBe(true);
    expect(tips.some((t) => /\[Esc\]/i.test(t))).toBe(true);
  });

  it("docked mode advertises [T] Market and does NOT advertise [Space] Fire", () => {
    const tips = renderer.getModeShortcuts(stubState("docked", true));
    expect(tips.some((t) => /\[T\]\s*Market/i.test(t))).toBe(true);
    expect(tips.some((t) => /\[Space\]/i.test(t))).toBe(false);
  });

  it("trade mode advertises [F] Fuel (market context) and not [Space] Fire", () => {
    const tips = renderer.getModeShortcuts(stubState("trade", true));
    expect(tips.some((t) => /\[F\]\s*Fuel/i.test(t))).toBe(true);
    expect(tips.some((t) => /\[Space\]/i.test(t))).toBe(false);
  });

  it("equipment mode advertises [H] Repair and not [F] Fuel", () => {
    const tips = renderer.getModeShortcuts(stubState("equipment", true));
    expect(tips.some((t) => /\[H\]\s*Repair/i.test(t))).toBe(true);
    expect(tips.some((t) => /\[F\]/i.test(t))).toBe(false);
  });

  it("map mode advertises [A/D] Select and [Enter] Jump", () => {
    const tips = renderer.getModeShortcuts(stubState("map", false));
    expect(tips.some((t) => /\[A\/D\]/i.test(t))).toBe(true);
    expect(tips.some((t) => /\[Enter\]\s*Jump/i.test(t))).toBe(true);
  });

  it("missions mode advertises [1-8] Accept, not [Space] Fire", () => {
    const tips = renderer.getModeShortcuts(stubState("missions", true));
    expect(tips.some((t) => /1-8/i.test(t))).toBe(true);
    expect(tips.some((t) => /\[Space\]/i.test(t))).toBe(false);
  });

  it("shipyard mode advertises [Enter] Buy", () => {
    const tips = renderer.getModeShortcuts(stubState("shipyard", true));
    expect(tips.some((t) => /\[Enter\]\s*Buy/i.test(t))).toBe(true);
  });

  it("paused mode advertises Escape as resume, not menu", () => {
    const tips = renderer.getModeShortcuts(stubState("paused", false));
    expect(tips.some((t) => /\[Esc\]\s*Resume/i.test(t))).toBe(true);
    expect(tips.some((t) => /\[Esc\]\s*Menu/i.test(t))).toBe(false);
  });
});
