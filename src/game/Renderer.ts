import { SIGNAL_GLASS_TEXT_SIZES, SIGNAL_GLASS_THEME, THEME } from "./Theme";
import { isSignalGlassUiEnabled } from "./FeatureFlags";
import { createHudShellLayout, formatSystemChip } from "./UiHost";
import { getScreenPanelBounds, respectsReducedMotion, type PanelChromeLayout } from "./Layout";
import { filterSystems, getMapSystemVisualState, hasActiveMapFilter, isSystemDiscovered, matchesMapFilters, projectSystemToMap, type MapFilterState } from "./MapSearch";
import { getLegalRiskLabel } from "./Reputation";
import type { RankInfo } from "./Rank";
import type { RunStats } from "./RunStats";
import type { HintId } from "./Onboarding";
import { getPlayerShip, getPlayerShipStats } from "./Ships";
import type { HelpSectionId } from "./HelpContent";
import { getRouteValidity } from "./SignalGlassScreens";
import type { MessageLog, MessageKind } from "./TransientState";
import { computeBodies } from "./SystemBodies";
import { STATION_VERTICES, STATION_EDGES } from "./StationModel";
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
import { getTotalOccupiedCargo } from "./Trading";
import { canJump, getFuelRequired, getJumpDistance, UNIVERSE_CONSTANTS } from "./Universe";
import { addButtonZone, createButtonZoneCollector } from "./render/ButtonZones";
import {
  drawButton,
  drawHudPanel,
  drawPanel,
  drawProgressBar,
  drawSignalChip,
  drawSignalPanel,
  drawText,
  setVectorStroke,
  type SignalPanelTier,
  type TextDrawOptions
} from "./render/CanvasPrimitives";
import { createPanelChrome, drawFooterHint, drawHeaderActions, drawPanelHeader } from "./render/PanelChrome";
import { createRenderContext, updateRenderContext, type RenderContext } from "./render/RenderContext";
import {
  getCompactTouchControlRects,
  isModalPanelMode,
  NARROW_BREAKPOINT,
  NARROW_TOUCH_AREA
} from "./render/RendererLayout";
import { renderHelp } from "./render/overlays/HelpScreen";
import { renderOnboardingHint } from "./render/overlays/OnboardingHint";
import { renderTutorialBanner } from "./render/overlays/TutorialBanner";
import { renderControls } from "./render/screens/ControlsScreen";
import { renderGameOver } from "./render/screens/GameOverScreen";
import { renderPause } from "./render/screens/PauseScreen";
import { renderSettings } from "./render/screens/SettingsScreen";
import { renderStart } from "./render/screens/StartScreen";
import { renderDocked } from "./render/screens/station/DockedScreen";
import { renderEquipment } from "./render/screens/station/EquipmentScreen";
import { renderMissions } from "./render/screens/station/MissionsScreen";
import { renderShipyard } from "./render/screens/station/ShipyardScreen";
import { renderTrade } from "./render/screens/station/TradeScreen";

export { getCompactTouchControlRects, getOnboardingHintY, getTutorialBannerRect, isModalPanelMode } from "./render/RendererLayout";

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
  messageLog: MessageLog;
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
  tutorialHint?: string | null;
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
  /** False when a fine pointer device is detected — suppresses on-screen touch overlay in flight. */
  showTouchControls: boolean;
  /** True when the compact map filter sheet is expanded (mobile only). */
  mapFilterSheetOpen: boolean;
}

interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
  scale: number;
}

// Renderer owns dispatch; StartScreen owns the visible "Vector Space Trader" title.
export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly renderContext: RenderContext;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private readonly buttonZones = createButtonZoneCollector();
  private readonly stars: Vector3[] = [];
  private narrow = false;
  private signalGlassUi = isSignalGlassUiEnabled();
  private currentMousePosition: { x: number; y: number } | null = null;
  private reducedMotion = false;

  constructor(private readonly canvas: HTMLCanvasElement) {
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is not available");
    }

    this.ctx = context;
    this.renderContext = createRenderContext(context, this.buttonZones);
    this.createStars();
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  getButtons(): ButtonZone[] {
    return this.buttonZones.zones;
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
    this.syncRenderContext();
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

  private syncRenderContext(): void {
    updateRenderContext(this.renderContext, {
      width: this.width,
      height: this.height,
      narrow: this.narrow,
      signalGlassUi: this.signalGlassUi,
      reducedMotion: this.reducedMotion,
      currentMousePosition: this.currentMousePosition
    });
  }

  private addButtonZone(zone: ButtonZone): ButtonZone {
    return addButtonZone(this.buttonZones, zone);
  }

  render(state: RenderState): void {
    this.signalGlassUi = isSignalGlassUiEnabled();
    this.reducedMotion = respectsReducedMotion();
    this.currentMousePosition = state.mousePosition;
    this.buttonZones.reset();
    this.syncRenderContext();
    this.ctx.clearRect(0, 0, this.width, this.height);
    this.ctx.fillStyle = THEME.colors.bgDeep;
    this.ctx.fillRect(0, 0, this.width, this.height);

    if (state.mode === "start") renderStart(this.renderContext, state);
    else if (state.mode === "controls") renderControls(this.renderContext, state);
    else {
      this.renderFlightView(state);
      if (state.mode === "map") this.renderMap(state);
      if (state.mode === "docking") this.renderDocking(state);
      if (state.mode === "docked") renderDocked(this.renderContext, state);
      if (state.mode === "trade") renderTrade(this.renderContext, state);
      if (state.mode === "equipment") renderEquipment(this.renderContext, state);
      if (state.mode === "shipyard") renderShipyard(this.renderContext, state);
      if (state.mode === "missions") renderMissions(this.renderContext, state);
      if (state.mode === "help") renderHelp(this.renderContext, state);
      if (state.mode === "settings") renderSettings(this.renderContext, state);
      if (state.mode === "paused") renderPause(this.renderContext, state);
      if (state.mode === "gameOver") renderGameOver(this.renderContext, state);
      if (state.tutorialHint && !["help", "settings", "paused", "gameOver"].includes(state.mode)) {
        renderTutorialBanner(this.renderContext, state);
      }

      const activeHint = state.tutorialHint ? null : state.activeHint;
      // Shortcut strip and onboarding hints must not float over active panel screens.
      // Panel modes (map, trade, equipment, shipyard, missions, docked, help) own their
      // own footer with shortcut text, so the global strip is suppressed there.
      // True modal dialogs (paused, settings, gameOver) also suppress both layers.
      // Exception: shipyard allows the onboarding hint (positioned by getOnboardingHintY).
      // Docked owns equivalent service controls in its station panel, so it does not float a hint.
      if (!this.isOverlayMode(state.mode)) {
        this.renderModeHelpText(state);
        if (activeHint !== null) renderOnboardingHint(this.renderContext, state, activeHint);
      } else if (state.mode === "shipyard" && activeHint !== null) {
        renderOnboardingHint(this.renderContext, state, activeHint);
      }
    }
  }

  /**
   * Modal-style modes that should dim/hide the flight HUD and touch controls,
   * so station/trade/map screens never collide with cockpit affordances.
   */
  private isOverlayMode(mode: GameMode): boolean {
    return isModalPanelMode(mode);
  }

  private renderFlightView(state: RenderState): void {
    this.renderStars(state.player);
    this.renderSystemBodies(state);
    this.renderStation(state);
    this.renderShip(state.enemy, state.player, THEME.colors.accentPink, state.phosphorGlow);
    this.renderProjectiles(state.projectiles, state.player);
    if (state.explosionEffect) this.renderExplosion(state.explosionEffect, state.player);

    const overlayActive = this.isOverlayMode(state.mode);

    if (!overlayActive) {
      this.renderCockpitOverlay(state);
      if (this.signalGlassUi) this.renderSignalGlassHud(state);
      else this.renderHud(state);
      if (state.showTouchControls) this.renderTouchControls(state);
      if (state.playerHitFlash > 0) this.renderHitFlash(state.playerHitFlash);
      if (state.messageLog.entries.length > 0) {
        this.renderMessageLog(state.messageLog);
      }
    } else {
      // Behind a modal panel: apply a solid dim over the wireframe vista so the
      // background does not visually compete with the active panel. The HUD is
      // intentionally suppressed — it bleeds through and distracts from panel
      // content. Touch controls are already excluded by the !overlayActive guard.
      this.ctx.fillStyle = "rgba(2, 4, 8, 0.62)";
      this.ctx.fillRect(0, 0, this.width, this.height);
      // HUD is NOT rendered here — even on desktop Signal Glass — because it
      // creates visual noise behind trade/equipment/map/mission panels.
    }
  }

  private msgKindColor(kind: MessageKind): string {
    if (kind === "success") return THEME.colors.accentTeal;
    if (kind === "warning") return THEME.colors.accentAmber;
    if (kind === "danger") return THEME.colors.accentPink;
    return THEME.colors.textPrimary;
  }

  private renderMessageLog(log: MessageLog): void {
    const entries = log.entries.slice(-5);
    if (entries.length === 0) return;

    const rowH = 18;
    const padX = 12;
    const padY = 5;
    const fontSize = 11;

    this.ctx.font = `${fontSize}px ${THEME.fonts.mono}`;
    let maxW = 0;
    for (const e of entries) {
      const m = this.ctx.measureText(e.text.toUpperCase());
      if (m.width > maxW) maxW = m.width;
    }
    const panelW = Math.min(this.width - 32, maxW + padX * 2);
    const panelH = entries.length * rowH + padY * 2;
    const panelX = this.width / 2 - panelW / 2;
    const panelY = this.narrow
      ? this.height - NARROW_TOUCH_AREA - panelH - 6
      : this.height - panelH - 38;

    this.ctx.fillStyle = "rgba(2, 4, 8, 0.65)";
    this.ctx.beginPath();
    this.ctx.roundRect(panelX, panelY, panelW, panelH, 4);
    this.ctx.fill();

    entries.forEach((entry, i) => {
      const alpha = 0.35 + (i / (entries.length - 1 || 1)) * 0.65;
      const color = this.msgKindColor(entry.kind);
      const ey = panelY + padY + i * rowH + rowH / 2;
      this.ctx.globalAlpha = alpha;
      this.drawText(entry.text.toUpperCase(), this.width / 2, ey, {
        align: "center", color, size: fontSize, font: THEME.fonts.mono
      });
    });
    this.ctx.globalAlpha = 1;
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

  private renderSystemBodies(state: RenderState): void {
    const bodies = computeBodies(state.player.currentSystemId, state.player.currentSystemId * 31337);
    for (const body of bodies) {
      const rel = {
        x: body.position.x - state.player.position.x,
        y: body.position.y - state.player.position.y,
        z: body.position.z - state.player.position.z,
      };
      const t = performance.now() * body.rotationRate;
      const cosT = Math.cos(t);
      const sinT = Math.sin(t);
      const rotated = body.vertices.map(v => ({
        x: v.x * cosT - v.z * sinT,
        y: v.y,
        z: v.x * sinT + v.z * cosT,
      }));
      const projected = rotated.map(v => this.project({
        x: v.x + rel.x,
        y: v.y + rel.y,
        z: v.z + rel.z,
      }));
      const color = body.kind === "sun" ? THEME.colors.accentAmber : THEME.colors.accentViolet;
      this.setVectorStroke(color, body.kind === "sun" ? 1.2 : 0.9, state.phosphorGlow);
      for (const [from, to] of body.edges) {
        const a = projected[from];
        const b = projected[to];
        if (!a.visible || !b.visible) continue;
        this.ctx.beginPath();
        this.ctx.moveTo(a.x, a.y);
        this.ctx.lineTo(b.x, b.y);
        this.ctx.stroke();
      }
    }
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
    // Determine scale from centre-projected point for the model display size.
    const centrePoint = this.project(relative);
    const modelScale = Math.max(2.2, Math.min(7, 22 * (centrePoint.scale || 0.3)));
    const t = performance.now() * 0.00018; // ring rotation rate
    const cosT = Math.cos(t);
    const sinT = Math.sin(t);

    this.setVectorStroke(THEME.colors.accentAmber, 1.2, state.phosphorGlow);

    // Separate the ring (first RING_COUNT verts) from fixed structure.
    // Ring vertices rotate; spire and trusses/beacons are static.
    const RING_COUNT = 12;
    const projected = STATION_VERTICES.map((v, idx) => {
      let wx = v.x;
      let wy = v.y;
      let wz = v.z;
      if (idx < RING_COUNT) {
        // Rotate the ring around Y
        wx = v.x * cosT - v.z * sinT;
        wz = v.x * sinT + v.z * cosT;
        wy = v.y;
      }
      return this.project({
        x: wx * modelScale + relative.x,
        y: wy * modelScale + relative.y,
        z: wz * modelScale + relative.z,
      });
    });

    for (const [from, to] of STATION_EDGES) {
      const a = projected[from];
      const b = projected[to];
      if (!a.visible || !b.visible) continue;
      this.ctx.beginPath();
      this.ctx.moveTo(a.x, a.y);
      this.ctx.lineTo(b.x, b.y);
      this.ctx.stroke();
    }
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
        this.drawText(cell.label, x, layout.vitals.y + 17, { size: SIGNAL_GLASS_TEXT_SIZES.hudTelemetry, font: THEME.fonts.mono, color: colors.textMuted });
        this.drawText(cell.value, x + cellW - 8, layout.vitals.y + 17, { align: "right", size: SIGNAL_GLASS_TEXT_SIZES.hudTelemetry, font: THEME.fonts.mono, color: colors.text });
        drawProgressBar(this.renderContext, x, layout.vitals.y + 34, cellW - 8, 4, cell.fraction, cell.color);
      });
      this.drawText(`${Math.round(state.player.balance)} BAL`, layout.vitals.x + 10, layout.vitals.y + 55, {
        size: SIGNAL_GLASS_TEXT_SIZES.hudTelemetry, font: THEME.fonts.mono, color: colors.accent2
      });
      this.drawText(`${cargo}/${state.player.cargoCapacity}`, layout.vitals.x + layout.vitals.width / 2, layout.vitals.y + 55, {
        align: "center", size: SIGNAL_GLASS_TEXT_SIZES.hudTelemetry, font: THEME.fonts.mono, color: colors.textMuted
      });
      this.drawText(riskLabel.toUpperCase(), layout.vitals.x + layout.vitals.width - 10, layout.vitals.y + 55, {
        align: "right", size: SIGNAL_GLASS_TEXT_SIZES.hudTelemetry, font: THEME.fonts.mono, color: riskColor
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
        drawProgressBar(this.renderContext, layout.vitals.x + 14, y + 12, layout.vitals.width - 28, 5, vital.fraction, vital.color);
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

    // Unified top capsule: system info on line 1, active mission on line 2.
    const cap = layout.topCapsule;
    this.signalPanel(cap.x, cap.y, cap.width, cap.height, "base");
    const systemLabel = formatSystemChip(system);
    if (layout.compact) {
      // Single line on mobile (height=32).
      const missionLabel = activeMission
        ? `  |  ${activeMission.title}`
        : "";
      this.drawText(`${systemLabel}${missionLabel}`, cap.x + cap.width / 2, cap.y + 20, {
        align: "center", size: 10, font: THEME.fonts.mono, color: colors.accent
      });
    } else {
      // Two lines on desktop (height=44).
      this.drawText(systemLabel, cap.x + 12, cap.y + 16, {
        size: 11, font: THEME.fonts.mono, color: colors.accent
      });
      const missionText = activeMission
        ? `${activeMission.title} → ${state.systems[activeMission.destinationSystemId]?.name ?? "?"}`
        : "No active mission";
      this.drawText(missionText, cap.x + 12, cap.y + 34, {
        size: 10, font: THEME.fonts.mono, color: activeMission ? colors.accent2 : colors.textMuted
      });
    }

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
      drawProgressBar(this.renderContext, 28, ty + 10, 186, 4, v.fraction, v.color);
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
      drawProgressBar(this.renderContext, cx, barY, cellW - 8, barH, cell.fraction, cell.color);
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
   *
   * In Signal Glass flight mode the top capsule occupies y=16..60 (desktop).
   * The strip is moved to y=68 so it sits cleanly below the capsule rather
   * than overlapping it. On mobile the strip stays at y=92 (below the HUD band).
   */
  private renderModeHelpText(state: RenderState): void {
    // Suppress the strip when an onboarding hint already occupies the bottom area.
    if (this.signalGlassUi && (state.activeHint !== null || state.tutorialHint)) return;
    const tips = this.getModeShortcuts(state);
    if (tips.length === 0) return;
    const text = tips.join("  ");
    const y = this.narrow
      ? 92
      : (this.signalGlassUi && state.mode === "flight" ? 68 : 24);
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

  private createPanelChrome(x: number, y: number, width: number, height: number): PanelChromeLayout {
    return createPanelChrome(this.renderContext, x, y, width, height);
  }

  /**
   * @param titleAvailableWidth Optional override for the horizontal span used to center the title.
   *   Pass `chrome.titleRow.width - chrome.headerActionRow.width - 8` on compact viewports where
   *   the action row overlaps the right portion of the title row (e.g. docked screen on mobile).
   */
  private drawPanelHeader(chrome: PanelChromeLayout, title: string, subtitle?: string, context?: string, titleAvailableWidth?: number): void {
    drawPanelHeader(this.renderContext, chrome, title, subtitle, context, titleAvailableWidth);
  }

  private drawHeaderActions(chrome: PanelChromeLayout, actions: Array<{ id: string; label: string; width?: number }>): void {
    drawHeaderActions(this.renderContext, chrome, actions);
  }

  private drawFooterHint(chrome: PanelChromeLayout, hint: string): void {
    drawFooterHint(this.renderContext, chrome, hint);
  }

  private renderMap(state: RenderState): void {
    const bounds = getScreenPanelBounds({ width: this.width, height: this.height }, "map");
    const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
    this.panel(panelX, panelY, panelW, panelH);
    const chrome = this.createPanelChrome(panelX, panelY, panelW, panelH);
    const matches = filterSystems(state.systems, state.mapFilters, state.player);
    this.drawPanelHeader(chrome, "UNIVERSE NAVIGATION", `SYSTEMS ${matches.length}/${state.systems.length}`, "SEARCH / FILTER / CLASS");
    this.drawHeaderActions(chrome, [
      { id: "help", label: "HELP [?]", width: this.narrow ? 66 : 92 },
      { id: "map-back", label: this.narrow ? "CLOSE" : "CLOSE MAP", width: this.narrow ? 72 : 112 }
    ]);

    const mapX = this.narrow ? chrome.contentBounds.x : chrome.contentBounds.x;
    const mapY = chrome.contentBounds.y + (this.narrow ? 4 : 8);
    const mapW = this.narrow ? chrome.contentBounds.width : chrome.contentBounds.width * 0.64;
    const mapH = this.narrow ? Math.min(this.height * 0.34, chrome.contentBounds.height * 0.55) : Math.min(this.height * 0.5, chrome.contentBounds.height - 16);

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

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(mapX, mapY, mapW, mapH);
    this.ctx.clip();

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
      this.addButtonZone({ id: `map-system-${system.id}`, label: system.name, x: point.x - hitR, y: point.y - hitR, width: hitR * 2, height: hitR * 2 });
    }
    this.ctx.restore();

    const detailX = this.narrow ? chrome.contentBounds.x : mapX + mapW + 18;
    const detailY = this.narrow ? mapY + mapH + 12 : mapY;
    const detailW = this.narrow ? chrome.contentBounds.width : Math.max(210, chrome.contentBounds.x + chrome.contentBounds.width - detailX);
    const detailH = this.narrow ? Math.min(118, Math.max(96, chrome.contentBounds.y + chrome.contentBounds.height - detailY - 6)) : mapH;

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
        this.drawText(d.label, x, y, { size: SIGNAL_GLASS_TEXT_SIZES.mapDetail, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
        this.drawText(d.value, x + cellW - 12, y, { align: "right", size: SIGNAL_GLASS_TEXT_SIZES.mapDetail, font: THEME.fonts.mono, color: d.color ?? THEME.colors.textPrimary });
      });
      if (discovered) {
        this.drawText(selected.profile.localDescriptor.toUpperCase(), detailX + 12, detailY + 42 + 3 * 18, { size: SIGNAL_GLASS_TEXT_SIZES.mapDetail, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
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
      this.button("map-jump", "JUMP [Enter]", chrome.footerPrimaryActionRow.x, chrome.footerPrimaryActionRow.y, chrome.footerPrimaryActionRow.width, chrome.footerPrimaryActionRow.height);
    } else {
      this.button("map-jump", "ENGAGE JUMP DRIVE [Enter]", detailX, chrome.footerPrimaryActionRow.y, Math.min(detailW, 280), chrome.footerPrimaryActionRow.height);
    }

    // Map filters
    const filterDefs = [
      { id: "map-filter-hazard", label: "HAZ", value: state.mapFilters.hazard },
      { id: "map-filter-economy", label: "ECO", value: state.mapFilters.economy },
      { id: "map-filter-government", label: "GOV", value: state.mapFilters.government },
      { id: "map-filter-opportunity", label: "OPP", value: state.mapFilters.opportunity },
      { id: "map-filter-discovery", label: "DISC", value: state.mapFilters.discovery },
      { id: "map-filter-service", label: "SVC", value: state.mapFilters.service },
      { id: "map-filter-systemClass", label: "CLASS", value: state.mapFilters.systemClass },
      { id: "map-filter-clear", label: "CLEAR", value: "" }
    ];

    if (this.narrow) {
      // R3: compact viewports collapse all filter chips into a single toggle button.
      // When the sheet is open, float the full 4×2 grid above the toggle row.
      const activeCount = filterDefs.filter((f) => f.id !== "map-filter-clear" && f.value !== "all").length;
      const toggleLabel = state.mapFilterSheetOpen
        ? "DONE"
        : activeCount > 0 ? `FILTERS [${activeCount}]` : "FILTERS";
      this.button(
        "map-filters-toggle",
        toggleLabel,
        chrome.footerSecondaryActionRow.x,
        chrome.footerSecondaryActionRow.y,
        chrome.footerSecondaryActionRow.width,
        chrome.footerSecondaryActionRow.height
      );

      if (state.mapFilterSheetOpen) {
        const cols = 4;
        const fbGap = 4;
        const fbH = 26;
        const fbW = Math.floor((chrome.footerSecondaryActionRow.width - fbGap * (cols - 1)) / cols);
        // Sheet floats above the toggle row.
        const sheetRows = 2;
        const sheetInnerH = sheetRows * fbH + (sheetRows - 1) * fbGap;
        const sheetPadY = 8;
        const sheetH = sheetInnerH + sheetPadY * 2;
        const sheetY = chrome.footerSecondaryActionRow.y - sheetH - 4;
        const sheetX = chrome.footerSecondaryActionRow.x;
        const sheetW = chrome.footerSecondaryActionRow.width;

        // Sheet background
        this.ctx.save();
        this.ctx.fillStyle = THEME.colors.bgDeep;
        this.ctx.globalAlpha = 0.92;
        this.ctx.beginPath();
        this.ctx.roundRect(sheetX, sheetY, sheetW, sheetH, SIGNAL_GLASS_THEME.radius.control);
        this.ctx.fill();
        this.ctx.restore();
        this.ctx.strokeStyle = "rgba(0, 242, 255, 0.18)";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(sheetX, sheetY, sheetW, sheetH, SIGNAL_GLASS_THEME.radius.control);
        this.ctx.stroke();

        const firstFbY = sheetY + sheetPadY;
        filterDefs.forEach((f, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const fx = sheetX + col * (fbW + fbGap);
          const fy = firstFbY + row * (fbH + fbGap);
          const active = f.id === "map-filter-clear" ? false : f.value !== "all";
          const label = f.id === "map-filter-clear" ? "CLR" : `${f.label}:${active ? f.value.slice(0, 3).toUpperCase() : "ALL"}`;
          this.button(f.id, label, fx, fy, fbW, fbH);
        });
      }
    } else {
      const fbGap = 6;
      const fbW = Math.floor((chrome.footerSecondaryActionRow.width - fbGap * (filterDefs.length - 1)) / filterDefs.length);
      const fbH = Math.min(30, chrome.footerSecondaryActionRow.height);
      const fbY = chrome.footerSecondaryActionRow.y + (chrome.footerSecondaryActionRow.height - fbH) / 2;
      const fbStartX = chrome.footerSecondaryActionRow.x;

      filterDefs.forEach((f, i) => {
        const fx = fbStartX + i * (fbW + fbGap);
        const active = f.id === "map-filter-clear" ? false : f.value !== "all";
        const label = f.id === "map-filter-clear" ? "CLR" : `${f.label}:${active ? f.value.slice(0, 3).toUpperCase() : "ALL"}`;
        this.button(f.id, label, fx, fbY, fbW, fbH);
      });
      this.drawFooterHint(chrome, "SEARCH SYSTEMS · FILTERS STAY CLEAR OF HEADER COMMANDS · ESC CLOSE");
    }
  }

  private renderDocking(state: RenderState): void {
    const progress = Math.round(state.dockingProgress * 100);
    this.panel(this.width / 2 - 210, this.height / 2 - 92, 420, 184);
    this.drawText("DOCKING SEQUENCE", this.width / 2, this.height / 2 - 44, {
      align: "center", color: THEME.colors.textPrimary, size: 24, font: THEME.fonts.accent
    });

    drawProgressBar(this.renderContext, this.width / 2 - 150, this.height / 2 - 4, 300, 18, state.dockingProgress, THEME.colors.accentTeal);
    this.drawText(`${progress}%`, this.width / 2, this.height / 2 + 42, {
      align: "center", color: THEME.colors.textPrimary, font: THEME.fonts.mono
    });
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
    drawButton(this.renderContext, id, label, x, y, width, height);
  }

  private panel(x: number, y: number, width: number, height: number): void {
    drawPanel(this.renderContext, x, y, width, height);
  }

  private hudPanel(x: number, y: number, width: number, height: number): void {
    drawHudPanel(this.renderContext, x, y, width, height);
  }

  private signalPanel(x: number, y: number, width: number, height: number, tier: SignalPanelTier): void {
    drawSignalPanel(this.renderContext, x, y, width, height, tier);
  }

  private signalChip(x: number, y: number, width: number, height: number, label: string, color: string): void {
    drawSignalChip(this.renderContext, x, y, width, height, label, color);
  }

  private setVectorStroke(color: string, width: number, glow: boolean): void {
    setVectorStroke(this.renderContext, color, width, glow);
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    options: TextDrawOptions = {}
  ): void {
    drawText(this.renderContext, text, x, y, options);
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

function formatMapValue(value: string): string {
  if (value === "all") return "all";
  return value.replace(/[A-Z]/g, (letter) => ` ${letter.toLowerCase()}`);
}
