import { THEME } from "./Theme";
import { EQUIPMENT, isEquipmentAvailableAtStation } from "./Equipment";
import { getPriceTrend } from "./Economy";
import { filterSystems, hasActiveMapFilter, isSystemDiscovered, matchesMapFilters, projectSystemToMap, type MapFilterState } from "./MapSearch";
import { getLegalRiskLabel, getReputationLabel } from "./Reputation";
import { HINT_TEXT } from "./Onboarding";
import { formatTimePlayed } from "./RunStats";
import type { RankInfo } from "./Rank";
import type { RunStats } from "./RunStats";
import type { HintId } from "./Onboarding";
import { getPlayerShip, getPlayerShipStats, PLAYER_SHIPS } from "./Ships";
import { getStationProfile } from "./StationServices";
import type {
  ButtonZone,
  CommodityId,
  EconomyState,
  GameMode,
  MarketItem,
  Meta,
  Mission,
  PlayerShipId,
  PlayerState,
  Projectile,
  Ship,
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
}

interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
  scale: number;
}

export class Renderer {
  private readonly ctx: CanvasRenderingContext2D;
  private width = 1;
  private height = 1;
  private pixelRatio = 1;
  private buttonZones: ButtonZone[] = [];
  private readonly stars: Vector3[] = [];

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
  }

  render(state: RenderState): void {
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
      if (state.mode === "settings") this.renderSettings(state);
      if (state.mode === "paused") this.renderPause(state);
      if (state.mode === "gameOver") this.renderGameOver(state);
    }
  }

  private renderStart(state: RenderState): void {
    this.drawCenteredTitle("NEON HORIZON", this.height * 0.24);
    this.drawText("A PREMIER SPACE TRADING ODYSSEY", this.width / 2, this.height * 0.32, {
      align: "center",
      color: THEME.colors.accentTeal,
      size: 14,
      font: THEME.fonts.accent
    });
    this.button("new", "INITIALIZE MISSION   [1]", this.width / 2 - 150, this.height * 0.44, 300, 48);
    if (state.hasSave) {
      this.button("continue", "RESUME SESSION   [2]", this.width / 2 - 150, this.height * 0.52, 300, 48);
    }
    this.button("controls", "SYSTEM OVERVIEW   [3]", this.width / 2 - 150, this.height * 0.6, 300, 48);
    this.drawText("DESIGNED FOR THE NEXT HORIZON | 2026 EDITION", this.width / 2, this.height - 44, {
      align: "center",
      color: THEME.colors.textDim,
      size: 11,
      font: THEME.fonts.mono
    });
  }

  private renderControls(): void {
    this.drawCenteredTitle("OPERATIONAL CONTROLS", 68);
    const col1 = this.width * 0.22;
    const col2 = this.width * 0.6;
    const top = 120;
    const gap = 28;
    const leftLines = [
      "ARROW KEYS — PITCH AND YAW",
      "Q / E — ROLL LEFT / RIGHT",
      "W / S — THROTTLE UP / DOWN",
      "SPACE — FIRE LASER SYSTEM",
      "D — DOCK AT STATION / LAUNCH",
      "M — UNIVERSE NAVIGATION MAP",
      "ENTER — ENGAGE JUMP DRIVE",
      "ESCAPE — SYSTEM PAUSE / BACK"
    ];
    const rightLines = [
      "T — STATION MARKET (DOCKED)",
      "E — EQUIPMENT BAY (DOCKED)",
      "Y — SHIPYARD (DOCKED)",
      "R — MISSION BOARD (DOCKED)",
      "H — REPAIR HULL (DOCKED)",
      "F — PURCHASE FUEL",
      "G — TOGGLE PHOSPHOR GLOW",
      "U — GLOBAL AUDIO MUTE",
      "A/D / ←/→ — MAP SELECTION"
    ];

    leftLines.forEach((line, i) => this.drawText(line, col1, top + i * gap, {
      align: "left", size: 13, font: THEME.fonts.mono, color: THEME.colors.textPrimary
    }));
    rightLines.forEach((line, i) => this.drawText(line, col2, top + i * gap, {
      align: "left", size: 13, font: THEME.fonts.mono, color: THEME.colors.textPrimary
    }));

    this.drawText("TOUCH INTERFACE: ON-SCREEN ADAPTIVE CONTROLS AVAILABLE",
      this.width / 2, top + leftLines.length * gap + 24, {
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
    this.renderCockpitOverlay(state);
    this.renderHud(state);
    this.renderTouchControls(state);
    if (state.playerHitFlash > 0) this.renderHitFlash(state.playerHitFlash);
    if (state.message) {
      this.drawText(state.message.toUpperCase(), this.width / 2, this.height - 72, {
        align: "center", color: THEME.colors.accentAmber, size: 13, font: THEME.fonts.accent
      });
    }
    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
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
      { label: "CREDITS", value: `${Math.round(state.player.credits)}`, color: THEME.colors.accentAmber },
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

    this.drawText(
      `[M] Map  [D] Dock  [T] Trade  [Space] Fire  [Esc] Pause`,
      this.width / 2, 24,
      { align: "center", color: "rgba(0, 242, 255, 0.6)", size: 10, font: THEME.fonts.mono }
    );
  }

  private renderTouchControls(state: RenderState): void {
    const compact = this.width < 760;
    const size = compact ? 38 : 42;
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
    this.button("touch-map", "MAP", this.width / 2 - 92, this.height - 50, 56, 34);
    this.button("touch-dock", state.player.docked ? "LAUNCH" : "DOCK", this.width / 2 - 28, this.height - 50, 70, 34);
    this.button("touch-trade", "TRADE", this.width / 2 + 50, this.height - 50, 70, 34);
    this.button("touch-menu", "MENU", this.width / 2 + 128, this.height - 50, 70, 34);
  }

  private renderMap(state: RenderState): void {
    this.panel(this.width * 0.08, this.height * 0.1, this.width * 0.84, this.height * 0.78);
    const matches = filterSystems(state.systems, state.mapFilters, state.player);
    this.drawText("UNIVERSE NAVIGATION", this.width / 2, this.height * 0.15, {
      align: "center", size: 24, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const mapX = this.width * 0.12;
    const mapY = this.height * 0.23;
    const mapW = this.width * 0.54;
    const mapH = this.height * 0.56;

    this.ctx.strokeStyle = "rgba(0, 242, 255, 0.2)";
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);

    const current = state.systems[state.player.currentSystemId];
    const selected = state.systems[state.selectedSystemId];

    const currentPoint = projectSystemToMap(current, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
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

    for (const system of state.systems) {
      const point = projectSystemToMap(system, mapX, mapY, mapW, mapH, UNIVERSE_CONSTANTS.width, UNIVERSE_CONSTANTS.height);
      const isCurrent = system.id === current.id;
      const isSelected = system.id === selected.id;
      const inRange = !isCurrent && canJump(current, system, state.player.fuel, state.player);
      const discovered = isSystemDiscovered(state.player, system.id);
      const matched = matchesMapFilters(system, state.mapFilters, state.player);
      const nearby = getJumpDistance(current, system) <= shipStats.maxJumpRange * 0.65;
      const activeFilter = hasActiveMapFilter(state.mapFilters);

      this.ctx.globalAlpha = activeFilter && !matched && !isSelected ? 0.2 : discovered ? 1 : 0.4;

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

      if (isCurrent || isSelected || nearby || (matched && activeFilter)) {
        this.drawText(system.name, point.x + 12, point.y, {
          align: "left", size: 11, font: THEME.fonts.mono, color: discovered ? THEME.colors.textPrimary : THEME.colors.textDim
        });
      }

      const hitR = 12;
      this.buttonZones.push({ id: `map-system-${system.id}`, label: system.name, x: point.x - hitR, y: point.y - hitR, width: hitR * 2, height: hitR * 2 });
    }

    const detailX = this.width * 0.68;
    const detailY = this.height * 0.23;
    const detailW = this.width * 0.22;

    // System Detail Panel
    this.hudPanel(detailX, detailY, detailW, this.height * 0.45);
    this.drawText(selected.name.toUpperCase(), detailX + 16, detailY + 24, {
      size: 18, font: THEME.fonts.accent, color: THEME.colors.accentTeal
    });

    const dist = getJumpDistance(current, selected);
    const fuel = getFuelRequired(current, selected, state.player);
    const discovered = isSystemDiscovered(state.player, selected.id);

    const details = [
      { label: "DISTANCE", value: `${dist.toFixed(1)} LY` },
      { label: "FUEL REQ", value: `${fuel.toFixed(1)}`, color: fuel > state.player.fuel ? THEME.colors.danger : THEME.colors.accentAmber },
      { label: "ECONOMY", value: discovered ? selected.economy.toUpperCase() : "UNKNOWN" },
      { label: "HAZARD", value: discovered ? formatMapValue(selected.hazardTag).toUpperCase() : "UNKNOWN", color: discovered ? (selected.hazardLevel > 5 ? THEME.colors.danger : THEME.colors.success) : THEME.colors.textDim },
    ];

    details.forEach((d, i) => {
      const dy = detailY + 64 + i * 32;
      this.drawText(d.label, detailX + 16, dy, { size: 10, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      this.drawText(d.value, detailX + detailW - 16, dy, { align: "right", size: 10, font: THEME.fonts.mono, color: d.color });
    });

    this.button("map-jump", "ENGAGE JUMP DRIVE [Enter]", detailX, detailY + 210, detailW, 44);

    const filterY = this.height * 0.18;
    this.drawText(`Systems: ${matches.length}/${state.systems.length}`, mapX, filterY, {
      align: "left", color: THEME.colors.textSecondary, size: 11, font: THEME.fonts.mono
    });

    this.button("map-back", "CLOSE MAP [Esc]", this.width / 2 - 100, this.height * 0.78, 200, 40);

    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
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
    this.panel(this.width * 0.2, this.height * 0.1, this.width * 0.6, this.height * 0.68);
    const system = state.systems[state.player.currentSystemId];
    const profile = getStationProfile(system);
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? THEME.colors.danger : hullFraction < 0.6 ? THEME.colors.warning : THEME.colors.success;
    const repLabel = getReputationLabel(state.player.reputation);
    const riskLabel = getLegalRiskLabel(state.player.legalRisk);
    const riskColor = state.player.legalRisk >= 5 ? THEME.colors.danger : state.player.legalRisk >= 2 ? THEME.colors.warning : THEME.colors.success;

    this.drawText(`${system.name.toUpperCase()} STATION`, this.width / 2, this.height * 0.18, {
      align: "center", size: 28, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });
    this.drawText(`${profile.label} · ${system.stationHint}`, this.width / 2, this.height * 0.25, {
      align: "center", color: THEME.colors.accentTeal, font: THEME.fonts.primary, size: 14
    });

    const infoY = this.height * 0.32;
    this.drawText(`PILOT RANK: ${state.pilotRank.title}`, this.width / 2, infoY, {
      align: "center", color: THEME.colors.accentPink, size: 14, font: THEME.fonts.mono
    });

    this.drawText(
      `HULL: ${Math.round(state.player.hull)}/${state.player.maxHull}   CREDITS: ${Math.round(state.player.credits)}`,
      this.width / 2, infoY + 32, { align: "center", color: hullColor, size: 14, font: THEME.fonts.mono }
    );
    this.drawText(
      `REPUTATION: ${repLabel}   STATUS: ${riskLabel}`,
      this.width / 2, infoY + 60, { align: "center", color: riskColor, size: 12, font: THEME.fonts.mono }
    );

    if (state.player.activeMission) {
      const am = state.player.activeMission;
      const dest = state.systems[am.destinationSystemId]?.name ?? "unknown";
      this.drawText(
        `ACTIVE MISSION: ${am.title} → ${dest}`,
        this.width / 2, infoY + 92, { align: "center", color: THEME.colors.accentAmber, size: 12, font: THEME.fonts.mono }
      );
    }

    const y = this.height * 0.67;
    const bw = 90;
    const bgap = 12;
    const totalW = bw * 5 + bgap * 4;
    const startX = this.width / 2 - totalW / 2 + bw / 2;

    this.button("touch-trade", "MARKET", startX, y, bw, 42);
    this.button("touch-equipment", "GEAR", startX + (bw + bgap), y, bw, 42);
    this.button("touch-shipyard", "SHIPS", startX + (bw + bgap) * 2, y, bw, 42);
    this.button("touch-missions", "MISSIONS", startX + (bw + bgap) * 3, y, bw, 42);
    this.button("touch-dock", "LAUNCH", startX + (bw + bgap) * 4, y, bw, 42);

    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderTrade(state: RenderState): void {
    this.panel(this.width * 0.06, this.height * 0.08, this.width * 0.88, this.height * 0.84);
    const cargoUsed = getTotalOccupiedCargo(state.player);
    const shipStats = getPlayerShipStats(state.player);
    const missionCargo = state.player.missionCargoUnits ?? 0;
    const cargoLabel = missionCargo > 0
      ? `${cargoUsed}/${state.player.cargoCapacity} (${missionCargo} Mission)`
      : `${cargoUsed}/${state.player.cargoCapacity}`;

    this.drawText("STATION MARKET", this.width / 2, this.height * 0.14, {
      align: "center", size: 24, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });
    this.drawText(
      `CREDITS: ${Math.round(state.player.credits)} BAL · CARGO: ${cargoLabel} · FUEL: ${state.player.fuel.toFixed(1)}/${shipStats.fuelCapacity.toFixed(1)}`,
      this.width / 2, this.height * 0.19, { align: "center", color: THEME.colors.accentTeal, font: THEME.fonts.mono, size: 12 }
    );

    const left = this.width * 0.12;
    const top = this.height * 0.28;
    const headerColor = THEME.colors.accentPink;
    const headerFont = THEME.fonts.mono;
    const headerSize = 10;

    this.drawText("ID", left, top - 28, { color: headerColor, font: headerFont, size: headerSize });
    this.drawText("COMMODITY", left + 50, top - 28, { color: headerColor, font: headerFont, size: headerSize });
    this.drawText("PRICE", left + 260, top - 28, { color: headerColor, font: headerFont, size: headerSize });
    this.drawText("TREND", left + 340, top - 28, { color: headerColor, font: headerFont, size: headerSize });
    this.drawText("SUPPLY", left + 430, top - 28, { color: headerColor, font: headerFont, size: headerSize });
    this.drawText("HELD", left + 520, top - 28, { color: headerColor, font: headerFont, size: headerSize });

    const rowW = this.width * 0.76;
    state.market.forEach((item, index) => {
      const y = top + index * 36;
      const rowY = y - 16;
      const rowH = 32;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);

      if (hovered) {
        this.ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
        this.ctx.beginPath();
        this.ctx.roundRect(left - 8, rowY, rowW + 16, rowH, 4);
        this.ctx.fill();
      }

      this.buttonZones.push({ id: `trade-row-${index}`, label: item.name, x: left, y: rowY, width: rowW, height: rowH });

      const prevPrice = state.previousPrices[item.id];
      const trend = getPriceTrend(prevPrice, item.price);
      const trendColor = trend.label === "rising" ? THEME.colors.danger : trend.label === "falling" ? THEME.colors.success : THEME.colors.textDim;
      const trendText = trend.label === "unknown" || trend.label === "stable"
        ? "—"
        : `${trend.symbol}${trend.delta > 0 ? "+" : ""}${trend.delta}%`;

      const rowFont = THEME.fonts.mono;
      const rowSize = 13;
      this.drawText(`${index + 1}`, left, y, { size: rowSize, font: rowFont, color: THEME.colors.textDim });
      this.drawText(item.name.toUpperCase(), left + 50, y, { size: rowSize, font: THEME.fonts.accent, color: THEME.colors.textPrimary });
      this.drawText(`${item.price}`, left + 260, y, { size: rowSize, font: rowFont });
      this.drawText(trendText, left + 340, y, { size: 12, font: rowFont, color: trendColor });
      this.drawText(`${item.quantity}`, left + 430, y, { size: rowSize, font: rowFont });
      this.drawText(`${state.player.cargo[item.id] ?? 0}`, left + 520, y, { size: rowSize, font: rowFont, color: THEME.colors.accentAmber });
    });

    this.drawText(
      "CLICK BUY · SHIFT+CLICK SELL · ALT+CLICK MAX · F REFUEL · ESC BACK",
      this.width / 2, this.height * 0.84, { align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono }
    );

    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderEquipment(state: RenderState): void {
    this.panel(this.width * 0.08, this.height * 0.1, this.width * 0.84, this.height * 0.82);
    this.drawText("EQUIPMENT BAY", this.width / 2, this.height * 0.16, {
      align: "center", size: 24, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const profile = getStationProfile(state.systems[state.player.currentSystemId]);
    const pageSize = 8;
    const pageCount = Math.max(1, Math.ceil(EQUIPMENT.length / pageSize));
    const page = Math.min(state.equipmentPage, pageCount - 1);
    const visibleEquipment = EQUIPMENT.slice(page * pageSize, page * pageSize + pageSize);

    const left = this.width * 0.14;
    const top = this.height * 0.26;
    const rowW = this.width * 0.72;

    visibleEquipment.forEach((item, index) => {
      const installed = state.player.equipment[item.id];
      const stocked = isEquipmentAvailableAtStation(item, profile);
      const affordable = state.player.credits >= item.price;
      const y = top + index * 48;
      const rowY = y - 20;
      const rowH = 40;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);

      if (hovered && !installed && stocked) {
        this.ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
        this.ctx.beginPath();
        this.ctx.roundRect(left - 8, rowY, rowW + 16, rowH, 4);
        this.ctx.fill();
      }

      this.buttonZones.push({ id: `equip-row-${index}`, label: item.name, x: left, y: rowY, width: rowW, height: rowH });
      this.drawText(`${index + 1}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
      this.drawText(item.name.toUpperCase(), left + 42, y, { color: installed ? THEME.colors.accentTeal : THEME.colors.textPrimary, font: THEME.fonts.accent, size: 14 });

      const status = installed ? "INSTALLED" : !stocked ? "NOT IN STOCK" : `${item.price} BAL`;
      const statusColor = installed ? THEME.colors.accentTeal : !stocked || !affordable ? THEME.colors.textDim : THEME.colors.accentAmber;
      this.drawText(status, left + 260, y, { color: statusColor, size: 11, font: THEME.fonts.mono });
      this.drawText(item.description, left + 400, y, { size: 11, color: THEME.colors.textSecondary });
    });

    const pageY = top + visibleEquipment.length * 48 + 8;
    this.drawText(`PAGE ${page + 1}/${pageCount} · ${profile.label.toUpperCase()}`, left, pageY, {
      color: THEME.colors.accentTeal, size: 11, font: THEME.fonts.mono
    });

    if (page > 0) this.button("equip-page-prev", "PREV", left + 240, pageY - 18, 80, 32);
    if (page < pageCount - 1) this.button("equip-page-next", "NEXT", left + 332, pageY - 18, 80, 32);

    const repairY = pageY + 44;
    const missing = state.player.maxHull - state.player.hull;
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? THEME.colors.danger : hullFraction < 0.6 ? THEME.colors.warning : THEME.colors.success;

    this.drawText(`HULL INTEGRITY:`, left, repairY, { size: 12, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
    this.drawProgressBar(left + 120, repairY - 6, 120, 12, hullFraction, hullColor);
    this.drawText(`${Math.round(state.player.hull)} / ${state.player.maxHull}`, left + 250, repairY, { size: 12, font: THEME.fonts.mono, color: hullColor });

    if (missing > 0) {
      const repairCost = calcRepairCost(state.player, profile.repairCostModifier);
      const repairLabel = `REPAIR HULL (${repairCost} BAL) [H]`;
      this.button("equip-repair", repairLabel, left + 360, repairY - 18, 240, 36);
    } else {
      this.drawText("HULL FULLY OPERATIONAL", left + 360, repairY, { size: 12, font: THEME.fonts.accent, color: THEME.colors.success });
    }

    this.drawText("CLICK ROW TO PURCHASE · N/P PAGES · H REPAIR · ESC BACK", this.width / 2, this.height * 0.88, {
      align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono
    });
  }

  private renderShipyard(state: RenderState): void {
    this.panel(this.width * 0.06, this.height * 0.08, this.width * 0.88, this.height * 0.84);
    const currentShip = getPlayerShip(state.player.shipId);
    const selectedShip = getPlayerShip(state.selectedShipId);
    const currentStats = getPlayerShipStats(state.player);
    const selectedStats = getPlayerShipStats({ ...state.player, shipId: selectedShip.id });
    const cargoUsed = getTotalOccupiedCargo(state.player);
    const canAfford = state.player.credits >= selectedShip.price;
    const cargoFits = cargoUsed <= selectedStats.cargoCapacity;
    const alreadyCurrent = selectedShip.id === currentShip.id;

    this.drawText("SHIPYARD", this.width / 2, this.height * 0.14, {
      align: "center", size: 24, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });
    this.drawText(`CREDITS: ${Math.round(state.player.credits)} BAL · CARGO LOAD: ${cargoUsed}/${state.player.cargoCapacity}`, this.width / 2, this.height * 0.19, {
      align: "center",
      color: THEME.colors.accentTeal,
      font: THEME.fonts.mono,
      size: 11
    });

    const left = this.width * 0.1;
    const listTop = this.height * 0.27;
    const listW = this.width * 0.36;

    PLAYER_SHIPS.forEach((ship, index) => {
      const y = listTop + index * 48;
      const rowY = y - 20;
      const rowH = 40;
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
      this.drawText(ship.name.toUpperCase(), left + 44, y, { color: ship.id === currentShip.id ? THEME.colors.accentTeal : THEME.colors.textPrimary, font: THEME.fonts.accent, size: 14 });
      this.drawText(ship.id === currentShip.id ? "ACTIVE" : `${ship.price} BAL`, left + 220, y, { align: "left", size: 11, font: THEME.fonts.mono, color: ship.id === currentShip.id ? THEME.colors.accentTeal : THEME.colors.accentAmber });
    });

    const detailX = this.width * 0.52;
    const detailY = this.height * 0.27;
    this.drawText(selectedShip.name.toUpperCase(), detailX, detailY, { color: THEME.colors.textPrimary, size: 24, font: THEME.fonts.accent });
    this.drawText(selectedShip.role.toUpperCase(), detailX, detailY + 32, { color: THEME.colors.accentTeal, size: 12, font: THEME.fonts.mono });
    this.drawText(selectedShip.description, detailX, detailY + 60, { color: THEME.colors.textSecondary, size: 12 });

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

    this.drawText("CURRENT", detailX + 180, detailY + 104, { align: "right", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono });
    this.drawText("SELECTED", detailX + 280, detailY + 104, { align: "right", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono });

    rows.forEach(([label, current, selected], index) => {
      const y = detailY + 132 + index * 26;
      this.drawText(label, detailX, y, { size: 11, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
      this.drawText(current, detailX + 180, y, { align: "right", size: 11, font: THEME.fonts.mono });
      this.drawText(selected, detailX + 280, y, { align: "right", size: 11, font: THEME.fonts.mono, color: compareColor(Number(selected), Number(current)) });
    });

    const warning = alreadyCurrent
      ? "SYSTEMS ACTIVE"
      : !canAfford
        ? "INSUFFICIENT CREDITS"
        : !cargoFits
          ? `CARGO OVERFLOW: ${cargoUsed - selectedStats.cargoCapacity} UNITS`
          : "READY FOR ACQUISITION";

    const warningColor = alreadyCurrent ? THEME.colors.accentTeal : (!canAfford || !cargoFits ? THEME.colors.danger : THEME.colors.success);
    this.drawText(warning, detailX, this.height * 0.76, { size: 12, font: THEME.fonts.accent, color: warningColor });
    this.button("ship-buy", "PURCHASE [Enter]", detailX + 200, this.height * 0.735, 160, 42);

    this.drawText("CLICK HULL OR 1-6 TO COMPARE · ENTER PURCHASES · ESC BACK", this.width / 2, this.height * 0.88, {
      align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono
    });
  }

  private renderMissions(state: RenderState): void {
    this.panel(this.width * 0.06, this.height * 0.08, this.width * 0.88, this.height * 0.84);
    this.drawText("MISSION BOARD", this.width / 2, this.height * 0.14, {
      align: "center", size: 24, color: THEME.colors.textPrimary, font: THEME.fonts.accent
    });

    const active = state.player.activeMission;
    if (active) {
      const dest = state.systems[active.destinationSystemId]?.name ?? "unknown";
      const deadlineText = active.deadlineJumps >= 0 ? `${active.deadlineJumps} JUMPS REMAINING` : "NO DEADLINE";
      const deadlineColor = active.deadlineJumps >= 0 && active.deadlineJumps <= 1 ? THEME.colors.danger : THEME.colors.accentTeal;
      this.drawText(`ACTIVE: ${active.title.toUpperCase()} → ${dest.toUpperCase()} [${deadlineText}]`, this.width / 2, this.height * 0.2, {
        align: "center", color: deadlineColor, font: THEME.fonts.mono, size: 11
      });
    } else {
      this.drawText("NO ACTIVE CONTRACTS.", this.width / 2, this.height * 0.2, {
        align: "center", color: THEME.colors.textDim, font: THEME.fonts.mono, size: 11
      });
    }

    const left = this.width * 0.12;
    const top = this.height * 0.30;
    const rowW = this.width * 0.76;

    state.missions.forEach((mission, index) => {
      const y = top + index * 62;
      const rowY = y - 24;
      const rowH = 54;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);

      if (hovered && !active) {
        this.ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
        this.ctx.beginPath();
        this.ctx.roundRect(left - 8, rowY, rowW + 16, rowH, 4);
        this.ctx.fill();
      }

      this.buttonZones.push({ id: `mission-row-${index}`, label: mission.title, x: left, y: rowY, width: rowW, height: rowH });
      this.drawText(`${index + 1}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
      this.drawText(`${mission.typeLabel.toUpperCase()}: ${mission.title.toUpperCase()}`, left + 38, y, { color: THEME.colors.textPrimary, size: 14, font: THEME.fonts.accent });
      this.drawText(`${mission.reward} BAL`, left + 320, y, { color: THEME.colors.accentAmber, font: THEME.fonts.mono, size: 13 });

      const cargoText = mission.cargoUnitsRequired > 0 ? `${mission.cargoUnitsRequired}T CARGO` : "NO CARGO";
      const deadlineText = mission.deadlineJumps >= 0 ? `${mission.deadlineJumps}J LIMIT` : "OPEN";
      this.drawText(`${cargoText} · ${deadlineText} · ${mission.riskLabel.toUpperCase()}`, left + 420, y, { size: 11, color: THEME.colors.accentTeal, font: THEME.fonts.mono });
      this.drawText(state.systems[mission.destinationSystemId]?.name.toUpperCase() ?? "?", left + 38, y + 20, { size: 11, color: THEME.colors.textSecondary, font: THEME.fonts.mono });
      this.drawText(`REP ${signed(mission.reputationChange)} / LEGAL ${signed(mission.legalRiskChange)}`, left + 320, y + 20, { size: 11, color: THEME.colors.textDim, font: THEME.fonts.mono });
    });

    this.drawText("CLICK ROW OR 1-8 TO ACCEPT CONTRACT · ESC BACK", this.width / 2, this.height * 0.86, {
      align: "center", color: THEME.colors.textDim, size: 10, font: THEME.fonts.mono
    });

    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderPause(state: RenderState): void {
    this.panel(this.width / 2 - 180, this.height / 2 - 140, 360, 280);
    this.drawText("SESSION PAUSED", this.width / 2, this.height / 2 - 84, {
      align: "center", color: THEME.colors.textPrimary, size: 28, font: THEME.fonts.accent
    });

    this.drawText("ENTER TO RESUME", this.width / 2, this.height / 2 - 32, { align: "center", font: THEME.fonts.mono, size: 14, color: THEME.colors.accentTeal });

    this.drawText("DATA AUTO-SAVED DURING TRANSITS", this.width / 2, this.height / 2 + 12, {
      align: "center",
      color: THEME.colors.textSecondary,
      size: 11,
      font: THEME.fonts.mono
    });

    this.drawText(`CURRENT BALANCE: ${Math.round(state.player.credits)} BAL`, this.width / 2, this.height / 2 + 54, {
      align: "center", font: THEME.fonts.mono, size: 13, color: THEME.colors.accentAmber
    });

    this.button("pause-resume", "RESUME", this.width / 2 - 140, this.height / 2 + 34, 130, 40);
    this.button("pause-settings", "SETTINGS", this.width / 2 + 10, this.height / 2 + 34, 130, 40);
    this.button("pause-menu", "EXIT TO MENU", this.width / 2 - 65, this.height / 2 + 84, 130, 40);
  }

  private renderSettings(state: RenderState): void {
    this.panel(this.width / 2 - 200, this.height / 2 - 180, 400, 360);
    this.drawText("SYSTEM SETTINGS", this.width / 2, this.height / 2 - 130, {
      align: "center", color: THEME.colors.textPrimary, size: 24, font: THEME.fonts.accent
    });

    const left = this.width / 2 - 160;
    const top = this.height / 2 - 80;

    // SFX Volume
    this.drawText("SFX VOLUME", left, top, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentTeal });
    this.drawProgressBar(left, top + 16, 320, 12, state.sfxVolume, THEME.colors.accentTeal);
    this.button("settings-sfx-down", "-", left + 260, top - 6, 30, 30);
    this.button("settings-sfx-up", "+", left + 300, top - 6, 30, 30);

    // Music Volume
    this.drawText("MUSIC VOLUME", left, top + 70, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentPink });
    this.drawProgressBar(left, top + 86, 320, 12, state.musicVolume, THEME.colors.accentPink);
    this.button("settings-music-down", "-", left + 260, top + 64, 30, 30);
    this.button("settings-music-up", "+", left + 300, top + 64, 30, 30);

    // Other settings
    this.drawText("PHOSPHOR GLOW", left, top + 140, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
    this.button("settings-glow", state.phosphorGlow ? "ENABLED" : "DISABLED", left + 200, top + 130, 120, 34);

    this.drawText("AUDIO OUTPUT", left, top + 190, { size: 12, font: THEME.fonts.mono, color: THEME.colors.accentViolet });
    this.button("settings-mute", state.audioMuted ? "MUTED" : "ACTIVE", left + 200, top + 180, 120, 34);

    this.button("settings-back", "CLOSE [Esc]", this.width / 2 - 100, this.height / 2 + 130, 200, 42);
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
      ["TOTAL CREDITS EARNED", `${state.runStats.totalCreditsEarned} BAL`],
      ["FINAL LIQUID ASSETS", `${Math.round(state.player.credits)} BAL`],
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

    const pb = state.meta.personalBest?.totalCreditsEarned ?? 0;
    if (pb > 0 || state.isNewPersonalBest) {
      const pbLabel = state.isNewPersonalBest ? "NEW PERSONAL BEST ESTABLISHED!" : `PERSONAL BEST: ${pb} BAL`;
      const pbColor = state.isNewPersonalBest ? THEME.colors.accentTeal : THEME.colors.success;
      this.drawText(pbLabel, cx, row + 8, { align: "center", color: pbColor, size: 13, font: THEME.fonts.accent });
    }

    row = py + panelH - 64;
    this.button("death-restart", "REINITIALIZE [R]", cx - 175, row, 160, 42);
    this.button("death-menu", "ABORT TO MENU [Esc]", cx + 15, row, 160, 42);
  }

  private renderOnboardingHint(hint: HintId): void {
    const hintText = HINT_TEXT[hint];
    const barH = 64;
    const barY = this.height - barH - 16;
    const barW = Math.min(this.width * 0.8, 600);
    const barX = this.width / 2 - barW / 2;

    this.ctx.fillStyle = THEME.colors.bgGlass;
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barW, barH, 8);
    this.ctx.fill();

    this.setVectorStroke(THEME.colors.accentTeal, 1.5, true);
    this.ctx.beginPath();
    this.ctx.roundRect(barX, barY, barW, barH, 8);
    this.ctx.stroke();

    this.drawText(hintText.toUpperCase(), this.width / 2, barY + barH / 2, {
      align: "center", color: THEME.colors.textPrimary, size: 13, font: THEME.fonts.accent
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
    this.ctx.fillStyle = "rgba(10, 14, 20, 0.4)";
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 4);
    this.ctx.fill();

    this.setVectorStroke("rgba(0, 242, 255, 0.3)", 1, false);
    this.ctx.beginPath();
    this.ctx.roundRect(x, y, width, height, 4);
    this.ctx.stroke();
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
