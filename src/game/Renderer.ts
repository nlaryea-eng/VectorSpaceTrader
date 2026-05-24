import { SIGNAL_GLASS_THEME, THEME } from "./Theme";
import { isSignalGlassUiEnabled } from "./FeatureFlags";
import { createHudShellLayout, createToastModel, formatSystemChip } from "./UiHost";
import { respectsReducedMotion } from "./Layout";
import { EQUIPMENT, isEquipmentAvailableAtStation } from "./Equipment";
import { getPriceTrend } from "./Economy";
import { filterSystems, getMapSystemVisualState, hasActiveMapFilter, isSystemDiscovered, matchesMapFilters, projectSystemToMap, type MapFilterState } from "./MapSearch";
import { getLegalRiskLabel, getReputationLabel } from "./Reputation";
import { HINT_TEXT } from "./Onboarding";
import { formatTimePlayed } from "./RunStats";
import type { RankInfo } from "./Rank";
import type { RunStats } from "./RunStats";
import type { HintId } from "./Onboarding";
import { getPlayerShip, getPlayerShipStats, PLAYER_SHIPS } from "./Ships";
import { getStationProfile } from "./StationServices";
import { HELP_CONTENT, searchHelpContent, type HelpSectionId } from "./HelpContent";
import {
  classifyEquipment,
  formatDeltaBadge,
  getEquipmentAffordability,
  getMissionCardState,
  getRouteValidity,
  getShipComparison,
  getStationRecommendation,
  getStationServiceTiles
} from "./SignalGlassScreens";
import type {
  ButtonZone,
  CommodityId,
  EconomyState,
  EquipmentCategory,
  GameMode,
  MarketItem,
  Meta,
  Mission,
  PlayerShipId,
  PlayerState,
  Projectile,
  Ship,
  ShipClassId,
  StarSystem,
  Vector3
} from "./types";
import { calcRepairCost, getTotalOccupiedCargo } from "./Trading";
import { canJump, getFuelRequired, getJumpDistance, UNIVERSE_CONSTANTS } from "./Universe";

export interface ExplosionEffect {
  worldPosition: Vector3;
  age: number;
  maxAge: number;
}

export interface RenderState {
  mode: GameMode;
  player: PlayerState;
  systems: StarSystem[];
  selectedSystemId: number;
  market: MarketItem[];
  enemy: Ship;
  projectiles: Projectile[];
  hasSave: boolean;
  message: string;
  stationPosition: Vector3;
  dockingProgress: number;
  phosphorGlow: boolean;
  audioMuted: boolean;
  missions: Mission[];
  economy: EconomyState;
  mousePosition: { x: number; y: number } | null;
  playerHitFlash: number;
  explosionEffect: ExplosionEffect | null;
  previousPrices: Partial<Record<CommodityId, number | undefined>>;
  runStats: RunStats;
  meta: Meta;
  pilotRank: RankInfo;
  isNewPersonalBest: boolean;
  activeHint: HintId | null;
  mapFilters: MapFilterState;
  sfxVolume: number;
  musicVolume: number;
  selectedShipId: PlayerShipId;
  equipmentPage: number;
  equipmentCategoryFilter: EquipmentCategory | "all";
  helpSectionId: HelpSectionId;
  helpPageIndex: number;
  helpSearchQuery?: string;
  shipyardPage: number;
  shipyardClassFilter: ShipClassId | "all";
}

interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
  scale: number;
}

/**
 * Layout breakpoints. The renderer reflows on narrow screens (phone-sized)
 * so HUD, onboarding hints, and touch controls don't overlap.
 */
const NARROW_BREAKPOINT = 720;
const SHORT_BREAKPOINT = 640;
const NARROW_TOUCH_AREA = 176;

export function getCompactTouchControlRects(width: number, height: number, docked: boolean): ButtonZone[] {
  const size = width <= 420 ? 36 : 40;
  const gap = width <= 420 ? 5 : 6;
  const side = width <= 420 ? 12 : 16;
  const bottomMargin = 8;
  const modeH = 28;
  const modeGap = 8;

  const ringHeight = size * 3 + gap * 2;
  const ringTop = Math.max(modeH + modeGap, height - bottomMargin - ringHeight);
  const modeY = Math.max(4, ringTop - modeGap - modeH);
  const modeBtnW = Math.min(60, (width - 16) / 4 - 4);
  const rowGap = 4;
  const modeRowW = modeBtnW * 4 + rowGap * 3;
  const modeStart = width / 2 - modeRowW / 2;
  const rightX = width - side - size * 2 - gap;

  const rects: ButtonZone[] = [
    { id: "touch-map", label: "MAP", x: modeStart, y: modeY, width: modeBtnW, height: modeH },
    { id: "touch-dock", label: docked ? "LAUNCH" : "DOCK", x: modeStart + (modeBtnW + rowGap), y: modeY, width: modeBtnW, height: modeH },
    { id: "touch-menu", label: "MENU", x: modeStart + (modeBtnW + rowGap) * 3, y: modeY, width: modeBtnW, height: modeH },
    { id: "touch-up", label: "↑", x: side + size + gap, y: ringTop, width: size, height: size },
    { id: "touch-left", label: "←", x: side, y: ringTop + size + gap, width: size, height: size },
    { id: "touch-right", label: "→", x: side + (size + gap) * 2, y: ringTop + size + gap, width: size, height: size },
    { id: "touch-down", label: "↓", x: side + size + gap, y: ringTop + (size + gap) * 2, width: size, height: size },
    { id: "touch-throttle-up", label: "W", x: rightX, y: ringTop, width: size, height: size },
    { id: "touch-throttle-down", label: "S", x: rightX, y: ringTop + (size + gap) * 2, width: size, height: size },
    { id: "touch-fire", label: "FIRE", x: rightX, y: ringTop + size + gap, width: size * 2 + gap, height: size },
  ];

  if (docked) {
    rects.splice(2, 0, {
      id: "touch-trade",
      label: "MARKET",
      x: modeStart + (modeBtnW + rowGap) * 2,
      y: modeY,
      width: modeBtnW,
      height: modeH
    });
  }

  return rects;
}

export function getOnboardingHintY(mode: GameMode, height: number, barHeight: number, narrow: boolean, hasStatusMessage: boolean): number {
  if (narrow) {
    if (mode === "docked" || mode === "shipyard") {
      return Math.max(150, height - 315);
    }
    if (mode === "trade" || mode === "equipment" || mode === "missions" || mode === "map") {
      return Math.max(150, height - 214);
    }
    const statusGap = hasStatusMessage ? 42 : 12;
    return Math.max(96, height - NARROW_TOUCH_AREA - barHeight - statusGap);
  }

  if (mode === "docked" || mode === "shipyard") return height * 0.48;
  if (mode === "trade" || mode === "equipment" || mode === "missions") return 44;
  if (mode === "map") return height - barHeight - 48;
  return height - barHeight - 100;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private buttonZones: ButtonZone[] = [];
  private readonly stars: Vector3[] = [];
  private narrow = false;
  private short = false;
  private signalGlassUi = isSignalGlassUiEnabled();
  private currentMousePosition: { x: number; y: number } | null = null;
  private reducedMotion = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available");
    }

    this.ctx = context;
    this.createStars();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  getButtons(): ButtonZone[] {
    return this.buttonZones;
  }

  resize(): void {
    this.pixelRatio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.width = Math.max(320, window.innerWidth);
    this.height = Math.max(240, window.innerHeight);
    this.canvas.width = Math.floor(this.width * this.pixelRatio);
    this.canvas.height = Math.floor(this.height * this.pixelRatio);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    this.narrow = this.width < NARROW_BREAKPOINT;
    this.short = this.height < SHORT_BREAKPOINT;
  }

  /** True when the viewport is phone-sized; UI must reflow. */
  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  isNarrow(): boolean {
    return this.narrow;
  }

  render(state: RenderState): void {
    this.signalGlassUi = isSignalGlassUiEnabled();
    this.reducedMotion = respectsReducedMotion();
    this.currentMousePosition = state.mousePosition;
    this.buttonZones = [];
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = THEME.colors.bgDeep;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (state.mode === "start") this.renderStart(state);
    else if (state.mode === "controls") this.renderControls();
    else {
      this.renderFlightView(state);
      if (state.mode === "map") this.renderMap(state);
      if (state.mode === "docking") this.renderDocking(state);
      if (state.mode === "docked") this.renderDocked(state);
      if (state.mode === "trade") this.renderTrade(state);
      if (state.mode === "equipment") this.renderEquipment(state);
      if (state.mode === "shipyard") this.renderShipyard(state);
      if (state.mode === "missions") this.renderMissions(state);
      if (state.mode === "help") this.renderHelp(state);
      if (state.mode === "settings") this.renderSettings(state);
      if (state.mode === "paused") this.renderPause(state);
      if (state.mode === "gameOver") this.renderGameOver(state);

      // Always show state-accurate help text and active hints on top of overlays
      this.renderModeHelpText(state);
      if (state.activeHint !== null) this.renderOnboardingHint(state, state.activeHint);
    }
  }

  /**
   * Modal-style modes that should dim/hide the flight HUD and touch controls,
   * so station/trade/map screens never collide with cockpit affordances.
   */
  private isOverlayMode(mode: GameMode): boolean {
    return (
      mode === "map" ||
      mode === "docked" ||
      mode === "trade" ||
      mode === "equipment" ||
      mode === "shipyard" ||
      mode === "missions" ||
      mode === "help" ||
      mode === "settings" ||
      mode === "paused" ||
      mode === "gameOver" ||
      mode === "docking"
    );
  }

  private renderStart(state: RenderState): void {
    const titleY = this.narrow ? this.height * 0.18 : this.height * 0.24;
    this.drawCenteredTitle("Vector Space Trader", titleY);
    const subtitle = this.narrow
      ? "CLEAN-ROOM WIREFRAME TRADER"
      : "A CLEAN-ROOM WIREFRAME TRADING AND COMBAT GAME";
    this.drawText(subtitle, this.width / 2, titleY + (this.narrow ? 40 : 80), {
      align: "center",
      color: THEME.colors.accentTeal,
      size: this.narrow ? 12 : 14,
      font: THEME.fonts.accent
    });
    const btnW = Math.min(300, this.width - 48);
    const btnH = this.narrow ? 44 : 48;
    const btnX = this.width / 2 - btnW / 2;
    const btnTop = this.narrow ? this.height * 0.4 : this.height * 0.44;
    const btnGap = this.narrow ? 56 : 64;
    this.button("new", "INITIALIZE MISSION   [1]", btnX, btnTop, btnW, btnH);
    let nextY = btnTop + btnGap;
    if (state.hasSave) {
      this.button("continue", "RESUME SESSION   [2]", btnX, nextY, btnW, btnH);
      nextY += btnGap;
    }
    this.button("help", "PILOT MANUAL     [?]", btnX, nextY, btnW, btnH);
    nextY += btnGap;
    this.button("controls", "SYSTEM OVERVIEW   [3]", btnX, nextY, btnW, btnH);
    const footer = this.narrow
      ? "ORIGINAL CODE, ASSETS, AND DATA"
      : "ORIGINAL CODE, ASSETS, NAMES, SYSTEMS, AND GAMEPLAY DATA";
    this.drawText(footer, this.width / 2, this.height - (this.narrow ? 24 : 44), {
      align: "center",
      color: THEME.colors.textDim,
      size: this.narrow ? 9 : 11,
      font: THEME.fonts.mono
    });
  }

  private renderControls(): void {
    this.drawCenteredTitle("OPERATIONAL CONTROLS", this.narrow ? 56 : 68);
    const flightLines = [
      "ARROW KEYS — PITCH AND YAW",
      "Q / E — ROLL LEFT / RIGHT",
      "W / S — THROTTLE UP / DOWN",
      "SPACE — FIRE LASER (FLIGHT)",
      "D — DOCK / LAUNCH (NEAR STATION)",
      "M — TOGGLE UNIVERSE MAP",
      "ENTER — ENGAGE JUMP (MAP)",
      "ESCAPE — PAUSE / BACK"
    ];
    const stationLines = [
      "T — STATION MARKET (DOCKED)",
      "E — EQUIPMENT BAY (DOCKED)",
      "Y — SHIPYARD (DOCKED)",
      "R — MISSION BOARD (DOCKED)",
      "F — BUY FUEL (MARKET ONLY)",
      "H — REPAIR HULL (EQUIPMENT BAY)",
      "G — TOGGLE PHOSPHOR GLOW",
      "U — GLOBAL AUDIO MUTE",
      "A/D / ←/→ — MAP SELECTION (MAP)"
    ];

    if (this.narrow) {
      // Single-column compact list with section headings so all entries fit
      // without clipping on a 390-wide viewport.
      const top = 96;
      const gap = 18;
      const left = 20;
      const fontSize = 11;
      this.drawText("FLIGHT", left, top, { color: THEME.colors.accentTeal, font: THEME.fonts.accent, size: 12 });
      flightLines.forEach((line, i) => this.drawText(line, left, top + 18 + i * gap, {
        align: "left", size: fontSize, font: THEME.fonts.mono, color: THEME.colors.textPrimary
      }));
      const second = top + 18 + flightLines.length * gap + 14;
      this.drawText("DOCKED / SCREENS", left, second, { color: THEME.colors.accentTeal, font: THEME.fonts.accent, size: 12 });
      stationLines.forEach((line, i) => this.drawText(line, left, second + 18 + i * gap, {
        align: "left", size: fontSize, font: THEME.fonts.mono, color: THEME.colors.textPrimary
      }));
      const noteY = second + 18 + stationLines.length * gap + 12;
      this.drawText("ON-SCREEN TOUCH CONTROLS APPEAR IN FLIGHT", this.width / 2, noteY, {
        align: "center", color: THEME.colors.accentTeal, size: 10, font: THEME.fonts.accent
      });
      this.button("back", "BACK [Esc]", this.width / 2 - 90, this.height - 60, 180, 40);
      return;
    }

    const col1 = this.width * 0.22;
    const col2 = this.width * 0.6;
    const top = 120;
    const gap = 28;
    flightLines.forEach((line, i) => this.drawText(line, col1, top + i * gap, {
      align: "left", size: 13, font: THEME.fonts.mono, color: THEME.colors.textPrimary
    }));
    stationLines.forEach((line, i) => this.drawText(line, col2, top + i * gap, {
      align: "left", size: 13, font: THEME.fonts.mono, color: THEME.colors.textPrimary
    }));

    this.drawText("TOUCH INTERFACE: ON-SCREEN ADAPTIVE CONTROLS AVAILABLE IN FLIGHT",
      this.width / 2, top + Math.max(flightLines.length, stationLines.length) * gap + 24, {
        align: "center", color: THEME.colors.accentTeal, size: 12, font: THEME.fonts.accent
      });

    this.button("back", "RETURN TO MISSION CONTROL [Esc]", this.width / 2 - 180, this.height - 96, 360, 44);
  }

  private renderFlightView(state: RenderState): void {
    this.renderStars(state.player);
    this.renderStation(state);
    this.renderShip(state.enemy, state.player, THEME.colors.accentPink, state.phosphorGlow);
    this.renderProjectiles(state.projectiles, state.player);
    if (state.explosionEffect) this.renderExplosion(state.explosionEffect, state.player);

    const overlayActive = this.isOverlayMode(state.mode);

    if (!overlayActive) {
      this.renderCockpitOverlay(state);
      if (this.signalGlassUi) this.renderSignalGlassHud(state);
      else this.renderHud(state);
      this.renderTouchControls(state);
      if (state.playerHitFlash > 0) this.renderHitFlash(state.playerHitFlash);
      if (state.message) {
        if (this.signalGlassUi) this.renderSignalGlassToast(state.message);
        else this.drawStatusMessage(state.message);
      }
    } else {
      // Behind a modal: still allow a thin dim of background so wireframe vista
      // remains visible, but no flight HUD/touch controls.
      this.ctx.fillStyle = "rgba(2, 4, 8, 0.55)";
      this.ctx.fillRect(0, 0, this.width, this.height);
      if (this.signalGlassUi && !this.narrow) {
        this.renderSignalGlassHud(state);
      }
    }
  }

  /** Status message — placed above the touch safe area so it never collides. */
  private drawStatusMessage(message: string): void {
    const text = message.toUpperCase();
    const y = this.narrow
      ? Math.min(this.height - NARROW_TOUCH_AREA - 18, this.height - 160)
      : this.height - 90;
    // Background pill so the message stays legible over the cockpit.
    this.ctx.font = `13px ${THEME.fonts.accent}`;
    const metrics = this.ctx.measureText(text);
    const padX = 12;
    const w = Math.min(this.width - 32, metrics.width + padX * 2);
    const x = this.width / 2 - w / 2;
    this.ctx.fillStyle = "rgba(2, 4, 8, 0.7)";
    this.ctx.beginPath();
    this.ctx.roundRect(x, y - 13, w, 26, 4);
    this.ctx.fill();
    this.drawText(text, this.width / 2, y, {
      align: "center", color: THEME.colors.accentAmber, size: 13, font: THEME.fonts.accent
    });
  }

  private renderStars(player: PlayerState): void {
    this.setVectorStroke(THEME.colors.accentViolet, 1, false);

    for (const star of this.stars) {
      const depth = ((star.z - player.position.z * 0.08) % 120 + 120) % 120;
      const px = this.width / 2 + (star.x + player.orientation.yaw * 80) * (120 / (depth + 18));
      const py = this.height / 2 + (star.y + player.orientation.pitch * 80) * (120 / (depth + 18));
      if (px < 0 || px > this.width || py < 0 || py > this.height) continue;

      const alpha = 1 - depth / 140;
      this.ctx.globalAlpha = Math.max(0.12, alpha);

      // Some stars are teal
      if (star.x % 2 === 0) this.ctx.strokeStyle = THEME.colors.accentTeal;
      else this.ctx.strokeStyle = THEME.colors.accentViolet;

      this.ctx.beginPath();
      this.ctx.moveTo(px, py);
      this.ctx.lineTo(px + alpha * 2, py);
      this.ctx.stroke();
    }

    this.ctx.globalAlpha = 1;
  }

  private renderCockpitOverlay(state: RenderState): void {
    // On phone-sized viewports, skip the strut/glass cockpit because it would
    // overlap the touch ring and offer no informational value. Just draw the
    // crosshair so the player can still aim.
    if (this.narrow) {
      this.renderCrosshair(state.phosphorGlow);
      return;
    }

    const bottom = this.height - 34;
    const left = Math.max(18, this.width * 0.08);
    const right = this.width - left;
    const mid = this.width / 2;
    const panelTop = this.height - 128;

    this.setVectorStroke(THEME.colors.accentTeal, 1.5, state.phosphorGlow);
    this.ctx.beginPath();
    this.ctx.moveTo(left, bottom);
    this.ctx.lineTo(this.width * 0.28, panelTop);
    this.ctx.lineTo(this.width * 0.42, panelTop + 20);
    this.ctx.moveTo(right, bottom);
    this.ctx.lineTo(this.width * 0.72, panelTop);
    this.ctx.lineTo(this.width * 0.58, panelTop + 20);
    this.ctx.moveTo(this.width * 0.38, bottom);
    this.ctx.lineTo(mid - 44, this.height - 86);
    this.ctx.moveTo(this.width * 0.62, bottom);
    this.ctx.lineTo(mid + 44, this.height - 86);
    this.ctx.stroke();
    this.renderCrosshair(state.phosphorGlow);
  }

  private renderCrosshair(glow: boolean): void {
    const cx = this.width / 2;
    const cy = this.height / 2;
    this.setVectorStroke(THEME.colors.accentTeal, 1.2, glow);
    this.ctx.beginPath();
    // Brackets
    this.ctx.moveTo(cx - 32, cy - 12);
    this.ctx.lineTo(cx - 32, cy + 12);
    this.ctx.moveTo(cx + 32, cy - 12);
    this.ctx.lineTo(cx + 32, cy + 12);
    // Center dots/lines
    this.ctx.moveTo(cx - 8, cy);
    this.ctx.lineTo(cx - 4, cy);
    this.ctx.moveTo(cx + 4, cy);
    this.ctx.lineTo(cx + 8, cy);
    this.ctx.moveTo(cx, cy - 8);
    this.ctx.lineTo(cx, cy - 4);
    this.ctx.moveTo(cx, cy + 4);
    this.ctx.lineTo(cx, cy + 8);
    this.ctx.stroke();

    this.ctx.setLineDash([4, 12]);
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
  }

  private renderStation(state: RenderState): void {
    const relative = subtractPoint(state.stationPosition, state.player.position);
    const point = this.project(relative);
    const cx = point.visible ? point.x : this.width * 0.78;
    const cy = point.visible ? point.y : this.height * 0.34;
    const size = Math.max(18, Math.min(54, 28 * (point.scale || 1)));

    this.setVectorStroke(THEME.colors.accentAmber, 1.2, state.phosphorGlow);
    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(performance.now() * 0.00025);
    this.ctx.beginPath();
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      if (index === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }
    this.ctx.closePath();
    this.ctx.stroke();
    this.ctx.strokeRect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
    this.ctx.restore();
    this.drawText("STATION", cx, cy + size + 20, {
      align: "center", color: THEME.colors.accentAmber, size: 10, font: THEME.fonts.mono
    });
  }

  private renderShip(ship: Ship, player: PlayerState, color: string, glow: boolean): void {
    if (!ship.alive) return;
    const relativePosition = subtractPoint(ship.position, player.position);
    const projected = ship.wireframe.map((point) => this.project(addPoint(point, relativePosition)));
    this.setVectorStroke(color, 1.4, glow);

    for (const [from, to] of ship.edges) {
      const a = projected[from];
      const b = projected[to];
      if (!a.visible || !b.visible) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
    }
  }

  private renderProjectiles(projectiles: Projectile[], player: PlayerState): void {
    for (const projectile of projectiles) {
      const point = this.project(subtractPoint(projectile.position, player.position));
      if (!point.visible) continue;

      const isPlayer = projectile.owner === "player";
      this.setVectorStroke(isPlayer ? THEME.colors.accentTeal : THEME.colors.accentPink, 2.5, true);

      this.ctx.beginPath();
      this.ctx.moveTo(point.x - 6, point.y);
      this.ctx.lineTo(point.x + 6, point.y);
      this.ctx.stroke();
    }
  }

  private drawProgressBar(x: number, y: number, width: number, height: number, fraction: number, color: string): void {
    const radius = 2;
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.05)";
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, radius);
    this.ctx.fill();

    if (fraction > 0) {
      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.roundRect(x, y, width * Math.min(1, fraction), height, radius);
      this.ctx.fill();

      // Add a subtle glow to the bar
      this.ctx.shadowBlur = 8;
      this.ctx.shadowColor = color;
      this.ctx.fill();
      this.ctx.shadowBlur = 0;
    }
  }

  private renderSignalGlassHud(state: RenderState): void {
    const layout = createHudShellLayout({ width: this.width, height: this.height });
    const colors = SIGNAL_GLASS_THEME.colors;
    const shipStats = getPlayerShipStats(state.player);
    const cargo = getTotalOccupiedCargo(state.player);
    const hullFraction = state.player.hull / state.player.maxHull;
    const shieldFraction = state.player.shield / state.player.maxShield;
    const energyFraction = state.player.energy / 100;
    const fuelFraction = state.player.fuel / shipStats.fuelCapacity;
    const hullColor = hullFraction < 0.3 ? colors.danger : hullFraction < 0.6 ? colors.warning : colors.accent;
    const riskLabel = getLegalRiskLabel(state.player.legalRisk);
    const riskColor = state.player.legalRisk >= 5 ? colors.danger : state.player.legalRisk >= 2 ? colors.warning : colors.success;
    const system = state.systems[state.player.currentSystemId];
    const activeMission = state.player.activeMission;

    this.signalPanel(layout.vitals.x, layout.vitals.y, layout.vitals.width, layout.vitals.height, "base");
    if (layout.compact) {
      const cells: Array<{ label: string; value: string; fraction: number; color: string }> = [
        { label: "SHD", value: `${Math.round(state.player.shield)}`, fraction: shieldFraction, color: colors.info },
        { label: "HULL", value: `${Math.round(state.player.hull)}`, fraction: hullFraction, color: hullColor },
        { label: "ENG", value: `${Math.round(state.player.energy)}`, fraction: energyFraction, color: colors.accentViolet },
        { label: "FUEL", value: state.player.fuel.toFixed(1), fraction: fuelFraction, color: colors.accent2 }
      ];
      const cellW = (layout.vitals.width - 18) / cells.length;
      cells.forEach((cell, index) => {
        const x = layout.vitals.x + 9 + cellW * index;
        this.drawText(cell.label, x, layout.vitals.y + 17, { size: 9, font: THEME.fonts.mono, color: colors.textMuted });
        this.drawText(cell.value, x + cellW - 8, layout.vitals.y + 17, { align: "right", size: 10, font: THEME.fonts.mono, color: colors.text });
        this.drawProgressBar(x, layout.vitals.y + 34, cellW - 8, 4, cell.fraction, cell.color);
      });
      this.drawText(`${Math.round(state.player.balance)} BAL`, layout.vitals.x + 10, layout.vitals.y + 55, {
        size: 10, font: THEME.fonts.mono, color: colors.accent2
      });
      this.drawText(`${cargo}/${state.player.cargoCapacity}`, layout.vitals.x + layout.vitals.width / 2, layout.vitals.y + 55, {
        align: "center", size: 10, font: THEME.fonts.mono, color: colors.textMuted
      });
      this.drawText(riskLabel.toUpperCase(), layout.vitals.x + layout.vitals.width - 10, layout.vitals.y + 55, {
        align: "right", size: 10, font: THEME.fonts.mono, color: riskColor
      });
    } else {
      this.drawText("SIGNAL VITALS", layout.vitals.x + 14, layout.vitals.y + 18, {
        color: colors.accent, size: 10, font: THEME.fonts.accent
      });
      const vitals: Array<{ label: string; value: string; fraction: number; color: string }> = [
        { label: "SHIELD", value: `${Math.round(state.player.shield)}`, fraction: shieldFraction, color: colors.info },
        { label: "HULL", value: `${Math.round(state.player.hull)}`, fraction: hullFraction, color: hullColor },
        { label: "ENERGY", value: `${Math.round(state.player.energy)}`, fraction: energyFraction, color: colors.accentViolet },
        { label: "FUEL", value: state.player.fuel.toFixed(1), fraction: fuelFraction, color: colors.accent2 }
      ];
      vitals.forEach((vital, index) => {
        const y = layout.vitals.y + 48 + index * 42;
        this.drawText(vital.label, layout.vitals.x + 14, y, { size: 10, font: THEME.fonts.mono, color: colors.textMuted });
        this.drawText(vital.value, layout.vitals.x + layout.vitals.width - 14, y, {
          align: "right", size: 11, font: THEME.fonts.mono, color: colors.text
        });
        this.drawProgressBar(layout.vitals.x + 14, y + 12, layout.vitals.width - 28, 5, vital.fraction, vital.color);
      });
      this.drawText(`SPD ${Math.round(state.player.speed).toString().padStart(3, "0")}`, layout.vitals.x + 14, layout.vitals.y + layout.vitals.height - 18, {
        size: 13, font: THEME.fonts.mono, color: colors.accent
      });
    }

    this.signalPanel(layout.status.x, layout.status.y, layout.status.width, layout.status.height, "base");
    this.drawText("BALANCE", layout.status.x + 14, layout.status.y + 18, { color: colors.textMuted, size: 10, font: THEME.fonts.mono });
    this.drawText(`${Math.round(state.player.balance)} BAL`, layout.status.x + layout.status.width - 14, layout.status.y + 18, {
      align: "right", color: colors.accent2, size: 12, font: THEME.fonts.mono
    });
    if (!layout.compact) {
      const ship = getPlayerShip(state.player.shipId);
      const rows: Array<[string, string, string?]> = [
        ["CARGO", `${cargo}/${state.player.cargoCapacity}`],
        ["SHIP", ship.name],
        ["RANK", state.pilotRank.title],
        ["STATUS", riskLabel, riskColor],
        ["REP", state.player.reputation.toFixed(1)]
      ];
      rows.forEach(([label, value, color], index) => {
        const y = layout.status.y + 52 + index * 30;
        this.drawText(label, layout.status.x + 14, y, { color: colors.textMuted, size: 10, font: THEME.fonts.mono });
        this.drawText(value, layout.status.x + layout.status.width - 14, y, {
          align: "right", color: color ?? colors.text, size: 11, font: THEME.fonts.mono
        });
      });
    }

    this.signalChip(layout.systemChip.x, layout.systemChip.y, layout.systemChip.width, layout.systemChip.height, formatSystemChip(system), colors.accent);
    const missionText = activeMission
      ? `${activeMission.title} -> ${state.systems[activeMission.destinationSystemId]?.name ?? "Unknown"}`
      : "No active mission";
    this.signalChip(layout.missionChip.x, layout.missionChip.y, layout.missionChip.width, layout.missionChip.height, missionText, activeMission ? colors.accent2 : colors.textMuted);

    if (!layout.compact) {
      const threat = state.enemy.alive ? "CONTACT ACTIVE" : "LANE CLEAR";
      this.signalChip(layout.threatChip.x, layout.threatChip.y, layout.threatChip.width, layout.threatChip.height, threat, state.enemy.alive ? colors.warning : colors.success);
    }
  }

  private renderHud(state: RenderState): void {
    const speed = Math.round(state.player.speed);
    const cargo = getTotalOccupiedCargo(state.player);
    const hullFraction = state.player.hull / state.player.maxHull;
    const shieldFraction = state.player.shield / state.player.maxShield;
    const energyFraction = state.player.energy / 100; // Assuming max energy is 100, checking types.ts might be better
    const shipStats = getPlayerShipStats(state.player);
    const fuelFraction = state.player.fuel / shipStats.fuelCapacity;

    const hullColor = hullFraction < 0.3 ? THEME.colors.danger : hullFraction < 0.6 ? THEME.colors.warning : THEME.colors.accentTeal;
    const riskLabel = getLegalRiskLabel(state.player.legalRisk);
    const riskColor = state.player.legalRisk >= 5 ? THEME.colors.danger : state.player.legalRisk >= 2 ? THEME.colors.warning : THEME.colors.accentTeal;
    const ship = getPlayerShip(state.player.shipId);

    if (this.narrow) {
      this.renderCompactHud(state, {
        speed, cargo, hullFraction, shieldFraction, fuelFraction, energyFraction,
        hullColor, riskLabel, riskColor
      });
      return;
    }

    // Left Panel: Vitals
    this.hudPanel(16, 16, 210, 230);
    this.drawText("SYSTEM VITALS", 28, 34, { color: THEME.colors.accentTeal, size: 10, font: THEME.fonts.accent });

    const vitals: Array<{ label: string; value: string; fraction: number; color: string }> = [
      { label: "SHD", value: `${Math.round(state.player.shield)}`, fraction: shieldFraction, color: THEME.colors.info },
      { label: "HULL", value: `${Math.round(state.player.hull)}`, fraction: hullFraction, color: hullColor },
      { label: "ENG", value: `${Math.round(state.player.energy)}`, fraction: energyFraction, color: THEME.colors.accentViolet },
      { label: "FUEL", value: `${state.player.fuel.toFixed(1)}`, fraction: fuelFraction, color: THEME.colors.accentAmber },
    ];

    vitals.forEach((v, i) => {
      const ty = 60 + i * 44;
      this.drawText(v.label, 28, ty, { size: 11, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      this.drawText(v.value, 214, ty, { align: "right", size: 11, font: THEME.fonts.mono });
      this.drawProgressBar(28, ty + 10, 186, 4, v.fraction, v.color);
    });

    this.drawText(`SPD ${speed.toString().padStart(3, "0")}`, 28, 226, { size: 14, font: THEME.fonts.mono, color: THEME.colors.accentPink });

    // Right Panel: Status
    this.hudPanel(this.width - 226, 16, 210, 230);
    this.drawText("MISSION STATUS", this.width - 214, 34, { color: THEME.colors.accentTeal, size: 10, font: THEME.fonts.accent });

    const statusLines: Array<{ label: string; value: string; color?: string }> = [
      { label: "BALANCE", value: `${Math.round(state.player.balance)}`, color: THEME.colors.accentAmber },
      { label: "CARGO", value: `${cargo}/${state.player.cargoCapacity}` },
      { label: "RANK", value: state.pilotRank.title, color: THEME.colors.accentPink },
      { label: "SHIP", value: ship.name },
      { label: "STATUS", value: riskLabel, color: riskColor },
      { label: "REP", value: state.player.reputation.toFixed(1) },
    ];

    statusLines.forEach((s, i) => {
      const ty = 60 + i * 28;
      this.drawText(s.label, this.width - 214, ty, { size: 11, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      this.drawText(s.value, this.width - 28, ty, { align: "right", size: 11, font: THEME.fonts.mono, color: s.color });
    });

    // Top Center: Warnings & Info
    if (state.player.legalRisk >= 5) {
      this.drawText("PIRACY THREAT DETECTED", this.width / 2, 48, {
        align: "center", color: THEME.colors.danger, size: 12, font: THEME.fonts.accent
      });
    }
  }

  /**
   * Compact HUD for phone-sized viewports. Stacks vitals & balance into a
   * single thin band along the top so it never collides with the touch ring.
   */
  private renderCompactHud(
    state: RenderState,
    p: {
      speed: number;
      cargo: number;
      hullFraction: number;
      shieldFraction: number;
      fuelFraction: number;
      energyFraction: number;
      hullColor: string;
      riskLabel: string;
      riskColor: string;
    }
  ): void {
    const panelW = this.width - 16;
    const panelX = 8;
    const panelY = 8;
    const panelH = 64;
    this.hudPanel(panelX, panelY, panelW, panelH);

    const labelSize = 9;
    const valueSize = 11;
    const colY = panelY + 18;
    const barY = panelY + 36;
    const barH = 4;

    // Four mini-vital cells across the band: SHD HULL FUEL ENG
    const cells: Array<{ label: string; value: string; fraction: number; color: string }> = [
      { label: "SHD", value: `${Math.round(state.player.shield)}`, fraction: p.shieldFraction, color: THEME.colors.info },
      { label: "HULL", value: `${Math.round(state.player.hull)}`, fraction: p.hullFraction, color: p.hullColor },
      { label: "FUEL", value: state.player.fuel.toFixed(1), fraction: p.fuelFraction, color: THEME.colors.accentAmber },
      { label: "ENG", value: `${Math.round(state.player.energy)}`, fraction: p.energyFraction, color: THEME.colors.accentViolet }
    ];
    const cellW = (panelW - 16) / cells.length;
    cells.forEach((cell, i) => {
      const cx = panelX + 8 + cellW * i;
      this.drawText(cell.label, cx, colY, { size: labelSize, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      this.drawText(cell.value, cx + cellW - 6, colY, {
        align: "right", size: valueSize, font: THEME.fonts.mono
      });
      this.drawProgressBar(cx, barY, cellW - 8, barH, cell.fraction, cell.color);
    });

    // Bottom line of the band: balance/speed/risk pill
    const footerY = panelY + 56;
    this.drawText(`${Math.round(state.player.balance)} BAL`, panelX + 8, footerY, {
      size: 10, font: THEME.fonts.mono, color: THEME.colors.accentAmber
    });
    this.drawText(`${p.cargo}/${state.player.cargoCapacity}`, panelX + panelW / 2, footerY, {
      align: "center", size: 10, font: THEME.fonts.mono, color: THEME.colors.textSecondary
    });
    this.drawText(p.riskLabel.toUpperCase(), panelX + panelW - 8, footerY, {
      align: "right", size: 10, font: THEME.fonts.mono, color: p.riskColor
    });

    // Speed badge to the left edge above the touch ring, away from controls
    this.drawText(`SPD ${p.speed.toString().padStart(3, "0")}`, panelX + 8, panelY + panelH + 14, {
      size: 11, font: THEME.fonts.mono, color: THEME.colors.accentPink
    });

    if (state.player.legalRisk >= 5) {
      this.drawText("PIRACY THREAT", panelX + panelW - 8, panelY + panelH + 14, {
        align: "right", size: 11, font: THEME.fonts.accent, color: THEME.colors.danger
      });
    }
  }

  /**
   * State-accurate shortcut strip. Shows only shortcuts valid for the current
   * mode and docking state — never advertises [T] Trade or [Space] Fire when
   * those keys do nothing.
   */
  private renderModeHelpText(state: RenderState): void {
    const tips = this.getModeShortcuts(state);
    if (tips.length === 0) return;
    const text = tips.join("  ");
    const y = this.narrow ? 92 : 24;
    this.drawText(text, this.width / 2, y, {
      align: "center", color: "rgba(0, 242, 255, 0.6)", size: this.narrow ? 9 : 10, font: THEME.fonts.mono
    });
  }

  /** Pure helper so tests can assert state-accurate shortcuts. */
  getModeShortcuts(state: RenderState): string[] {
    const player = state.player;
    if (state.mode === "flight") {
      const tips = ["[M] Map", "[Space] Fire", "[Esc] Pause"];
      if (player.docked === false) tips.splice(1, 0, "[D] Dock");
      else tips.splice(1, 0, "[D] Launch");
      return tips;
    }
    if (state.mode === "docked") {
      return ["[T] Market", "[E] Gear", "[Y] Ships", "[R] Missions", "[D] Launch", "[M] Map"];
    }
    if (state.mode === "trade") {
      return ["[F] Fuel", "[1-8] Trade", "[Esc] Back"];
    }
    if (state.mode === "equipment") {
      return ["[H] Repair", "[1-8] Buy", "[N/P] Page", "[Esc] Back"];
    }
    if (state.mode === "shipyard") {
      return ["[1-6] Compare", "[Enter] Buy", "[Esc] Back"];
    }
    if (state.mode === "missions") {
      return ["[1-8] Accept", "[Esc] Back"];
    }
    if (state.mode === "map") {
      return ["[A/D] Select", "[Enter] Jump", "[Esc] Close"];
    }
    if (state.mode === "docking") {
      return ["DOCKING IN PROGRESS..."];
    }
    if (state.mode === "paused") {
      return ["[Enter] Resume", "[Esc] Resume"];
    }
    if (state.mode === "settings") {
      return ["[Esc] Back"];
    }
    return [];
  }

  private renderTouchControls(state: RenderState): void {
    // Two layouts: a desktop layout (mouse-friendly, current geometry) and a
    // phone layout that fits inside a reserved bottom band, with a single row
    // of mode buttons that doesn't bleed into FIRE/THROTTLE.
    if (this.narrow) {
      this.renderCompactTouchControls(state);
      return;
    }

    const size = this.width < 760 ? 38 : 42;
    const gap = 8;
    const y = this.height - size - 14;
    const left = 16;
    this.button("touch-left", "←", left, y - size - gap, size, size);
    this.button("touch-right", "→", left + size * 2 + gap * 2, y - size - gap, size, size);
    this.button("touch-up", "↑", left + size + gap, y - size * 2 - gap * 2, size, size);
    this.button("touch-down", "↓", left + size + gap, y, size, size);
    this.button("touch-throttle-up", "W", this.width - size * 3 - gap * 3, y - size * 2 - gap * 2, size, size);
    this.button("touch-throttle-down", "S", this.width - size * 3 - gap * 3, y, size, size);
    this.button("touch-fire", "FIRE", this.width - size * 2 - gap * 2, y - size - gap, size * 2 + gap, size);
    // Mode row above the touch ring, not overlapping it.
    const modeY = this.height - 50;
    this.button("touch-map", "MAP", this.width / 2 - 92, modeY, 56, 34);
    this.button("touch-dock", state.player.docked ? "LAUNCH" : "DOCK", this.width / 2 - 28, modeY, 70, 34);
    if (state.player.docked) {
      this.button("touch-trade", "MARKET", this.width / 2 + 50, modeY, 70, 34);
    }
    this.button("touch-menu", "MENU", this.width / 2 + 128, modeY, 70, 34);
  }

  /**
   * Phone-sized touch layout: two stacked rows reserved inside a single safe
   * band at the bottom. The flight ring sits on the left, FIRE + throttle on
   * the right, and a thin mode-row across the top of the band.
   */
  private renderCompactTouchControls(state: RenderState): void {
    for (const rect of getCompactTouchControlRects(this.width, this.height, state.player.docked)) {
      this.button(rect.id, rect.label, rect.x, rect.y, rect.width, rect.height);
    }
  }

  private renderMap(state: RenderState): void {
    const panelX = this.narrow ? 8 : this.width * 0.08;
    const panelY = this.narrow ? 12 : this.height * 0.1;
    const panelW = this.narrow ? this.width - 16 : this.width * 0.84;
    const panelH = this.narrow ? this.height - 24 : this.height * 0.78;
    this.panel(panelX, panelY, panelW, panelH);
    const matches = filterSystems(state.systems, state.mapFilters, state.player);
    const titleSize = this.narrow ? 16 : 24;
    const titleY = panelY + (this.narrow ? 26 : 40);
    this.drawText("UNIVERSE NAVIGATION", this.width / 2, titleY, {
      align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const mapX = this.narrow ? panelX + 12 : this.width * 0.12;
    const mapY = this.narrow ? titleY + 18 : this.height * 0.23;
    const mapW = this.narrow ? panelW - 24 : this.width * 0.54;
    const mapH = this.narrow ? this.height * 0.42 : this.height * 0.56;

    this.ctx.strokeStyle = "rgba(0, 242, 255, 0.2)";
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);

    const current = state.systems[state.player.currentSystemId];
    const selected = state.systems[state.selectedSystemId];

    const currentPoint = projectSystemToMap(current, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
    const selectedPoint = projectSystemToMap(selected, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
    const routeValidity = getRouteValidity(current, selected, state.player);
    const shipStats = getPlayerShipStats(state.player);
    const ringRx = (shipStats.maxJumpRange / UNIVERSE_CONSTANTS.width) * mapW;
    const ringRy = (shipStats.maxJumpRange / UNIVERSE_CONSTANTS.height) * mapH;

    // Jump range indicator
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(0, 242, 255, 0.25)";
    this.ctx.lineWidth = 1.5;
    this.ctx.setLineDash([8, 8]);
    this.ctx.beginPath();
    this.ctx.ellipse(currentPoint.x, currentPoint.y, ringRx, ringRy, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();

    if (selected.id !== current.id) {
      const routeColor = routeValidity.state === "valid"
        ? THEME.colors.success
        : routeValidity.state === "warning"
          ? THEME.colors.warning
          : THEME.colors.danger;
      this.ctx.save();
      this.ctx.strokeStyle = routeColor;
      this.ctx.globalAlpha = 0.72;
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash(routeValidity.state === "valid" ? [] : [6, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(currentPoint.x, currentPoint.y);
      this.ctx.lineTo(selectedPoint.x, selectedPoint.y);
      this.ctx.stroke();
      this.ctx.restore();
    }

    const labeledPoints: Array<{ x: number; y: number }> = [];

    for (const system of state.systems) {
      const point = projectSystemToMap(system, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
      const isCurrent = system.id === current.id;
      const isSelected = system.id === selected.id;
      const inRange = !isCurrent && canJump(current, system, state.player.fuel, state.player);
      const discovered = isSystemDiscovered(state.player, system.id);
      const matched = matchesMapFilters(system, state.mapFilters, state.player);
      const visualState = getMapSystemVisualState(system, state.mapFilters, state.player, selected.id);
      const nearby = getJumpDistance(current, system) <= shipStats.maxJumpRange * 0.65;
      const activeFilter = hasActiveMapFilter(state.mapFilters);

      this.ctx.globalAlpha = visualState.protected ? 1 : visualState.dimmed ? 0.2 : discovered ? 1 : 0.4;

      let color = THEME.colors.textDim;
      if (isCurrent) color = THEME.colors.textPrimary;
      else if (isSelected) color = THEME.colors.accentPink;
      else if (matched && activeFilter) color = THEME.colors.accentAmber;
      else if (inRange) color = THEME.colors.accentTeal;

      this.ctx.fillStyle = color;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, isCurrent || isSelected ? 5 : matched && activeFilter ? 4 : 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      if (isSelected) {
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(point.x, point.y, 10, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.globalAlpha = 1;

      // Robust labeling with clutter reduction
      let labelPriority = 0;
      if (isCurrent || isSelected) labelPriority = 3;
      else if (matched && activeFilter) labelPriority = 2;
      else if (nearby) labelPriority = 1;

      if (labelPriority > 0) {
        const tooClose = labeledPoints.some((p) => Math.abs(p.x - point.x) < 48 && Math.abs(p.y - point.y) < 15);
        if (!tooClose || labelPriority >= 3) {
          this.drawText(system.name, point.x + 12, point.y, {
            align: "left",
            size: 11,
            font: THEME.fonts.mono,
            color: discovered ? THEME.colors.textPrimary : THEME.colors.textDim
          });
          labeledPoints.push(point);
        }
      }

      const hitR = 12;
      this.buttonZones.push({ id: `map-system-${system.id}`, label: system.name, x: point.x - hitR, y: point.y - hitR, width: hitR * 2, height: hitR * 2 });
    }

    const detailX = this.narrow ? panelX + 12 : this.width * 0.68;
    const detailY = this.narrow ? mapY + mapH + 12 : this.height * 0.23;
    const detailW = this.narrow ? panelW - 24 : this.width * 0.22;
    const detailH = this.narrow ? 110 : this.height * 0.45;

    // System Detail Panel
    this.hudPanel(detailX, detailY, detailW, detailH);
    const detailTitleSize = this.narrow ? 14 : 18;
    this.drawText(selected.name.toUpperCase(), detailX + 12, detailY + (this.narrow ? 18 : 24), {
      size: detailTitleSize, font: THEME.fonts.accent, color: THEME.colors.accentTeal
    });

    const dist = getJumpDistance(current, selected);
    const fuel = getFuelRequired(current, selected, state.player);
    const discovered = isSystemDiscovered(state.player, selected.id);

    const details = [
      { label: "DISTANCE", value: `${dist.toFixed(1)} LY` },
      { label: "FUEL REQ", value: `${fuel.toFixed(1)}`, color: fuel > state.player.fuel ? THEME.colors.danger : THEME.colors.accentAmber },
      { label: "CLASS", value: discovered ? selected.profile.classId.toUpperCase() : "UNKNOWN" },
      { label: "ECONOMY", value: discovered ? selected.economy.toUpperCase() : "UNKNOWN" },
      { label: "HAZARD", value: discovered ? formatMapValue(selected.hazardTag).toUpperCase() : "UNKNOWN", color: discovered ? (selected.hazardLevel > 5 ? THEME.colors.danger : THEME.colors.success) : THEME.colors.textDim },
      { label: "ROUTE", value: routeValidity.label.toUpperCase(), color: routeValidity.state === "valid" ? THEME.colors.success : routeValidity.state === "warning" ? THEME.colors.warning : THEME.colors.danger },
    ];

    if (this.narrow) {
      // Compact 2-column grid of details inside the detail strip.
      const grid = details;
      const cellW = (detailW - 24) / 2;
      grid.forEach((d, i) => {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = detailX + 12 + col * cellW;
        const y = detailY + 42 + row * 18;
        this.drawText(d.label, x, y, { size: 9, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
        this.drawText(d.value, x + cellW - 12, y, { align: "right", size: 9, font: THEME.fonts.mono, color: d.color ?? THEME.colors.textPrimary });
      });
      if (discovered) {
        this.drawText(selected.profile.localDescriptor.toUpperCase(), detailX + 12, detailY + 42 + 3 * 18, { size: 9, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
      }
    } else {
      details.forEach((d, i) => {
        const dy = detailY + 64 + i * 28;
        this.drawText(d.label, detailX + 16, dy, { size: 10, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
        this.drawText(d.value, detailX + detailW - 16, dy, { align: "right", size: 10, font: THEME.fonts.mono, color: d.color ?? THEME.colors.textPrimary });
      });
      if (discovered) {
        this.drawText(selected.profile.localDescriptor.toUpperCase(), detailX + 16, detailY + 64 + 5 * 28, { size: 11, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
      }
    }

    if (this.narrow) {
      this.button("map-jump", "JUMP [Enter]", detailX, detailY + detailH + 8, detailW, 36);
      this.button("map-back", "CLOSE MAP [Esc]", this.width / 2 - 90, panelY + panelH - 44, 180, 32);
    } else {
      this.button("map-jump", "ENGAGE JUMP DRIVE [Enter]", detailX, detailY + 210, detailW, 44);
      this.button("map-back", "CLOSE MAP [Esc]", this.width / 2 - 100, this.height * 0.78, 200, 40);
    }

    const filterY = this.narrow ? mapY - 8 : this.height * 0.18;
    this.drawText(`Systems: ${matches.length}/${state.systems.length}`, mapX, filterY, {
      align: "left", color: THEME.colors.textSecondary, size: 11, font: THEME.fonts.mono
    });

    // Map filters row
    const filters = [
      { id: "map-filter-hazard", label: "HAZ", value: state.mapFilters.hazard },
      { id: "map-filter-economy", label: "ECO", value: state.mapFilters.economy },
      { id: "map-filter-government", label: "GOV", value: state.mapFilters.government },
      { id: "map-filter-opportunity", label: "OPP", value: state.mapFilters.opportunity },
      { id: "map-filter-discovery", label: "DISC", value: state.mapFilters.discovery },
      { id: "map-filter-service", label: "SVC", value: state.mapFilters.service },
      { id: "map-filter-systemClass", label: this.narrow ? "CL" : "CLASS", value: state.mapFilters.systemClass },
      { id: "map-filter-clear", label: "CLEAR", value: "" }
    ];

    const fbW = this.narrow ? 42 : 74;
    const fbH = this.narrow ? 24 : 28;
    const fbGap = this.narrow ? 2 : 6;
    const fbY = this.narrow ? mapY + mapH + 8 : mapY + mapH + 12;
    const fbStartX = mapX;

    filters.forEach((f, i) => {
      const fx = fbStartX + i * (fbW + fbGap);
      const active = f.id === "map-filter-clear" ? false : f.value !== "all";
      const label = f.id === "map-filter-clear" ? "CLR" : `${f.label}:${active ? f.value.slice(0, 3).toUpperCase() : "ALL"}`;
      this.button(f.id, label, fx, fbY, fbW, fbH);
    });
  }

  private renderDocking(state: RenderState): void {
    const progress = Math.round(state.dockingProgress * 100);
    this.panel(this.width / 2 - 210, this.height / 2 - 92, 420, 184);
    this.drawText("DOCKING SEQUENCE", this.width / 2, this.height / 2 - 44, {
      align: "center", color: THEME.colors.textPrimary, size: 24, font: THEME.fonts.accent
    });

    this.drawProgressBar(this.width / 2 - 150, this.height / 2 - 4, 300, 18, state.dockingProgress, THEME.colors.accentTeal);
    this.drawText(`${progress}%`, this.width / 2, this.height / 2 + 42, {
      align: "center", color: THEME.colors.textPrimary, font: THEME.fonts.mono
    });
  }

  private renderDocked(state: RenderState): void {
    const panelX = this.narrow ? 8 : this.width * 0.2;
    const panelY = this.narrow ? 12 : this.height * 0.1;
    const panelW = this.narrow ? this.width - 16 : this.width * 0.6;
    const panelH = this.narrow ? this.height - 24 : this.height * 0.68;
    this.panel(panelX, panelY, panelW, panelH);

    const system = state.systems[state.player.currentSystemId];
    const profile = getStationProfile(system);
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? THEME.colors.danger : hullFraction < 0.6 ? THEME.colors.warning : THEME.colors.success;
    const repLabel = getReputationLabel(state.player.reputation);
    const riskLabel = getLegalRiskLabel(state.player.legalRisk);
    const riskColor = state.player.legalRisk >= 5 ? THEME.colors.danger : state.player.legalRisk >= 2 ? THEME.colors.warning : THEME.colors.success;

    const titleY = panelY + (this.narrow ? 32 : this.height * 0.18 - panelY);
    const titleSize = this.narrow ? 18 : 28;
    this.drawText(`${system.name.toUpperCase()} STATION`, this.width / 2, titleY, {
      align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    // Use wrapped subtitle so long station hints don't clip on phones.
    const subtitle = `${profile.label} · ${system.stationHint}`;
    const subtitleSize = this.narrow ? 11 : 14;
    const subtitleY = titleY + (this.narrow ? 22 : 36);
    this.ctx.font = `${subtitleSize}px ${THEME.fonts.primary}`;
    const subLines = wrapText(this.ctx, subtitle, panelW - 32);
    subLines.forEach((line, i) => {
      this.drawText(line, this.width / 2, subtitleY + i * (subtitleSize + 4), {
        align: "center", color: THEME.colors.accentTeal, font: THEME.fonts.primary, size: subtitleSize
      });
    });

    const infoY = subtitleY + subLines.length * (subtitleSize + 4) + (this.narrow ? 14 : 32);
    const infoSize = this.narrow ? 11 : 14;
    const infoGap = this.narrow ? 22 : 32;
    this.drawText(`PILOT RANK: ${state.pilotRank.title}`, this.width / 2, infoY, {
      align: "center", color: THEME.colors.accentPink, size: infoSize, font: THEME.fonts.mono
    });
    this.drawText(
      `HULL: ${Math.round(state.player.hull)}/${state.player.maxHull}   BAL: ${Math.round(state.player.balance)}`,
      this.width / 2, infoY + infoGap, { align: "center", color: hullColor, size: infoSize, font: THEME.fonts.mono }
    );
    this.drawText(
      `REPUTATION: ${repLabel}   STATUS: ${riskLabel}`,
      this.width / 2, infoY + infoGap * 2, { align: "center", color: riskColor, size: infoSize - 2, font: THEME.fonts.mono }
    );

    if (state.player.activeMission) {
      const am = state.player.activeMission;
      const dest = state.systems[am.destinationSystemId]?.name ?? "unknown";
      const missionText = `ACTIVE: ${am.title} → ${dest}`;
      this.ctx.font = `${infoSize - 2}px ${THEME.fonts.mono}`;
      const missionLines = wrapText(this.ctx, missionText, panelW - 32);
      missionLines.forEach((line, i) => {
        this.drawText(line, this.width / 2, infoY + infoGap * 3 + i * (infoSize + 2), {
          align: "center", color: THEME.colors.accentAmber, size: infoSize - 2, font: THEME.fonts.mono
        });
      });
    }

    if (this.signalGlassUi) {
      const repairCost = calcRepairCost(state.player, profile.repairCostModifier);
      const recommendation = getStationRecommendation(state.player, system, state.market, repairCost);
      const recW = this.narrow ? panelW - 32 : Math.min(520, panelW - 64);
      const recX = this.width / 2 - recW / 2;
      const recY = this.narrow ? panelY + panelH - 322 : this.height * 0.52;
      this.signalPanel(recX, recY, recW, this.narrow ? 62 : 70, "base");
      this.drawText("RECOMMENDED NEXT ACTION", recX + 14, recY + 16, {
        color: SIGNAL_GLASS_THEME.colors.textMuted, size: 9, font: THEME.fonts.mono
      });
      this.drawText(recommendation.title.toUpperCase(), recX + 14, recY + (this.narrow ? 34 : 38), {
        color: SIGNAL_GLASS_THEME.colors.accent2, size: this.narrow ? 12 : 14, font: THEME.fonts.accent
      });
      this.drawText(recommendation.detail.toUpperCase(), recX + 14, recY + (this.narrow ? 50 : 56), {
        color: SIGNAL_GLASS_THEME.colors.textMuted, size: this.narrow ? 8 : 10, font: THEME.fonts.mono
      });
    }

    if (this.narrow) {
      // Two-column grid of station service buttons that fits at 390px.
      const cols = 2;
      const buttonsTop = panelY + panelH - 240;
      const bgap = 8;
      const bw = (panelW - 32 - bgap * (cols - 1)) / cols;
      const bh = 36;
      const labels = this.signalGlassUi
        ? getStationServiceTiles(system).map((tile) => [tile.id, tile.available ? tile.shortLabel : `${tile.shortLabel} LOCKED`] as [string, string])
        : [
            ["touch-trade", "MARKET"],
            ["touch-equipment", "EQUIPMENT"],
            ["touch-shipyard", "SHIPS"],
            ["touch-missions", "MISSIONS"],
            ["help", "HELP"],
          ] as Array<[string, string]>;
      labels.forEach((entry, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const bx = panelX + 16 + col * (bw + bgap);
        const by = buttonsTop + row * (bh + bgap);
        this.button(entry[0], entry[1], bx, by, bw, bh);
      });
      const launchY = buttonsTop + Math.ceil(labels.length / cols) * (bh + bgap) + 8;
      this.button("touch-dock", "LAUNCH", panelX + 16, launchY, panelW - 32, bh + 4);
    } else {
      const y = this.height * 0.67;
      const bw = 84;
      const bgap = 10;
      const tiles = this.signalGlassUi ? getStationServiceTiles(system) : null;
      const totalW = bw * 6 + bgap * 5;
      const startX = this.width / 2 - totalW / 2;
      const labels: Array<[string, string]> = tiles
        ? tiles.map((tile) => [tile.id, tile.available ? tile.shortLabel : "LOCKED"])
        : [["touch-trade", "MARKET"], ["touch-equipment", "EQUIPMENT"], ["touch-shipyard", "SHIPS"], ["touch-missions", "MISSIONS"], ["help", "HELP"], ["touch-dock", "LAUNCH"]];
      labels.slice(0, 5).forEach(([id, label], index) => {
        this.button(id, label, startX + (bw + bgap) * index, y, bw, 42);
        if (tiles && tiles[index] && !tiles[index].available) {
          this.drawText(tiles[index].why.toUpperCase(), startX + (bw + bgap) * index + bw / 2, y + 56, {
            align: "center", color: SIGNAL_GLASS_THEME.colors.textDim, size: 7, font: THEME.fonts.mono
          });
        }
      });
      this.button("touch-dock", "LAUNCH", startX + (bw + bgap) * 5, y, bw, 42);
    }
  }

  private renderTrade(state: RenderState): void {
    const panelX = this.narrow ? 8 : this.width * 0.06;
    const panelY = this.narrow ? 12 : this.height * 0.08;
    const panelW = this.narrow ? this.width - 16 : this.width * 0.88;
    const panelH = this.narrow ? this.height - 24 : this.height * 0.84;
    this.panel(panelX, panelY, panelW, panelH);

    const cargoUsed = getTotalOccupiedCargo(state.player);
    const shipStats = getPlayerShipStats(state.player);
    const missionCargo = state.player.missionCargoUnits ?? 0;
    const cargoLabel = missionCargo > 0
      ? `${cargoUsed}/${state.player.cargoCapacity} (${missionCargo} Mission)`
      : `${cargoUsed}/${state.player.cargoCapacity}`;

    const titleSize = this.narrow ? 18 : 24;
    const titleY = panelY + (this.narrow ? 28 : 40);
    this.drawText("STATION MARKET", this.width / 2, titleY, {
      align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const summaryY = titleY + (this.narrow ? 22 : 28);
    const summaryText = this.narrow
      ? `${Math.round(state.player.balance)} BAL · ${cargoLabel} · FUEL ${state.player.fuel.toFixed(1)}/${shipStats.fuelCapacity.toFixed(1)}`
      : `BALANCE: ${Math.round(state.player.balance)} BAL · CARGO: ${cargoLabel} · FUEL: ${state.player.fuel.toFixed(1)}/${shipStats.fuelCapacity.toFixed(1)}`;
    this.drawText(summaryText, this.width / 2, summaryY, {
      align: "center", color: THEME.colors.accentTeal, font: THEME.fonts.mono, size: this.narrow ? 10 : 12
    });

    const top = summaryY + (this.narrow ? 32 : 40);
    const rowH = this.narrow ? 30 : 32;
    const rowGap = this.narrow ? 32 : 36;
    const rowW = panelW - 16;
    const rowLeft = panelX + 8;
    const headerColor = THEME.colors.accentPink;
    const headerFont = THEME.fonts.mono;

    if (this.narrow) {
      // 4 narrow columns: NAME, PRICE, HELD, P/L. QTY removed for space.
      const colName = rowLeft + 8;
      const colPrice = rowLeft + rowW * 0.44;
      const colHeld = rowLeft + rowW * 0.7;
      const colPL = rowLeft + rowW - 8;
      this.drawText("ITEM", colName, top - 16, { color: headerColor, font: headerFont, size: 9 });
      this.drawText("BAL", colPrice, top - 16, { align: "right", color: headerColor, font: headerFont, size: 9 });
      this.drawText("HELD", colHeld, top - 16, { align: "right", color: headerColor, font: headerFont, size: 9 });
      this.drawText("P/L", colPL, top - 16, { align: "right", color: headerColor, font: headerFont, size: 9 });

      state.market.forEach((item, index) => {
        const y = top + index * rowGap;
        const rowY = y - 14;
        const hovered = isPointInRect(state.mousePosition, rowLeft, rowY, rowW, rowH);
        if (hovered) {
          this.ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
          this.ctx.beginPath();
          this.ctx.roundRect(rowLeft, rowY, rowW, rowH, 4);
          this.ctx.fill();
        }
        this.buttonZones.push({ id: `trade-row-${index}`, label: item.name, x: rowLeft, y: rowY, width: rowW, height: rowH });

        const prevPrice = state.previousPrices[item.id];
        const trend = getPriceTrend(prevPrice, item.price);
        const priceColor = trend.label === "rising" ? THEME.colors.danger : trend.label === "falling" ? THEME.colors.success : THEME.colors.textPrimary;
        const arrow = trend.label === "rising" ? "↑" : trend.label === "falling" ? "↓" : " ";
        const held = state.player.cargo[item.id] ?? 0;
        const pl = this.formatProfitLoss(held, state.player.cargoCostBasis[item.id], item.price, true);

        this.drawText(item.name.toUpperCase(), colName, y, { size: 12, font: THEME.fonts.accent, color: THEME.colors.textPrimary });
        this.drawText(`${arrow}${item.price}`, colPrice, y, { align: "right", size: 11, font: THEME.fonts.mono, color: priceColor });
        this.drawText(`${held}`, colHeld, y, { align: "right", size: 11, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
        this.drawText(pl.text, colPL, y, { align: "right", size: 11, font: THEME.fonts.mono, color: pl.color });
      });

      const buyFuelY = panelY + panelH - 80;
      this.button("trade-fuel", `BUY FUEL [F]`, panelX + 8, buyFuelY, panelW - 16, 36);
      this.drawText("TAP BUY · LONG-TAP SELL · F REFUEL · ESC BACK", this.width / 2, panelY + panelH - 28, {
        align: "center", color: THEME.colors.textDim, size: 9, font: THEME.fonts.mono
      });
    } else {
      const left = this.width * 0.12;
      const headerSize = 10;
      this.drawText("ID", left, top - 28, { color: headerColor, font: headerFont, size: headerSize });
      this.drawText("COMMODITY", left + 50, top - 28, { color: headerColor, font: headerFont, size: headerSize });
      this.drawText("PRICE", left + 260, top - 28, { color: headerColor, font: headerFont, size: headerSize });
      this.drawText("TREND", left + 340, top - 28, { color: headerColor, font: headerFont, size: headerSize });
      this.drawText("SUPPLY", left + 430, top - 28, { color: headerColor, font: headerFont, size: headerSize });
      this.drawText("HELD", left + 520, top - 28, { color: headerColor, font: headerFont, size: headerSize });
      this.drawText("P/L", left + 610, top - 28, { color: headerColor, font: headerFont, size: headerSize });

      const wideRowW = this.width * 0.76;
      state.market.forEach((item, index) => {
        const y = top + index * 36;
        const rowY = y - 16;
        const hovered = isPointInRect(state.mousePosition, left, rowY, wideRowW, 32);

        if (hovered) {
          this.ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
          this.ctx.beginPath();
          this.ctx.roundRect(left - 8, rowY, wideRowW + 16, 32, 4);
          this.ctx.fill();
        }

        this.buttonZones.push({ id: `trade-row-${index}`, label: item.name, x: left, y: rowY, width: wideRowW, height: 32 });

        const prevPrice = state.previousPrices[item.id];
        const trend = getPriceTrend(prevPrice, item.price);
        const trendColor = trend.label === "rising" ? THEME.colors.danger : trend.label === "falling" ? THEME.colors.success : THEME.colors.textDim;
        const trendText = trend.label === "unknown" || trend.label === "stable"
          ? "—"
          : `${trend.symbol}${trend.delta > 0 ? "+" : ""}${trend.delta}%`;

        const rowFont = THEME.fonts.mono;
        const rowSize = 13;
        const held = state.player.cargo[item.id] ?? 0;
        const pl = this.formatProfitLoss(held, state.player.cargoCostBasis[item.id], item.price, false);

        this.drawText(`${index + 1}`, left, y, { size: rowSize, font: rowFont, color: THEME.colors.textDim });
        this.drawText(item.name.toUpperCase(), left + 50, y, { size: rowSize, font: THEME.fonts.accent, color: THEME.colors.textPrimary });
        this.drawText(`${item.price}`, left + 260, y, { size: rowSize, font: rowFont });
        this.drawText(trendText, left + 340, y, { size: 12, font: rowFont, color: trendColor });
        this.drawText(`${item.quantity}`, left + 430, y, { size: rowSize, font: rowFont });
        this.drawText(`${held}`, left + 520, y, { size: rowSize, font: rowFont, color: THEME.colors.accentAmber });
        this.drawText(pl.text, left + 610, y, { size: rowSize, font: rowFont, color: pl.color });
      });

      this.drawText(
        "CLICK BUY · SHIFT+CLICK SELL · ALT+CLICK MAX · F REFUEL · ESC BACK",
        this.width / 2, this.height * 0.84, { align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono }
      );
    }
  }

  private renderEquipment(state: RenderState): void {
    const panelX = this.narrow ? 8 : this.width * 0.08;
    const panelY = this.narrow ? 12 : this.height * 0.1;
    const panelW = this.narrow ? this.width - 16 : this.width * 0.84;
    const panelH = this.narrow ? this.height - 24 : this.height * 0.82;
    this.panel(panelX, panelY, panelW, panelH);

    const titleSize = this.narrow ? 18 : 24;
    const titleY = panelY + (this.narrow ? 28 : 56);
    this.drawText("EQUIPMENT BAY", this.width / 2, titleY, {
      align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const profile = getStationProfile(state.systems[state.player.currentSystemId]);
    const sections = classifyEquipment(state.player, profile);
    if (this.signalGlassUi) {
      this.drawText(
        `INSTALLED ${sections.installed.length} / AVAILABLE ${sections.available.length} / UNAVAILABLE ${sections.unavailable.length}`,
        this.width / 2,
        titleY + (this.narrow ? 20 : 28),
        { align: "center", color: SIGNAL_GLASS_THEME.colors.accent, size: this.narrow ? 9 : 11, font: THEME.fonts.mono }
      );
    }
    const filteredEquipment = state.equipmentCategoryFilter === "all"
      ? EQUIPMENT
      : EQUIPMENT.filter((e) => e.category === state.equipmentCategoryFilter);

    const pageSize = this.narrow ? 5 : 8;
    const pageCount = Math.max(1, Math.ceil(filteredEquipment.length / pageSize));
    const page = Math.max(0, Math.min(state.equipmentPage, pageCount - 1));
    const visibleEquipment = filteredEquipment.slice(page * pageSize, page * pageSize + pageSize);

    const left = this.narrow ? panelX + 12 : this.width * 0.14;
    const top = titleY + (this.narrow ? 36 : this.height * 0.26 - titleY);
    const rowW = this.narrow ? panelW - 24 : this.width * 0.72;
    const rowH = this.narrow ? 44 : 40;
    const rowSpacing = this.narrow ? 52 : 48;

    visibleEquipment.forEach((item, index) => {
      const installed = state.player.equipment[item.id];
      const stocked = isEquipmentAvailableAtStation(item, profile);
      const affordable = state.player.balance >= item.price;
      const y = top + index * rowSpacing;
      const rowY = y - 20;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);

      if (hovered && !installed && stocked) {
        this.ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
        this.ctx.beginPath();
        this.ctx.roundRect(left - 8, rowY, rowW + 16, rowH, 4);
        this.ctx.fill();
      }

      this.buttonZones.push({ id: `equip-row-${index}`, label: item.name, x: left, y: rowY, width: rowW, height: rowH });
      this.drawText(`${index + 1 + page * pageSize}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
      const nameSize = this.narrow ? 12 : 14;
      this.drawText(item.name.toUpperCase(), left + 22, y, {
        color: installed ? THEME.colors.accentTeal : THEME.colors.textPrimary, font: THEME.fonts.accent, size: nameSize
      });

      const status = installed ? "INSTALLED" : !stocked ? "UNAVAILABLE" : getEquipmentAffordability(state.player, item).toUpperCase();
      const statusColor = installed ? THEME.colors.accentTeal : !stocked || !affordable ? THEME.colors.textDim : THEME.colors.accentAmber;
      if (this.narrow) {
        // Status right-aligned; description on a second row.
        this.drawText(status, left + rowW - 8, y, { align: "right", color: statusColor, size: 10, font: THEME.fonts.mono });
        this.ctx.font = `10px ${THEME.fonts.primary}`;
        const descLines = wrapText(this.ctx, item.description, rowW - 24);
        if (descLines.length > 0) {
          this.drawText(descLines[0], left + 22, y + 16, { size: 10, color: THEME.colors.textSecondary });
        }
      } else {
        this.drawText(status, left + 260, y, { color: statusColor, size: 11, font: THEME.fonts.mono });
        this.drawText(item.description, left + 400, y, { size: 11, color: THEME.colors.textSecondary });
      }
    });

    const pageY = top + visibleEquipment.length * rowSpacing + 8;
    this.drawText(`PAGE ${page + 1}/${pageCount} · ${profile.label.toUpperCase()}`, left, pageY, {
      color: THEME.colors.accentTeal, size: 11, font: THEME.fonts.mono
    });

    const catLabel = `CAT: ${state.equipmentCategoryFilter.toUpperCase()}`;
    this.button("equip-category-cycle", catLabel, left + (this.narrow ? rowW - 252 : 440), pageY - 18, 100, 32);

    if (page > 0) this.button("equip-page-prev", "PREV", left + (this.narrow ? rowW - 148 : 548), pageY - 18, 70, 32);
    if (page < pageCount - 1) this.button("equip-page-next", "NEXT", left + (this.narrow ? rowW - 74 : 626), pageY - 18, 70, 32);

    const repairY = pageY + (this.narrow ? 56 : 44);
    const missing = state.player.maxHull - state.player.hull;
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? THEME.colors.danger : hullFraction < 0.6 ? THEME.colors.warning : THEME.colors.success;

    this.drawText(`HULL:`, left, repairY, { size: 12, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
    this.drawProgressBar(left + 48, repairY - 6, this.narrow ? 100 : 120, 12, hullFraction, hullColor);
    this.drawText(`${Math.round(state.player.hull)}/${state.player.maxHull}`, left + (this.narrow ? 158 : 178), repairY, { size: 11, font: THEME.fonts.mono, color: hullColor });

    if (missing > 0) {
      const repairCost = calcRepairCost(state.player, profile.repairCostModifier);
      const repairLabel = `REPAIR HULL (${repairCost} BAL) [H]`;
      if (this.narrow) {
        this.button("equip-repair", repairLabel, left, repairY + 18, rowW, 36);
      } else {
        this.button("equip-repair", repairLabel, left + 360, repairY - 18, 240, 36);
      }
    } else {
      const opLabel = "HULL FULLY OPERATIONAL";
      if (this.narrow) {
        this.drawText(opLabel, this.width / 2, repairY + 32, { align: "center", size: 11, font: THEME.fonts.accent, color: THEME.colors.success });
      } else {
        this.drawText(opLabel, left + 360, repairY, { size: 12, font: THEME.fonts.accent, color: THEME.colors.success });
      }
    }

    const footer = this.narrow ? "TAP TO BUY · N/P PAGES · H REPAIR" : "CLICK ROW TO PURCHASE · N/P PAGES · H REPAIR (HERE) · ESC BACK";
    this.drawText(footer, this.width / 2, panelY + panelH - 18, {
      align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono
    });
  }

  private renderShipyard(state: RenderState): void {
    const panelX = this.narrow ? 8 : this.width * 0.06;
    const panelY = this.narrow ? 12 : this.height * 0.08;
    const panelW = this.narrow ? this.width - 16 : this.width * 0.88;
    const panelH = this.narrow ? this.height - 24 : this.height * 0.84;
    this.panel(panelX, panelY, panelW, panelH);

    const currentShip = getPlayerShip(state.player.shipId);
    const selectedShip = getPlayerShip(state.selectedShipId);
    const currentStats = getPlayerShipStats(state.player);
    const selectedStats = getPlayerShipStats({ ...state.player, shipId: selectedShip.id });
    const comparison = getShipComparison(state.player, selectedShip.id);
    const cargoUsed = getTotalOccupiedCargo(state.player);
    const canAfford = state.player.balance >= selectedShip.price;
    const cargoFits = cargoUsed <= selectedStats.cargoCapacity;
    const alreadyCurrent = selectedShip.id === currentShip.id;

    const titleSize = this.narrow ? 18 : 24;
    const titleY = panelY + (this.narrow ? 28 : 56);
    this.drawText("SHIPYARD", this.width / 2, titleY, {
      align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });
    this.drawText(`${Math.round(state.player.balance)} BAL · CARGO ${cargoUsed}/${state.player.cargoCapacity}`,
      this.width / 2, titleY + (this.narrow ? 18 : 24),
      { align: "center", color: THEME.colors.accentTeal, font: THEME.fonts.mono, size: this.narrow ? 10 : 11 });
    if (this.signalGlassUi) {
      this.drawText(`COMPARISON READY / ${comparison.affordabilityLabel.toUpperCase()}`,
        this.width / 2, titleY + (this.narrow ? 34 : 42),
        { align: "center", color: SIGNAL_GLASS_THEME.colors.accent2, font: THEME.fonts.mono, size: this.narrow ? 9 : 10 });
    }

    const left = this.narrow ? panelX + 12 : this.width * 0.1;
    const listTop = titleY + (this.narrow ? 40 : 64);
    const listW = this.narrow ? panelW - 24 : this.width * 0.36;
    const rowSpacing = this.narrow ? 38 : 42;

    const filteredShips = PLAYER_SHIPS.filter((ship) => state.shipyardClassFilter === "all" || ship.classId === state.shipyardClassFilter);
    const pageSize = this.narrow ? 5 : 8;
    const pageCount = Math.max(1, Math.ceil(filteredShips.length / pageSize));
    const page = Math.max(0, Math.min(state.shipyardPage, pageCount - 1));
    const visibleShips = filteredShips.slice(page * pageSize, page * pageSize + pageSize);

    visibleShips.forEach((ship, index) => {
      const y = listTop + index * rowSpacing;
      const rowY = y - 16;
      const rowH = this.narrow ? 32 : 36;
      const selected = ship.id === selectedShip.id;

      if (selected || isPointInRect(state.mousePosition, left, rowY, listW, rowH)) {
        this.ctx.fillStyle = selected ? "rgba(255, 0, 127, 0.1)" : "rgba(0, 242, 255, 0.05)";
        this.ctx.beginPath();
        this.ctx.roundRect(left - 8, rowY, listW + 16, rowH, 4);
        this.ctx.fill();
        if (selected) {
          this.ctx.strokeStyle = THEME.colors.accentPink;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }

      this.buttonZones.push({ id: `ship-row-${index}`, label: ship.name, x: left, y: rowY, width: listW, height: rowH });
      this.drawText(`${index + 1}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
      const nameSize = this.narrow ? 12 : 14;
      this.drawText(ship.name.toUpperCase(), left + 22, y, {
        color: ship.id === currentShip.id ? THEME.colors.accentTeal : THEME.colors.textPrimary, font: THEME.fonts.accent, size: nameSize
      });
      this.drawText(ship.id === currentShip.id ? "ACTIVE" : `${ship.price} BAL`, left + listW - 8, y, {
        align: "right", size: 11, font: THEME.fonts.mono, color: ship.id === currentShip.id ? THEME.colors.accentTeal : THEME.colors.accentAmber
      });
    });

    const shipyardPageY = listTop + visibleShips.length * rowSpacing + (this.narrow ? 8 : 12);
    const filterLabel = `CLASS: ${state.shipyardClassFilter.toUpperCase()}`;
    this.button("shipyard-class-cycle", filterLabel, left, shipyardPageY - 14, 120, 28);
    if (page > 0) this.button("shipyard-page-prev", "PREV", left + 130, shipyardPageY - 14, 60, 28);
    if (page < pageCount - 1) this.button("shipyard-page-next", "NEXT", left + 200, shipyardPageY - 14, 60, 28);

    // On narrow viewports, render detail below the list; on wider screens, beside.
    const detailX = this.narrow ? panelX + 16 : this.width * 0.52;
    const detailY = this.narrow ? shipyardPageY + 32 : this.height * 0.27;
    const detailNameSize = this.narrow ? 16 : 24;
    const detailRoleSize = this.narrow ? 10 : 12;
    this.drawText(selectedShip.name.toUpperCase(), detailX, detailY, { color: THEME.colors.textPrimary, size: detailNameSize, font: THEME.fonts.accent });
    this.drawText(selectedShip.role.toUpperCase(), detailX, detailY + (this.narrow ? 18 : 32), { color: THEME.colors.accentTeal, size: detailRoleSize, font: THEME.fonts.mono });

    // Wrap description on narrow viewports.
    if (this.narrow) {
      this.ctx.font = `11px ${THEME.fonts.primary}`;
      const descLines = wrapText(this.ctx, selectedShip.description, panelW - 40).slice(0, 2);
      descLines.forEach((line, i) => {
        this.drawText(line, detailX, detailY + 36 + i * 14, { color: THEME.colors.textSecondary, size: 11 });
      });
    } else {
      this.drawText(selectedShip.description, detailX, detailY + 60, { color: THEME.colors.textSecondary, size: 12 });
    }

    const rows: Array<[string, string, string]> = [
      ["HULL", `${currentStats.maxHull}`, `${selectedStats.maxHull}`],
      ["SHIELD", `${currentStats.maxShield}`, `${selectedStats.maxShield}`],
      ["CARGO", `${currentStats.cargoCapacity}`, `${selectedStats.cargoCapacity}`],
      ["FUEL", currentStats.fuelCapacity.toFixed(1), selectedStats.fuelCapacity.toFixed(1)],
      ["RANGE", currentStats.maxJumpRange.toFixed(1), selectedStats.maxJumpRange.toFixed(1)],
      ["SPEED", currentStats.speedModifier.toFixed(2), selectedStats.speedModifier.toFixed(2)],
      ["HANDLING", currentStats.handlingModifier.toFixed(2), selectedStats.handlingModifier.toFixed(2)],
      ["COMBAT", currentStats.combatDamageModifier.toFixed(2), selectedStats.combatDamageModifier.toFixed(2)]
    ];

    const statsTop = detailY + (this.narrow ? 70 : 104);
    const colCurrent = detailX + (this.narrow ? panelW - 130 : 180);
    const colSelected = detailX + (this.narrow ? panelW - 60 : 280);
    const statSpacing = this.narrow ? 18 : 26;
    const headerSize = this.narrow ? 9 : 10;
    this.drawText("CUR", colCurrent, statsTop, { align: "right", color: THEME.colors.textDim, size: headerSize, font: THEME.fonts.mono });
    this.drawText("NEW", colSelected, statsTop, { align: "right", color: THEME.colors.textDim, size: headerSize, font: THEME.fonts.mono });

    rows.forEach(([label, current, selected], index) => {
      const y = statsTop + 18 + index * statSpacing;
      this.drawText(label, detailX, y, { size: this.narrow ? 10 : 11, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      this.drawText(current, colCurrent, y, { align: "right", size: this.narrow ? 10 : 11, font: THEME.fonts.mono });
      this.drawText(selected, colSelected, y, { align: "right", size: this.narrow ? 10 : 11, font: THEME.fonts.mono, color: compareColor(Number(selected), Number(current)) });
    });

    const warning = alreadyCurrent
      ? "SYSTEMS ACTIVE"
      : !canAfford
        ? comparison.affordabilityLabel.toUpperCase()
        : !cargoFits
          ? `CARGO OVERFLOW: ${comparison.cargoOverflow} UNITS`
          : "READY FOR ACQUISITION";

    const warningColor = alreadyCurrent ? THEME.colors.accentTeal : (!canAfford || !cargoFits ? THEME.colors.danger : THEME.colors.success);
    const purchaseY = panelY + panelH - (this.narrow ? 70 : this.height * 0.16);

    if (this.narrow) {
      this.drawText(warning, this.width / 2, purchaseY, {
        align: "center", size: 11, font: THEME.fonts.accent, color: warningColor
      });
      this.button("ship-buy", "PURCHASE [Enter]", panelX + 16, purchaseY + 12, panelW - 32, 38);
    } else {
      this.drawText(warning, detailX, this.height * 0.76, { size: 12, font: THEME.fonts.accent, color: warningColor });
      this.button("ship-buy", "PURCHASE [Enter]", detailX + 200, this.height * 0.735, 160, 42);
    }

    const footer = this.narrow ? "1-6 COMPARE · ENTER BUY · ESC BACK" : "CLICK HULL OR 1-6 TO COMPARE · ENTER PURCHASES · ESC BACK";
    this.drawText(footer, this.width / 2, panelY + panelH - 18, {
      align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono
    });
  }

  private renderMissions(state: RenderState): void {
    const panelX = this.narrow ? 8 : this.width * 0.06;
    const panelY = this.narrow ? 12 : this.height * 0.08;
    const panelW = this.narrow ? this.width - 16 : this.width * 0.88;
    const panelH = this.narrow ? this.height - 24 : this.height * 0.84;
    this.panel(panelX, panelY, panelW, panelH);

    const titleSize = this.narrow ? 18 : 24;
    const titleY = panelY + (this.narrow ? 28 : 48);
    this.drawText("MISSION BOARD", this.width / 2, titleY, {
      align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const active = state.player.activeMission;
    const activeY = titleY + (this.narrow ? 22 : 32);
    if (active) {
      const dest = state.systems[active.destinationSystemId]?.name ?? "unknown";
      const deadlineText = active.deadlineJumps >= 0 ? `${active.deadlineJumps}J LEFT` : "OPEN";
      const deadlineColor = active.deadlineJumps >= 0 && active.deadlineJumps <= 1 ? THEME.colors.danger : THEME.colors.accentTeal;
      this.ctx.font = `${this.narrow ? 10 : 11}px ${THEME.fonts.mono}`;
      const txt = `ACTIVE: ${active.title.toUpperCase()} → ${dest.toUpperCase()} [${deadlineText}]`;
      const lines = wrapText(this.ctx, txt, panelW - 24);
      lines.forEach((line, i) => {
        this.drawText(line, this.width / 2, activeY + i * 14, {
          align: "center", color: deadlineColor, font: THEME.fonts.mono, size: this.narrow ? 10 : 11
        });
      });
    } else {
      this.drawText("NO ACTIVE CONTRACTS.", this.width / 2, activeY, {
        align: "center", color: THEME.colors.textDim, font: THEME.fonts.mono, size: this.narrow ? 10 : 11
      });
    }

    const top = activeY + (this.narrow ? 28 : 64);
    const left = this.narrow ? panelX + 12 : this.width * 0.12;
    const rowW = this.narrow ? panelW - 24 : this.width * 0.76;
    const rowSpacing = this.narrow ? 56 : 62;
    const rowH = this.narrow ? 48 : 54;
    const maxRows = this.narrow ? Math.max(0, Math.floor((panelH - (top - panelY) - 40) / rowSpacing)) : state.missions.length;

    state.missions.slice(0, maxRows).forEach((mission, index) => {
      const y = top + index * rowSpacing;
      const rowY = y - 18;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);

      if (hovered && !active) {
        this.ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
        this.ctx.beginPath();
        this.ctx.roundRect(left - 8, rowY, rowW + 16, rowH, 4);
        this.ctx.fill();
      }

      this.buttonZones.push({ id: `mission-row-${index}`, label: mission.title, x: left, y: rowY, width: rowW, height: rowH });
      this.drawText(`${index + 1}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
      const cardState = getMissionCardState(state.player, mission);
      const cardColor = cardState.state === "acceptable"
        ? THEME.colors.success
        : cardState.state === "warning"
          ? THEME.colors.warning
          : THEME.colors.danger;

      const titleText = `${mission.typeLabel.toUpperCase()}: ${mission.title.toUpperCase()}`;
      if (this.narrow) {
        // Two-line stacked: title row + meta row.
        this.ctx.font = `12px ${THEME.fonts.accent}`;
        const tLines = wrapText(this.ctx, titleText, rowW - 90);
        this.drawText(tLines[0] ?? titleText, left + 22, y, { color: THEME.colors.textPrimary, size: 12, font: THEME.fonts.accent });
        this.drawText(`${mission.reward} BAL`, left + rowW - 8, y, { align: "right", color: THEME.colors.accentAmber, font: THEME.fonts.mono, size: 12 });
        const dest = state.systems[mission.destinationSystemId]?.name.toUpperCase() ?? "?";
        const cargoText = mission.cargoUnitsRequired > 0 ? `${mission.cargoUnitsRequired}T` : "0T";
        const deadlineText = mission.deadlineJumps >= 0 ? `${mission.deadlineJumps}J` : "OPEN";
        this.drawText(`→ ${dest} · ${cargoText} · ${deadlineText} · ${mission.riskLabel.toUpperCase()}`, left + 22, y + 18, {
          size: 10, color: THEME.colors.textSecondary, font: THEME.fonts.mono
        });
        this.drawText(cardState.label.toUpperCase(), left + rowW - 8, y + 34, {
          align: "right", size: 9, color: cardColor, font: THEME.fonts.mono
        });
      } else {
        this.drawText(titleText, left + 38, y, { color: THEME.colors.textPrimary, size: 14, font: THEME.fonts.accent });
        this.drawText(`${mission.reward} BAL`, left + 320, y, { color: THEME.colors.accentAmber, font: THEME.fonts.mono, size: 13 });
        const cargoText = mission.cargoUnitsRequired > 0 ? `${mission.cargoUnitsRequired}T CARGO` : "NO CARGO";
        const deadlineText = mission.deadlineJumps >= 0 ? `${mission.deadlineJumps}J LIMIT` : "OPEN";
        this.drawText(`${cargoText} · ${deadlineText} · ${mission.riskLabel.toUpperCase()} · ${cardState.label.toUpperCase()}`, left + 420, y, { size: 11, color: cardColor, font: THEME.fonts.mono });
        this.drawText(state.systems[mission.destinationSystemId]?.name.toUpperCase() ?? "?", left + 38, y + 20, { size: 11, color: THEME.colors.textSecondary, font: THEME.fonts.mono });
        this.drawText(`REP ${signed(mission.reputationChange)} / LEGAL ${signed(mission.legalRiskChange)} / ${cardState.slackLabel.toUpperCase()}`, left + 320, y + 20, { size: 11, color: THEME.colors.textDim, font: THEME.fonts.mono });
      }
    });

    const footer = this.narrow ? "TAP TO ACCEPT · ESC BACK" : "CLICK ROW OR 1-8 TO ACCEPT CONTRACT · ESC BACK";
    this.drawText(footer, this.width / 2, panelY + panelH - 18, {
      align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono
    });
  }

  private renderHelp(state: RenderState): void {
    const panelX = this.narrow ? 8 : this.width * 0.04;
    const panelY = this.narrow ? 12 : this.height * 0.06;
    const panelW = this.narrow ? this.width - 16 : this.width * 0.92;
    const panelH = this.narrow ? this.height - 24 : this.height * 0.88;
    this.panel(panelX, panelY, panelW, panelH);

    const titleSize = this.narrow ? 18 : 28;
    const titleY = panelY + (this.narrow ? 32 : 48);
    this.drawText("PILOT MANUAL", this.width / 2, titleY, {
      align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const sidebarW = this.narrow ? 110 : 220;
    const sidebarX = panelX + 12;
    const contentX = sidebarX + sidebarW + 16;
    const contentW = panelW - sidebarW - 40;
    const top = titleY + (this.narrow ? 28 : 64);

    const sidebarRowH = this.narrow ? 22 : 30;
    const sidebarFontSize = this.narrow ? 9 : 12;
    const helpQuery = state.helpSearchQuery ?? "";
    const helpSections = searchHelpContent(helpQuery);
    const visibleSections = helpSections.length > 0 ? helpSections : HELP_CONTENT;

    if (this.signalGlassUi) {
      const searchLabel = helpQuery
        ? `SEARCH "${helpQuery.toUpperCase()}" / ${helpSections.length} TOPICS`
        : "SEARCH MANUAL TOPICS";
      this.drawText(searchLabel, contentX, top - (this.narrow ? 14 : 24), {
        color: SIGNAL_GLASS_THEME.colors.accent, size: this.narrow ? 9 : 11, font: THEME.fonts.mono
      });
    }

    visibleSections.forEach((section, index) => {
      const y = top + index * sidebarRowH;
      const selected = section.id === state.helpSectionId;
      const rowY = y - sidebarRowH / 2;

      if (selected || isPointInRect(state.mousePosition, sidebarX, rowY, sidebarW, sidebarRowH)) {
        this.ctx.fillStyle = selected ? "rgba(255, 0, 127, 0.15)" : "rgba(0, 242, 255, 0.1)";
        this.ctx.beginPath();
        this.ctx.roundRect(sidebarX - 4, rowY, sidebarW, sidebarRowH, 4);
        this.ctx.fill();
        if (selected) {
          this.ctx.strokeStyle = THEME.colors.accentPink;
          this.ctx.lineWidth = 1;
          this.ctx.stroke();
        }
      }

      this.buttonZones.push({ id: `help-sidebar-${section.id}`, label: section.title, x: sidebarX, y: rowY, width: sidebarW, height: sidebarRowH });
      this.drawText(section.title.toUpperCase(), sidebarX + 8, y + 4, {
        color: selected ? THEME.colors.accentPink : THEME.colors.textPrimary,
        size: sidebarFontSize,
        font: THEME.fonts.accent
      });
    });

    const activeSection = HELP_CONTENT.find((s) => s.id === state.helpSectionId) ?? visibleSections[0] ?? HELP_CONTENT[0];
    const activePage = activeSection.pages[state.helpPageIndex] ?? activeSection.pages[0];

    this.drawText(activeSection.title.toUpperCase(), contentX, top, {
      color: THEME.colors.accentTeal, size: this.narrow ? 14 : 20, font: THEME.fonts.accent
    });

    this.drawText(activePage.heading.toUpperCase(), contentX, top + (this.narrow ? 24 : 36), {
      color: THEME.colors.textPrimary, size: this.narrow ? 12 : 16, font: THEME.fonts.accent
    });

    let bodyY = top + (this.narrow ? 48 : 72);
    const bodySize = this.narrow ? 10 : 13;
    const bodyGap = this.narrow ? 14 : 20;
    this.ctx.font = `${bodySize}px ${THEME.fonts.primary}`;
    activePage.body.forEach((line) => {
      const lines = wrapText(this.ctx, line, contentW);
      lines.forEach((l) => {
        this.drawText(l, contentX, bodyY, { size: bodySize, color: THEME.colors.textPrimary });
        bodyY += bodyGap;
      });
      bodyY += 6;
    });

    if (activePage.tips && activePage.tips.length > 0) {
      bodyY += 8;
      this.drawText("PRO TIPS:", contentX, bodyY, { color: THEME.colors.accentAmber, size: this.narrow ? 10 : 12, font: THEME.fonts.accent });
      bodyY += (this.narrow ? 18 : 24);
      activePage.tips.forEach((tip) => {
        const lines = wrapText(this.ctx, `· ${tip}`, contentW);
        lines.forEach((l) => {
          this.drawText(l, contentX, bodyY, { size: this.narrow ? 10 : 12, color: THEME.colors.accentAmber });
          bodyY += (this.narrow ? 14 : 18);
        });
      });
    }

    const navY = panelY + panelH - 74;
    const btnW = this.narrow ? 70 : 120;
    const btnH = 30;
    if (state.helpPageIndex > 0) {
      this.button("help-page-prev", "PREV", contentX, navY, btnW, btnH);
    }
    if (state.helpPageIndex < activeSection.pages.length - 1) {
      this.button("help-page-next", "NEXT", contentX + contentW - btnW, navY, btnW, btnH);
    }

    this.drawText(`PAGE ${state.helpPageIndex + 1} / ${activeSection.pages.length}`, contentX + contentW / 2, navY + 20, {
      align: "center", size: 10, font: THEME.fonts.mono, color: THEME.colors.textDim
    });

    this.button("help-close", "CLOSE [Esc]", this.width / 2 - 75, panelY + panelH - 34, 150, 28);
  }

  private renderPause(state: RenderState): void {
    const panelW = Math.min(360, this.width - 24);
    const panelH = this.short ? 240 : 280;
    const panelX = this.width / 2 - panelW / 2;
    const panelY = this.height / 2 - panelH / 2;
    this.panel(panelX, panelY, panelW, panelH);
    this.drawText("SESSION PAUSED", this.width / 2, panelY + 44, {
      align: "center", color: THEME.colors.textPrimary, size: this.narrow ? 22 : 28, font: THEME.fonts.accent
    });
    this.drawText("ENTER TO RESUME", this.width / 2, panelY + 80, { align: "center", font: THEME.fonts.mono, size: 13, color: THEME.colors.accentTeal });
    this.drawText("AUTO-SAVED DURING TRANSITS", this.width / 2, panelY + 110, {
      align: "center", color: THEME.colors.textSecondary, size: 11, font: THEME.fonts.mono
    });
    if (this.signalGlassUi) {
      this.drawText("SAVE CARD: SYSTEM / SHIP / CARGO / BAL / ACTIVE MISSION / LOADOUT", this.width / 2, panelY + 124, {
        align: "center", color: SIGNAL_GLASS_THEME.colors.textMuted, size: 9, font: THEME.fonts.mono
      });
    }
    this.drawText(`BALANCE: ${Math.round(state.player.balance)} BAL`, this.width / 2, panelY + 138, {
      align: "center", font: THEME.fonts.mono, size: 13, color: THEME.colors.accentAmber
    });
    const btnY = panelY + panelH - 110;
    const btnW = Math.min(100, (panelW - 48) / 3);
    this.button("pause-resume", "RESUME", panelX + 12, btnY, btnW, 38);
    this.button("help", "HELP", panelX + 12 + btnW + 12, btnY, btnW, 38);
    this.button("pause-settings", "CONFIG", panelX + 12 + (btnW + 12) * 2, btnY, btnW, 38);
    this.button("pause-menu", "ABORT TO MAIN MENU", panelX + 12, btnY + 50, panelW - 24, 34);
  }

  private renderSettings(state: RenderState): void {
    const panelW = Math.min(400, this.width - 24);
    const panelH = Math.min(360, this.height - 32);
    const panelX = this.width / 2 - panelW / 2;
    const panelY = this.height / 2 - panelH / 2;
    this.panel(panelX, panelY, panelW, panelH);
    this.drawText("SYSTEM SETTINGS", this.width / 2, panelY + 36, {
      align: "center", color: THEME.colors.textPrimary, size: this.narrow ? 20 : 24, font: THEME.fonts.accent
    });
    if (this.signalGlassUi) {
      this.drawText("DISPLAY / AUDIO / CONTROLS", this.width / 2, panelY + 60, {
        align: "center", color: SIGNAL_GLASS_THEME.colors.accent, size: 10, font: THEME.fonts.mono
      });
    }

    const left = panelX + 20;
    const top = panelY + 80;
    const innerW = panelW - 40;

    // SFX Volume
    this.drawText("SFX VOLUME", left, top, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentTeal });
    this.drawProgressBar(left, top + 16, innerW, 12, state.sfxVolume, THEME.colors.accentTeal);
    this.button("settings-sfx-down", "-", left + innerW - 76, top - 6, 36, 28);
    this.button("settings-sfx-up", "+", left + innerW - 36, top - 6, 36, 28);

    // Music Volume
    this.drawText("MUSIC VOLUME", left, top + 70, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentPink });
    this.drawProgressBar(left, top + 86, innerW, 12, state.musicVolume, THEME.colors.accentPink);
    this.button("settings-music-down", "-", left + innerW - 76, top + 64, 36, 28);
    this.button("settings-music-up", "+", left + innerW - 36, top + 64, 36, 28);

    // Other settings
    this.drawText("PHOSPHOR GLOW", left, top + 140, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
    this.button("settings-glow", state.phosphorGlow ? "ENABLED" : "DISABLED", left + innerW - 120, top + 128, 120, 30);

    this.drawText("AUDIO OUTPUT", left, top + 190, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentViolet });
    this.button("settings-mute", state.audioMuted ? "MUTED" : "ACTIVE", left + innerW - 120, top + 178, 120, 30);

    this.button("settings-back", "CLOSE [Esc]", panelX + panelW / 2 - 100, panelY + panelH - 56, 200, 38);
  }

  private renderGameOver(state: RenderState): void {
    const panelW = Math.min(560, this.width * 0.9);
    const panelH = 480;
    const px = this.width / 2 - panelW / 2;
    const py = this.height / 2 - panelH / 2;

    this.ctx.globalAlpha = 0.8;
    this.ctx.fillStyle = THEME.colors.bgDeep;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalAlpha = 1;

    this.panel(px, py, panelW, panelH);

    const cx = this.width / 2;
    let row = py + 42;
    const rowGap = 28;

    this.drawText("VESSEL CRITICAL FAILURE", cx, row, {
      align: "center", color: THEME.colors.danger, size: 28, font: THEME.fonts.accent
    });

    row += rowGap + 8;
    this.drawText(`FINAL PILOT RANK: ${state.pilotRank.title.toUpperCase()}`, cx, row, {
      align: "center", color: THEME.colors.accentPink, size: 18, font: THEME.fonts.accent
    });

    row += rowGap;
    this.drawText(`INCIDENT: ${state.runStats.causeOfDeath.toUpperCase()}`, cx, row, {
      align: "center", color: THEME.colors.accentAmber, size: 14, font: THEME.fonts.mono
    });

    row += rowGap + 12;

    const labelX = px + 48;
    const valueX = px + panelW - 48;
    const statRows: Array<[string, string]> = [
      ["TOTAL BAL EARNED", `${state.runStats.totalBalEarned} BAL`],
      ["FINAL BALANCE", `${Math.round(state.player.balance)} BAL`],
      ["STAR SYSTEMS VISITED", `${state.runStats.systemsVisited.length}`],
      ["JUMPS COMPLETED", `${state.runStats.jumpsCompleted}`],
      ["CONTRACTS COMPLETED", `${state.runStats.missionsCompleted}`],
      ["CONTRACTS FAILED", `${state.runStats.missionsFailed}`],
      ["HOSTILES NEUTRALIZED", `${state.runStats.enemiesDestroyed}`],
      ["TIME IN SERVICE", formatTimePlayed(state.runStats.timePlayed)],
    ];

    for (const [label, value] of statRows) {
      this.drawText(label, labelX, row, { align: "left", color: THEME.colors.textSecondary, size: 12, font: THEME.fonts.mono });
      this.drawText(value, valueX, row, { align: "right", color: THEME.colors.textPrimary, size: 12, font: THEME.fonts.mono });
      row += rowGap;
    }

    const pb = state.meta.personalBest?.totalBalEarned ?? 0;
    if (pb > 0 || state.isNewPersonalBest) {
      const pbLabel = state.isNewPersonalBest ? "NEW PERSONAL BEST ESTABLISHED!" : `PERSONAL BEST: ${pb} BAL`;
      const pbColor = state.isNewPersonalBest ? THEME.colors.accentTeal : THEME.colors.success;
      row += rowGap + 8;
      this.drawText(pbLabel, cx, row, { align: "center", color: pbColor, size: 13, font: THEME.fonts.accent });
    }
    if (this.signalGlassUi) {
      this.drawText("SUGGESTED NEXT ACTION: RESTART, DOCK EARLY, REPAIR BEFORE RISKY CORRIDORS", cx, py + panelH - 92, {
        align: "center", color: SIGNAL_GLASS_THEME.colors.accent2, size: 10, font: THEME.fonts.mono
      });
    }

    const btnRowY = py + panelH - 64;
    const gbw = 130;
    this.button("death-restart", "RESTART [R]", cx - gbw * 1.5 - 16, btnRowY, gbw, 42);
    this.button("help", "PILOT MANUAL", cx - gbw / 2, btnRowY, gbw, 42);
    this.button("death-menu", "MENU [Esc]", cx + gbw / 2 + 16, btnRowY, gbw, 42);
  }

  private renderOnboardingHint(state: RenderState, hint: HintId): void {
    const hintText = HINT_TEXT[hint];
    const padding = 12;
    const fontSize = this.narrow ? 11 : 13;
    const barW = Math.min(this.width - 32, 600);

    this.ctx.font = `${fontSize}px ${THEME.fonts.accent}`;
    const lines = wrapText(this.ctx, hintText.toUpperCase(), barW - padding * 2);
    const lineHeight = fontSize + 6;
    const barH = lineHeight * lines.length + padding * 2;
    const barX = this.width / 2 - barW / 2;

    const barY = getOnboardingHintY(state.mode, this.height, barH, this.narrow, Boolean(state.message));

    this.ctx.fillStyle = THEME.colors.bgGlass;
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barW, barH, 8);
    this.ctx.fill();

    this.setVectorStroke(THEME.colors.accentTeal, 1.5, true);
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barW, barH, 8);
    this.ctx.stroke();

    lines.forEach((line, i) => {
      this.drawText(line, this.width / 2, barY + padding + i * lineHeight + lineHeight / 2, {
        align: "center", color: THEME.colors.textPrimary, size: fontSize, font: THEME.fonts.accent
      });
    });

    this.buttonZones.push({ id: "hint-dismiss", label: "Dismiss hint", x: barX, y: barY, width: barW, height: barH });
  }

  private renderExplosion(effect: ExplosionEffect, player: PlayerState): void {
    const relPos = { x: effect.worldPosition.x - player.position.x, y: effect.worldPosition.y - player.position.y, z: effect.worldPosition.z - player.position.z };
    const point = this.project(relPos);
    if (!point.visible) return;
    const progress = effect.age / effect.maxAge;
    const alpha = 1 - progress;
    const baseRadius = Math.max(4, 32 * point.scale * 0.18);
    this.ctx.shadowBlur = 0;

    for (let ring = 0; ring < 3; ring += 1) {
      const rp = Math.min(1, (progress + ring * 0.25) % 1.0);
      const r = rp * baseRadius * 2.8;
      this.ctx.globalAlpha = Math.max(0, alpha * (1 - rp) * 0.8);
      this.ctx.strokeStyle = ring === 0 ? THEME.colors.accentAmber : (ring === 1 ? THEME.colors.accentPink : THEME.colors.accentViolet);
      this.ctx.lineWidth = 3 - ring * 0.8;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, Math.max(1, r), 0, Math.PI * 2);
      this.ctx.stroke();
    }

    const sparkCount = 10;
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = (Math.PI * 2 * i) / sparkCount + progress;
      const len = progress * baseRadius * 2.5;
      this.ctx.globalAlpha = Math.max(0, alpha * 0.8);
      this.ctx.strokeStyle = THEME.colors.textPrimary;
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();
      this.ctx.moveTo(point.x, point.y);
      this.ctx.lineTo(point.x + Math.cos(angle) * len, point.y + Math.sin(angle) * len);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }

  private renderHitFlash(intensity: number): void {
    const alpha = Math.min(0.25, intensity * 0.6);
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = THEME.colors.accentPink;
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalAlpha = 1;
  }

  private renderSignalGlassToast(message: string): void {
    const toast = createToastModel(message, { width: this.width, height: this.height });
    if (!toast) return;
    const colors = SIGNAL_GLASS_THEME.colors;
    const toneColor = toast.tone === "success"
      ? colors.success
      : toast.tone === "warning"
        ? colors.warning
        : toast.tone === "danger"
          ? colors.danger
          : colors.accent;

    this.signalPanel(toast.bounds.x, toast.bounds.y, toast.bounds.width, toast.bounds.height, "overlay");
    this.ctx.fillStyle = toneColor;
    this.ctx.beginPath();
    this.ctx.roundRect(toast.bounds.x + 10, toast.bounds.y + 10, 3, toast.bounds.height - 20, 2);
    this.ctx.fill();
    this.drawText(toast.text.toUpperCase(), toast.bounds.x + 24, toast.bounds.y + toast.bounds.height / 2, {
      color: colors.text,
      size: this.narrow ? 10 : 12,
      font: THEME.fonts.mono
    });
  }

  private project(point: Vector3): ProjectedPoint {
    const z = point.z + 120;
    if (z <= 2) return { x: 0, y: 0, visible: false, scale: 0 };
    const scale = Math.min(7, 280 / z);
    return {
      x: this.width / 2 + point.x * scale,
      y: this.height / 2 - point.y * scale,
      visible: true,
      scale
    };
  }

  private button(id: string, label: string, x: number, y: number, width: number, height: number): void {
    this.buttonZones.push({ id, label, x, y, width, height });

    if (this.signalGlassUi) {
      const hovered = isPointInRect(this.currentMousePosition, x, y, width, height);
      const lift = hovered && !this.reducedMotion ? -1 : 0;
      this.ctx.shadowBlur = hovered && !this.reducedMotion ? 8 : 0;
      this.ctx.shadowColor = hovered ? "rgba(108, 227, 214, 0.24)" : "transparent";
      this.ctx.fillStyle = hovered ? SIGNAL_GLASS_THEME.colors.surface3 : "rgba(14, 19, 32, 0.74)";
      this.ctx.beginPath();
      this.ctx.roundRect(x, y + lift, width, height, SIGNAL_GLASS_THEME.radius.control);
      this.ctx.fill();
      this.ctx.shadowBlur = 0;

      this.ctx.strokeStyle = hovered ? SIGNAL_GLASS_THEME.colors.focus : "rgba(108, 227, 214, 0.62)";
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.roundRect(x, y + lift, width, height, SIGNAL_GLASS_THEME.radius.control);
      this.ctx.stroke();

      this.ctx.fillStyle = "rgba(108, 227, 214, 0.9)";
      this.ctx.fillRect(x + 8, y + lift + height - 3, Math.max(12, width - 16), hovered ? 2 : 1.5);

      this.drawText(label, x + width / 2, y + lift + height / 2, {
        align: "center",
        color: SIGNAL_GLASS_THEME.colors.text,
        size: Math.min(13, Math.max(9, height * 0.32)),
        font: THEME.fonts.accent
      });
      return;
    }

    // Glass effect background
    this.ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 4);
    this.ctx.fill();

    this.setVectorStroke(THEME.colors.accentTeal, 1.5, false);
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 4);
    this.ctx.stroke();

    this.drawText(label, x + width / 2, y + height / 2, {
      align: "center",
      color: THEME.colors.textPrimary,
      size: 14,
      font: THEME.fonts.accent
    });
  }

  private panel(x: number, y: number, width: number, height: number): void {
    if (this.signalGlassUi) {
      this.signalPanel(x, y, width, height, "elevated");
      return;
    }

    this.ctx.fillStyle = THEME.colors.bgGlass;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 8);
    this.ctx.fill();

    this.setVectorStroke(THEME.colors.accentTeal, 1.5, true);
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 8);
    this.ctx.stroke();
  }

  private hudPanel(x: number, y: number, width: number, height: number): void {
    if (this.signalGlassUi) {
      this.signalPanel(x, y, width, height, "base");
      return;
    }

    this.ctx.fillStyle = "rgba(10, 14, 20, 0.4)";
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 4);
    this.ctx.fill();

    this.setVectorStroke("rgba(0, 242, 255, 0.3)", 1, false);
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 4);
    this.ctx.stroke();
  }

  private signalPanel(x: number, y: number, width: number, height: number, tier: "base" | "elevated" | "overlay"): void {
    const colors = SIGNAL_GLASS_THEME.colors;
    this.ctx.shadowBlur = tier === "elevated" ? 10 : 0;
    this.ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
    this.ctx.fillStyle = tier === "overlay" ? colors.surfaceOverlay : tier === "elevated" ? colors.surface2 : colors.surfaceGlass;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.panel);
    this.ctx.fill();
    this.ctx.shadowBlur = 0;

    this.ctx.strokeStyle = "rgba(230, 236, 245, 0.1)";
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.panel);
    this.ctx.stroke();

    this.ctx.strokeStyle = "rgba(108, 227, 214, 0.28)";
    this.ctx.beginPath();
    this.ctx.moveTo(x + SIGNAL_GLASS_THEME.radius.panel, y + 1);
    this.ctx.lineTo(x + width - SIGNAL_GLASS_THEME.radius.panel, y + 1);
    this.ctx.stroke();
  }

  private signalChip(x: number, y: number, width: number, height: number, label: string, color: string): void {
    this.ctx.fillStyle = "rgba(14, 19, 32, 0.78)";
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.chip);
    this.ctx.fill();
    this.ctx.strokeStyle = "rgba(230, 236, 245, 0.12)";
    this.ctx.lineWidth = 1;
    this.ctx.stroke();
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x + 8, y + height - 3, Math.max(20, width - 16), 1);

    const maxChars = Math.max(8, Math.floor(width / 8));
    const clipped = label.length > maxChars ? `${label.slice(0, maxChars - 1)}...` : label;
    this.drawText(clipped.toUpperCase(), x + width / 2, y + height / 2, {
      align: "center", color, size: this.narrow ? 9 : 10, font: THEME.fonts.mono
    });
  }

  private setVectorStroke(color: string, width: number, glow: boolean): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.shadowBlur = glow ? 12 : 0;
    this.ctx.shadowColor = glow ? color : "transparent";
  }

  private drawCenteredTitle(text: string, y: number): void {
    this.drawText(text, this.width / 2, y, {
      align: "center",
      color: THEME.colors.textPrimary,
      size: 48,
      font: THEME.fonts.accent
    });

    // Underline with neon glow
    this.setVectorStroke(THEME.colors.accentPink, 2, true);
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2 - 160, y + 24);
    this.ctx.lineTo(this.width / 2 + 160, y + 24);
    this.ctx.stroke();
  }

  private formatProfitLoss(held: number, avgPrice: number | undefined, currentPrice: number, isNarrow: boolean): { text: string; color: string } {
    if (held <= 0) return { text: "—", color: THEME.colors.textDim };
    if (avgPrice === undefined || avgPrice === 0) {
      return { text: isNarrow ? "?" : "Basis unknown", color: THEME.colors.textDim };
    }
    const badge = formatDeltaBadge(held, avgPrice, currentPrice);
    const color = badge.tone === "success" ? THEME.colors.success : badge.tone === "danger" ? THEME.colors.danger : THEME.colors.textPrimary;
    return { text: isNarrow ? badge.text.replace(" BAL / ", "/") : badge.text, color };
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    options: { align?: CanvasTextAlign; color?: string; size?: number; font?: string } = {}
  ): void {
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = "transparent";
    this.ctx.fillStyle = options.color ?? THEME.colors.textPrimary;
    this.ctx.font = `${options.size ?? 16}px ${options.font ?? THEME.fonts.primary}`;
    this.ctx.textAlign = options.align ?? "left";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText(text, x, y);
  }

  private createStars(): void {
    let seed = 123456;
    const next = (): number => {
      seed = (1103515245 * seed + 12345) >>> 0;
      return seed / 0xffffffff;
    };

    for (let index = 0; index < 170; index += 1) {
      this.stars.push({
        x: (next() - 0.5) * 180,
        y: (next() - 0.5) * 120,
        z: next() * 120
      });
    }
  }
}

function addPoint(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtractPoint(a: Vector3, b: Vector3): Vector3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function isPointInRect(
  point: { x: number; y: number } | null,
  x: number, y: number, w: number, h: number
): boolean {
  if (!point) return false;
  return point.x >= x && point.x <= x + w && point.y >= y && point.y <= y + h;
}

function formatMapValue(value: string): string {
  if (value === "all") return "all";
  return value.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}

function compareColor(selected: number, current: number): string {
  if (selected > current) return THEME.colors.success;
  if (selected < current) return THEME.colors.danger;
  return THEME.colors.textPrimary;
}

/**
 * Greedy word-wrap so onboarding/help text doesn't clip on narrow screens.
 * Assumes the canvas font is already set on `ctx`.
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}
