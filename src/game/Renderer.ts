import { EQUIPMENT } from "./Equipment";
import { getPriceTrend } from "./Economy";
import { getLegalRiskLabel, getReputationLabel } from "./Reputation";
import { HINT_TEXT } from "./Onboarding";
import { formatTimePlayed } from "./RunStats";
import type { RankInfo } from "./Rank";
import type { RunStats } from "./RunStats";
import type { HintId } from "./Onboarding";
import type {
  ButtonZone,
  CommodityId,
  EconomyState,
  GameMode,
  MarketItem,
  Meta,
  Mission,
  PlayerState,
  Projectile,
  Ship,
  StarSystem,
  Vector3
} from "./types";
import { calcRepairCost, getTotalOccupiedCargo, TRADE_CONSTANTS } from "./Trading";
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
    this.ctx.fillStyle = "#000";
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
      if (state.mode === "missions") this.renderMissions(state);
      if (state.mode === "paused") this.renderPause(state);
      if (state.mode === "gameOver") this.renderGameOver(state);
    }
  }

  private renderStart(state: RenderState): void {
    this.drawCenteredTitle("Vector Space Trader", this.height * 0.24);
    this.drawText("A clean-room wireframe trading and combat game", this.width / 2, this.height * 0.32, {
      align: "center",
      color: "#72ff9d",
      size: 18
    });
    this.button("new", "Start New Game   [1]", this.width / 2 - 150, this.height * 0.44, 300, 44);
    if (state.hasSave) {
      this.button("continue", "Continue   [2]", this.width / 2 - 150, this.height * 0.52, 300, 44);
    }
    this.button("controls", "Controls   [3]", this.width / 2 - 150, this.height * 0.6, 300, 44);
    this.drawText("Original code, assets, names, systems, and gameplay data.", this.width / 2, this.height - 44, {
      align: "center",
      color: "#4aa86e",
      size: 14
    });
  }

  private renderControls(): void {
    this.drawCenteredTitle("Controls", 68);
    const col1 = this.width * 0.22;
    const col2 = this.width * 0.6;
    const top = 110;
    const gap = 24;
    const leftLines = [
      "Arrow keys — pitch and yaw",
      "Q / E — roll left / right",
      "W / S — throttle up / down",
      "Space — fire laser",
      "D — dock at station or launch",
      "M — universe map",
      "Enter — jump to selected system",
      "Escape — pause or back"
    ];
    const rightLines = [
      "T — market (docked)",
      "E — equipment bay (docked)",
      "R — mission board (docked)",
      "H — repair hull (docked)",
      "F or + or = — buy fuel",
      "G — toggle phosphor glow",
      "U — mute / unmute audio",
      "A/D  ←/→  ,/.  [/] — map select"
    ];
    leftLines.forEach((line, i) => this.drawText(line, col1, top + i * gap, { align: "left", size: 15 }));
    rightLines.forEach((line, i) => this.drawText(line, col2, top + i * gap, { align: "left", size: 15 }));
    this.drawText("Touch: on-screen buttons for flight, dock, trade, equipment, missions.",
      this.width / 2, top + leftLines.length * gap + 18, { align: "center", color: "#b8ffd0", size: 14 });
    this.button("back", "Back   [Esc]", this.width / 2 - 120, this.height - 96, 240, 42);
  }

  private renderFlightView(state: RenderState): void {
    this.renderStars(state.player);
    this.renderStation(state);
    this.renderShip(state.enemy, state.player, "#86ffb2", state.phosphorGlow);
    this.renderProjectiles(state.projectiles, state.player);
    if (state.explosionEffect) this.renderExplosion(state.explosionEffect, state.player);
    this.renderCockpitOverlay(state);
    this.renderHud(state);
    this.renderTouchControls(state);
    if (state.playerHitFlash > 0) this.renderHitFlash(state.playerHitFlash);
    if (state.message) {
      this.drawText(state.message, this.width / 2, this.height - 72, { align: "center", color: "#fff", size: 15 });
    }
    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderStars(player: PlayerState): void {
    this.setVectorStroke("#5fbf7b", 1, false);

    for (const star of this.stars) {
      const depth = ((star.z - player.position.z * 0.08) % 120 + 120) % 120;
      const px = this.width / 2 + (star.x + player.orientation.yaw * 80) * (120 / (depth + 18));
      const py = this.height / 2 + (star.y + player.orientation.pitch * 80) * (120 / (depth + 18));
      if (px < 0 || px > this.width || py < 0 || py > this.height) continue;

      const alpha = 1 - depth / 140;
      this.ctx.globalAlpha = Math.max(0.18, alpha);
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

    this.setVectorStroke("#3cff78", 1.3, state.phosphorGlow);
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
    this.setVectorStroke("#3cff78", 1.2, glow);
    this.ctx.beginPath();
    this.ctx.moveTo(cx - 18, cy);
    this.ctx.lineTo(cx - 6, cy);
    this.ctx.moveTo(cx + 6, cy);
    this.ctx.lineTo(cx + 18, cy);
    this.ctx.moveTo(cx, cy - 18);
    this.ctx.lineTo(cx, cy - 6);
    this.ctx.moveTo(cx, cy + 6);
    this.ctx.lineTo(cx, cy + 18);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderStation(state: RenderState): void {
    const relative = subtractPoint(state.stationPosition, state.player.position);
    const point = this.project(relative);
    const cx = point.visible ? point.x : this.width * 0.78;
    const cy = point.visible ? point.y : this.height * 0.34;
    const size = Math.max(18, Math.min(54, 28 * (point.scale || 1)));
    this.setVectorStroke("#d9ffe2", 1.1, state.phosphorGlow);
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
    this.ctx.strokeRect(-size * 0.36, -size * 0.36, size * 0.72, size * 0.72);
    this.ctx.restore();
    this.drawText("STATION", cx, cy + size + 18, { align: "center", color: "#d9ffe2", size: 12 });
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
      this.setVectorStroke(projectile.owner === "player" ? "#ffffff" : "#ff6a6a", 2, false);
      this.ctx.beginPath();
      this.ctx.moveTo(point.x - 5, point.y);
      this.ctx.lineTo(point.x + 5, point.y);
      this.ctx.stroke();
    }
  }

  private renderHud(state: RenderState): void {
    const system = state.systems[state.player.currentSystemId];
    const speed = Math.round(state.player.speed);
    const cargo = getTotalOccupiedCargo(state.player);
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? "#ff6a6a" : hullFraction < 0.6 ? "#ffbb40" : "#d8ffe7";
    const riskLabel = getLegalRiskLabel(state.player.legalRisk);
    const riskColor = state.player.legalRisk >= 5 ? "#ff8f8f" : state.player.legalRisk >= 2 ? "#ffbb40" : "#d8ffe7";
    this.hudPanel(12, 12, 196, 222);
    this.hudPanel(this.width - 224, 12, 212, 222);
    const leftLines: Array<{ text: string; color?: string }> = [
      { text: `SPD ${speed.toString().padStart(3, "0")}` },
      { text: `SHD ${Math.round(state.player.shield)}/${state.player.maxShield}` },
      { text: `HULL ${Math.round(state.player.hull)}/${state.player.maxHull}`, color: hullColor },
      { text: `ENG ${Math.round(state.player.energy).toString().padStart(3, "0")}` },
      { text: `FUEL ${state.player.fuel.toFixed(1)}` },
      { text: `RANK ${state.pilotRank.title}`, color: "#86ffb2" }
    ];
    const rightLines: Array<{ text: string; color?: string }> = [
      { text: `BAL ${Math.round(state.player.credits)}` },
      { text: `CARGO ${cargo}/${state.player.cargoCapacity}` },
      { text: `STATUS: ${riskLabel}`, color: riskColor },
      { text: `REP ${state.player.reputation.toFixed(1)}` },
      { text: `SYS ${system.name}` },
      { text: `KILLS ${state.runStats.enemiesDestroyed}`, color: "#d8ffe7" }
    ];

    leftLines.forEach((item, index) =>
      this.drawText(item.text, 26, 36 + index * 30, { align: "left", size: 14, color: item.color })
    );
    rightLines.forEach((item, index) =>
      this.drawText(item.text, this.width - 208, 34 + index * 30, { align: "left", size: 14, color: item.color })
    );

    if (state.player.legalRisk >= 5) {
      this.drawText(
        "WARNING: Increased piracy threat",
        this.width / 2, 44,
        { align: "center", color: "#ff8f8f", size: 13 }
      );
    }

    this.drawText(
      `M Map  D Dock  T Trade  Space Fire  G Glow  U ${state.audioMuted ? "Unmute" : "Mute"}`,
      this.width / 2,
      24,
      { align: "center", color: "#5fe88b", size: 13 }
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
    this.drawText("Universe Map", this.width / 2, this.height * 0.15, { align: "center", size: 24, color: "#fff" });
    const mapX = this.width * 0.16;
    const mapY = this.height * 0.2;
    const mapW = this.width * 0.5;
    const mapH = this.height * 0.56;
    this.ctx.strokeStyle = "#276b42";
    this.ctx.strokeRect(mapX, mapY, mapW, mapH);

    const current = state.systems[state.player.currentSystemId];
    const selected = state.systems[state.selectedSystemId];

    const curScreenX = mapX + (current.x / 96) * mapW;
    const curScreenY = mapY + (current.y / 72) * mapH;
    const ringRx = (UNIVERSE_CONSTANTS.maxJumpRange / 96) * mapW;
    const ringRy = (UNIVERSE_CONSTANTS.maxJumpRange / 72) * mapH;
    this.ctx.save();
    this.ctx.strokeStyle = "rgba(60,255,120,0.28)";
    this.ctx.lineWidth = 1.2;
    this.ctx.setLineDash([5, 5]);
    this.ctx.beginPath();
    this.ctx.ellipse(curScreenX, curScreenY, ringRx, ringRy, 0, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.setLineDash([]);
    this.ctx.restore();

    for (const system of state.systems) {
      const x = mapX + (system.x / 96) * mapW;
      const y = mapY + (system.y / 72) * mapH;
      const isCurrent = system.id === current.id;
      const isSelected = system.id === selected.id;
      const inRange = !isCurrent && canJump(current, system, state.player.fuel);
      this.ctx.fillStyle = isCurrent ? "#fff" : isSelected ? "#3cff78" : inRange ? "#a8e8b8" : "#456b54";
      this.ctx.beginPath();
      this.ctx.arc(x, y, isCurrent || isSelected ? 4 : 2.5, 0, Math.PI * 2);
      this.ctx.fill();
      if (isCurrent || isSelected) {
        this.drawText(system.name, x + 8, y - 8, { align: "left", size: 12, color: "#d8ffe7" });
      }
      const hitR = 10;
      this.buttonZones.push({ id: `map-system-${system.id}`, label: system.name, x: x - hitR, y: y - hitR, width: hitR * 2, height: hitR * 2 });
    }

    const detailX = this.width * 0.7;
    const dist = getJumpDistance(current, selected);
    const fuelRequired = getFuelRequired(current, selected);
    const jumpReady = canJump(current, selected, state.player.fuel);
    this.drawText(selected.name, detailX, mapY + 20, { align: "left", color: "#fff", size: 20 });
    this.drawText(`Economy: ${selected.economy}`, detailX, mapY + 56, { align: "left" });
    this.drawText(`Gov: ${selected.government}`, detailX, mapY + 82, { align: "left" });
    this.drawText(`Tech: ${selected.techLevel}`, detailX, mapY + 108, { align: "left" });
    this.drawText(`Population: ${selected.population}M`, detailX, mapY + 134, { align: "left" });
    this.drawText(`Distance: ${dist.toFixed(1)}`, detailX, mapY + 170, { align: "left" });
    this.drawText(`Fuel needed: ${fuelRequired.toFixed(1)}`, detailX, mapY + 196, { align: "left" });
    this.drawText(jumpReady ? "Jump ready" : "Out of range or fuel", detailX, mapY + 226, {
      align: "left",
      color: jumpReady ? "#3cff78" : "#ff8f8f"
    });
    this.button("map-jump", "JUMP [Enter]", detailX, mapY + 256, 160, 36);
    this.drawText("Click system · A/D or ←/→ select · Enter/JUMP to travel · Esc back", this.width / 2, this.height * 0.83, {
      align: "center", color: "#b8ffd0"
    });
    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderDocking(state: RenderState): void {
    const progress = Math.round(state.dockingProgress * 100);
    this.panel(this.width / 2 - 210, this.height / 2 - 92, 420, 184);
    this.drawText("Docking Corridor", this.width / 2, this.height / 2 - 44, { align: "center", color: "#fff", size: 26 });
    this.ctx.strokeStyle = "#3cff78";
    this.ctx.strokeRect(this.width / 2 - 150, this.height / 2 - 4, 300, 18);
    this.ctx.fillStyle = "#3cff78";
    this.ctx.fillRect(this.width / 2 - 150, this.height / 2 - 4, 300 * state.dockingProgress, 18);
    this.drawText(`${progress}%`, this.width / 2, this.height / 2 + 42, { align: "center", color: "#d8ffe7" });
  }

  private renderDocked(state: RenderState): void {
    this.panel(this.width * 0.2, this.height * 0.1, this.width * 0.6, this.height * 0.68);
    const system = state.systems[state.player.currentSystemId];
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? "#ff6a6a" : hullFraction < 0.6 ? "#ffbb40" : "#72ff9d";
    const repLabel = getReputationLabel(state.player.reputation);
    const riskLabel = getLegalRiskLabel(state.player.legalRisk);
    const riskColor = state.player.legalRisk >= 5 ? "#ff8f8f" : state.player.legalRisk >= 2 ? "#ffbb40" : "#72ff9d";
    this.drawText(`${system.name} Dock`, this.width / 2, this.height * 0.18, { align: "center", size: 28, color: "#fff" });
    this.drawText("Station services online", this.width / 2, this.height * 0.25, { align: "center", color: "#72ff9d" });
    this.drawText(
      `Rank: ${state.pilotRank.title}`,
      this.width / 2, this.height * 0.31, { align: "center", color: "#86ffb2", size: 16 }
    );
    this.drawText(
      `Hull ${Math.round(state.player.hull)}/${state.player.maxHull}   Credits ${Math.round(state.player.credits)}`,
      this.width / 2, this.height * 0.37, { align: "center", color: hullColor, size: 15 }
    );
    this.drawText(
      `Reputation: ${repLabel}   Status: ${riskLabel}`,
      this.width / 2, this.height * 0.43, { align: "center", color: riskColor, size: 14 }
    );
    if (state.player.activeMission) {
      const am = state.player.activeMission;
      const dest = state.systems[am.destinationSystemId]?.name ?? "unknown";
      const deadlineText = am.deadlineJumps >= 0 ? `${am.deadlineJumps}j left` : "no deadline";
      this.drawText(
        `Active: ${am.title} → ${dest}  [${deadlineText}]`,
        this.width / 2, this.height * 0.49, { align: "center", color: "#86ffb2", size: 13 }
      );
    }
    this.drawText("T: Market   E: Equipment   R: Missions   M: Map   D: Launch", this.width / 2, this.height * 0.56, {
      align: "center", size: 15
    });
    const y = this.height * 0.64;
    this.button("touch-trade", "Market", this.width / 2 - 185, y, 90, 38);
    this.button("touch-equipment", "Gear", this.width / 2 - 85, y, 80, 38);
    this.button("touch-missions", "Missions", this.width / 2 + 5, y, 100, 38);
    this.button("touch-dock", "Launch", this.width / 2 + 115, y, 90, 38);
    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderTrade(state: RenderState): void {
    this.panel(this.width * 0.06, this.height * 0.08, this.width * 0.88, this.height * 0.84);
    const cargoUsed = getTotalOccupiedCargo(state.player);
    const missionCargo = state.player.missionCargoUnits ?? 0;
    const cargoLabel = missionCargo > 0
      ? `${cargoUsed}/${state.player.cargoCapacity} (${missionCargo} mission)`
      : `${cargoUsed}/${state.player.cargoCapacity}`;
    this.drawText("Station Market", this.width / 2, this.height * 0.14, { align: "center", size: 24, color: "#fff" });
    this.drawText(
      `Credits ${state.player.credits}   Cargo ${cargoLabel}   Fuel ${state.player.fuel.toFixed(1)}/${TRADE_CONSTANTS.maxFuel}`,
      this.width / 2, this.height * 0.19, { align: "center", color: "#b8ffd0" }
    );

    const left = this.width * 0.13;
    const top = this.height * 0.26;
    this.drawText("Key", left, top - 28, { align: "left", color: "#72ff9d" });
    this.drawText("Commodity", left + 50, top - 28, { align: "left", color: "#72ff9d" });
    this.drawText("Price", left + 250, top - 28, { align: "left", color: "#72ff9d" });
    this.drawText("Trend", left + 330, top - 28, { align: "left", color: "#72ff9d" });
    this.drawText("Supply", left + 410, top - 28, { align: "left", color: "#72ff9d" });
    this.drawText("Held", left + 490, top - 28, { align: "left", color: "#72ff9d" });

    const rowW = this.width * 0.74;
    state.market.forEach((item, index) => {
      const y = top + index * 34;
      const rowY = y - 15;
      const rowH = 30;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);
      if (hovered) {
        this.ctx.fillStyle = "rgba(60,255,120,0.10)";
        this.ctx.fillRect(left, rowY, rowW, rowH);
      }
      this.buttonZones.push({ id: `trade-row-${index}`, label: item.name, x: left, y: rowY, width: rowW, height: rowH });

      const prevPrice = state.previousPrices[item.id];
      const trend = getPriceTrend(prevPrice, item.price);
      const trendColor = trend.label === "rising" ? "#ff9f9f" : trend.label === "falling" ? "#9fff9f" : "#b8ffd0";
      const trendText = trend.label === "unknown" || trend.label === "stable"
        ? "—"
        : `${trend.symbol}${trend.delta > 0 ? "+" : ""}${trend.delta}%`;

      this.drawText(`${index + 1}`, left, y, { align: "left" });
      this.drawText(item.name, left + 50, y, { align: "left" });
      this.drawText(`${item.price}`, left + 250, y, { align: "left" });
      this.drawText(trendText, left + 330, y, { align: "left", color: trendColor, size: 14 });
      this.drawText(`${item.quantity}`, left + 410, y, { align: "left" });
      this.drawText(`${state.player.cargo[item.id] ?? 0}`, left + 490, y, { align: "left" });
    });

    this.drawText(
      "Click buy · Shift+Click sell · Alt+Click max-buy · Alt+Shift+Click sell-all · 1-8 · Alt+1-8 max · F fuel · Esc",
      this.width / 2, this.height * 0.8, { align: "center", color: "#d8ffe7", size: 13 }
    );
    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderEquipment(state: RenderState): void {
    this.panel(this.width * 0.08, this.height * 0.1, this.width * 0.84, this.height * 0.82);
    this.drawText("Equipment Bay", this.width / 2, this.height * 0.16, { align: "center", size: 24, color: "#fff" });
    const left = this.width * 0.16;
    const top = this.height * 0.26;
    const rowW = this.width * 0.68;
    EQUIPMENT.forEach((item, index) => {
      const installed = state.player.equipment[item.id];
      const y = top + index * 56;
      const rowY = y - 22;
      const rowH = 44;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);
      if (hovered && !installed) {
        this.ctx.fillStyle = "rgba(60,255,120,0.10)";
        this.ctx.fillRect(left, rowY, rowW, rowH);
      }
      this.buttonZones.push({ id: `equip-row-${index}`, label: item.name, x: left, y: rowY, width: rowW, height: rowH });
      this.drawText(`${index + 1}`, left, y, { align: "left", color: "#72ff9d" });
      this.drawText(item.name, left + 42, y, { align: "left", color: installed ? "#86ffb2" : "#fff" });
      this.drawText(installed ? "INSTALLED" : `${item.price} BAL`, left + 240, y, { align: "left" });
      this.drawText(item.description, left + 390, y, { align: "left", size: 13, color: "#b8ffd0" });
    });

    const repairY = top + EQUIPMENT.length * 56 + 22;
    const missing = state.player.maxHull - state.player.hull;
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? "#ff6a6a" : hullFraction < 0.6 ? "#ffbb40" : "#86ffb2";
    this.drawText(`Hull integrity: ${Math.round(state.player.hull)} / ${state.player.maxHull}`, left, repairY, { align: "left", color: hullColor });
    if (missing > 0) {
      const repairCost = calcRepairCost(state.player);
      const canAfford = state.player.credits >= 5;
      const repairLabel = `Repair hull  (${repairCost} BAL)  [H]`;
      const hovered = isPointInRect(state.mousePosition, left + 260, repairY - 14, 280, 28);
      if (hovered && canAfford) {
        this.ctx.fillStyle = "rgba(60,255,120,0.10)";
        this.ctx.fillRect(left + 260, repairY - 14, 280, 28);
      }
      this.drawText(repairLabel, left + 260, repairY, { align: "left", color: canAfford ? "#d8ffe7" : "#888" });
      this.buttonZones.push({ id: "equip-repair", label: "Repair Hull", x: left + 260, y: repairY - 14, width: 280, height: 28 });
    } else {
      this.drawText("Hull fully repaired", left + 260, repairY, { align: "left", color: "#86ffb2" });
    }

    this.drawText("Click row or 1-5 to purchase.  H repairs hull.  Esc back.", this.width / 2, this.height * 0.86, {
      align: "center",
      color: "#d8ffe7"
    });
  }

  private renderMissions(state: RenderState): void {
    this.panel(this.width * 0.06, this.height * 0.08, this.width * 0.88, this.height * 0.84);
    this.drawText("Mission Board", this.width / 2, this.height * 0.14, { align: "center", size: 24, color: "#fff" });
    const active = state.player.activeMission;
    if (active) {
      const dest = state.systems[active.destinationSystemId]?.name ?? "unknown";
      const deadlineText = active.deadlineJumps >= 0 ? `${active.deadlineJumps} jump${active.deadlineJumps !== 1 ? "s" : ""} remaining` : "no deadline";
      const deadlineColor = active.deadlineJumps >= 0 && active.deadlineJumps <= 1 ? "#ff8f8f" : "#86ffb2";
      this.drawText(`Active: ${active.title}  →  ${dest}  [${deadlineText}]`, this.width / 2, this.height * 0.2, {
        align: "center", color: deadlineColor
      });
    } else {
      this.drawText("No active mission.", this.width / 2, this.height * 0.2, { align: "center", color: "#b8ffd0" });
    }

    const left = this.width * 0.12;
    const top = this.height * 0.29;
    const rowW = this.width * 0.76;
    state.missions.forEach((mission, index) => {
      const y = top + index * 58;
      const rowY = y - 24;
      const rowH = 48;
      const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);
      if (hovered && !active) {
        this.ctx.fillStyle = "rgba(60,255,120,0.10)";
        this.ctx.fillRect(left, rowY, rowW, rowH);
      }
      this.buttonZones.push({ id: `mission-row-${index}`, label: mission.title, x: left, y: rowY, width: rowW, height: rowH });
      this.drawText(`${index + 1}`, left, y, { align: "left", color: "#72ff9d" });
      this.drawText(mission.title, left + 38, y, { align: "left", color: "#fff" });
      this.drawText(`${mission.reward} BAL`, left + 270, y, { align: "left" });

      const cargoText = mission.cargoUnitsRequired > 0 ? `${mission.cargoUnitsRequired}t cargo` : "no cargo";
      const deadlineText = mission.deadlineJumps >= 0 ? `${mission.deadlineJumps}j limit` : "open";
      this.drawText(`${cargoText} · ${deadlineText}`, left + 370, y, { align: "left", size: 13, color: "#b8ffd0" });
      this.drawText(state.systems[mission.destinationSystemId]?.name ?? "?", left + 530, y, { align: "left", size: 13, color: "#d8ffe7" });
    });
    this.drawText("Click row or 1-6 to accept.  Jump to destination to complete.  Esc back.", this.width / 2, this.height * 0.84, {
      align: "center", color: "#d8ffe7"
    });
    if (state.activeHint !== null) this.renderOnboardingHint(state.activeHint);
  }

  private renderPause(state: RenderState): void {
    this.panel(this.width / 2 - 170, this.height / 2 - 135, 340, 270);
    this.drawText("Paused", this.width / 2, this.height / 2 - 82, { align: "center", color: "#fff", size: 28 });
    this.drawText("Enter: resume", this.width / 2, this.height / 2 - 28, { align: "center" });
    this.drawText("Saves automatically after jumps and docking.", this.width / 2, this.height / 2 + 12, {
      align: "center",
      color: "#b8ffd0",
      size: 14
    });
    this.drawText(`Credits ${state.player.credits}`, this.width / 2, this.height / 2 + 54, { align: "center" });
  }

  private renderGameOver(state: RenderState): void {
    const panelW = Math.min(540, this.width * 0.86);
    const panelH = 460;
    const px = this.width / 2 - panelW / 2;
    const py = this.height / 2 - panelH / 2;

    this.ctx.globalAlpha = 0.72;
    this.ctx.fillStyle = "#000";
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.globalAlpha = 1;

    this.panel(px, py, panelW, panelH);

    const cx = this.width / 2;
    let row = py + 36;
    const rowGap = 26;

    this.drawText("SHIP DISABLED", cx, row, { align: "center", color: "#ff6a6a", size: 26 });
    row += rowGap + 8;
    this.drawText(`Final Rank: ${state.pilotRank.title}`, cx, row, { align: "center", color: "#86ffb2", size: 18 });
    row += rowGap;
    this.drawText(`Cause: ${state.runStats.causeOfDeath}`, cx, row, { align: "center", color: "#ffbb40", size: 15 });
    row += rowGap + 6;

    const labelX = px + 42;
    const valueX = px + panelW - 42;
    const statRows: Array<[string, string]> = [
      ["Credits Earned", `${state.runStats.totalCreditsEarned} BAL`],
      ["Final Balance", `${Math.round(state.player.credits)} BAL`],
      ["Systems Visited", `${state.runStats.systemsVisited.length}`],
      ["Jumps Completed", `${state.runStats.jumpsCompleted}`],
      ["Missions Done", `${state.runStats.missionsCompleted}`],
      ["Missions Failed", `${state.runStats.missionsFailed}`],
      ["Enemies Destroyed", `${state.runStats.enemiesDestroyed}`],
      ["Time Played", formatTimePlayed(state.runStats.timePlayed)],
    ];
    for (const [label, value] of statRows) {
      this.drawText(label, labelX, row, { align: "left", color: "#b8ffd0", size: 14 });
      this.drawText(value, valueX, row, { align: "right", color: "#d8ffe7", size: 14 });
      row += rowGap;
    }

    const pb = state.meta.personalBest?.totalCreditsEarned ?? 0;
    if (pb > 0 || state.isNewPersonalBest) {
      const pbLabel = state.isNewPersonalBest ? "New Personal Best!" : `Personal Best: ${pb} BAL`;
      const pbColor = state.isNewPersonalBest ? "#ffe066" : "#72ff9d";
      this.drawText(pbLabel, cx, row, { align: "center", color: pbColor, size: 14 });
      row += rowGap;
    }

    row = py + panelH - 54;
    this.button("death-restart", "Restart  [R]", cx - 170, row, 150, 36);
    this.button("death-menu", "Main Menu  [Esc]", cx + 20, row, 180, 36);
  }

  private renderOnboardingHint(hint: HintId): void {
    const hintText = HINT_TEXT[hint];
    const barH = 56;
    const barY = this.height - barH - 8;

    this.ctx.globalAlpha = 0.88;
    this.ctx.fillStyle = "#001a0a";
    this.ctx.fillRect(0, barY, this.width, barH);
    this.ctx.globalAlpha = 1;
    this.ctx.strokeStyle = "#3cff78";
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(0, barY, this.width, barH);

    this.drawText(hintText, this.width / 2, barY + barH / 2, { align: "center", color: "#d8ffe7", size: 14 });
    this.buttonZones.push({ id: "hint-dismiss", label: "Dismiss hint", x: 0, y: barY, width: this.width, height: barH });
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
      const r = rp * baseRadius * 2.4;
      this.ctx.globalAlpha = Math.max(0, alpha * (1 - rp) * 0.9);
      this.ctx.strokeStyle = ring === 0 ? "#ffb040" : "#ff7820";
      this.ctx.lineWidth = 2.2 - ring * 0.5;
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, Math.max(1, r), 0, Math.PI * 2);
      this.ctx.stroke();
    }
    const sparkCount = 8;
    for (let i = 0; i < sparkCount; i += 1) {
      const angle = (Math.PI * 2 * i) / sparkCount;
      const len = progress * baseRadius * 2.2;
      this.ctx.globalAlpha = Math.max(0, alpha * 0.75);
      this.ctx.strokeStyle = "#ffef80";
      this.ctx.lineWidth = 1.4;
      this.ctx.beginPath();
      this.ctx.moveTo(point.x, point.y);
      this.ctx.lineTo(point.x + Math.cos(angle) * len, point.y + Math.sin(angle) * len);
      this.ctx.stroke();
    }
    this.ctx.globalAlpha = 1;
  }

  private renderHitFlash(intensity: number): void {
    const alpha = Math.min(0.32, intensity * 0.7);
    this.ctx.globalAlpha = alpha;
    this.ctx.fillStyle = "#ff4040";
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
    this.setVectorStroke("#3cff78", 1.5, false);
    this.ctx.strokeRect(x, y, width, height);
    this.drawText(label, x + width / 2, y + height / 2 + 6, { align: "center", color: "#d8ffe7", size: 17 });
  }

  private panel(x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = "rgba(0, 12, 6, 0.92)";
    this.ctx.fillRect(x, y, width, height);
    this.setVectorStroke("#3cff78", 1.5, false);
    this.ctx.strokeRect(x, y, width, height);
  }

  private hudPanel(x: number, y: number, width: number, height: number): void {
    this.ctx.fillStyle = "rgba(0, 18, 8, 0.62)";
    this.ctx.fillRect(x, y, width, height);
    this.setVectorStroke("#286d45", 1, false);
    this.ctx.strokeRect(x, y, width, height);
  }

  private setVectorStroke(color: string, width: number, glow: boolean): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.shadowBlur = glow ? 8 : 0;
    this.ctx.shadowColor = glow ? color : "transparent";
  }

  private drawCenteredTitle(text: string, y: number): void {
    this.drawText(text, this.width / 2, y, { align: "center", color: "#fff", size: 42 });
    this.ctx.strokeStyle = "#3cff78";
    this.ctx.beginPath();
    this.ctx.moveTo(this.width / 2 - 190, y + 18);
    this.ctx.lineTo(this.width / 2 + 190, y + 18);
    this.ctx.stroke();
  }

  private drawText(
    text: string,
    x: number,
    y: number,
    options: { align?: CanvasTextAlign; color?: string; size?: number } = {}
  ): void {
    this.ctx.shadowBlur = 0;
    this.ctx.shadowColor = "transparent";
    this.ctx.fillStyle = options.color ?? "#d8ffe7";
    this.ctx.font = `${options.size ?? 16}px "Courier New", monospace`;
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

