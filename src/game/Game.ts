import { ModernAudio, type AmbientMode } from "./Audio";
import { createEnemyShip, fireEnemyLaser, fireLaser, resolveProjectileHits, selectEnemyClass, updateEnemy } from "./Combat";
import {
  applyEconomyDrift,
  applyTradeToEconomy,
  createEconomyState,
  generateDynamicMarket,
  getLastKnownPrice,
  recordPriceHistory
} from "./Economy";
import { buyEquipment, DEFAULT_EQUIPMENT, getEquipmentKeys, getLaserProfile } from "./Equipment";
import { Input } from "./Input";
import { normalizeMapAction, normalizeMarketAction } from "./InputRouter";
import { DEFAULT_MAP_FILTERS, type MapFilterState, selectAdjacentFilteredSystem } from "./MapSearch";
import { acceptMission, completeMission, decrementMissionDeadline, generateMissions } from "./Missions";
import { dismissHint, shouldShowHint, type HintId } from "./Onboarding";
import { clamp, distance, length, updateOrientation, updatePosition, updateVelocity, vec3 } from "./Physics";
import { getPilotRank, type RankInfo } from "./Rank";
import { Renderer } from "./Renderer";
import type { ExplosionEffect } from "./Renderer";
import {
  addBalEarned,
  advanceTimePlayed,
  createRunStats,
  recordEnemyDestroyed,
  recordJump,
  recordMissionCompleted,
  recordMissionFailed,
  setDeathCause,
  type RunStats
} from "./RunStats";
import { hasSave, loadGame, saveGame } from "./SaveGame";
import { buyShip, getPlayerShipStats, PLAYER_SHIPS, STARTER_SHIP_ID } from "./Ships";
import { getStationProfile, hasStationService } from "./StationServices";
import { createInitialTransientState } from "./TransientState";
import { buyCommodity, buyFuel, getBulkBuyQuantity, getBulkSellQuantity, repairHull, sellCommodity } from "./Trading";
import { canJump, generateUniverse, getFuelRequired, getJumpDistance } from "./Universe";
import type {
  ButtonZone,
  EconomyState,
  EquipmentId,
  GameMode,
  MarketItem,
  Meta,
  Mission,
  PlayerShipId,
  PlayerState,
  Projectile,
  SaveData,
  Ship,
  StarSystem,
  Vector3
} from "./types";

const GAME_SEED = 492017;
const STATION_POSITION = vec3(0, 0, 62);
const DOCKING_RANGE = 78;
const DOCKING_DURATION = 1.35;
const WARNING_COOLDOWN = 2.5;
const RESPAWN_DELAY = 5.0;
const EQUIPMENT_PAGE_SIZE = 8;

const HINT_MODES: Partial<Record<GameMode, HintId>> = {
  flight: "flight",
  docked: "docking",
  trade: "trade",
  map: "map",
  missions: "missions",
  shipyard: "shipyard",
};

export class Game {
  private readonly input: Input;
  private readonly renderer: Renderer;
  private readonly audio = new ModernAudio();
  private systems: StarSystem[] = generateUniverse(GAME_SEED);
  private economy: EconomyState = createEconomyState(this.systems);
  private market: MarketItem[] = generateDynamicMarket(this.systems[0], this.economy);
  private missions: Mission[] = generateMissions(GAME_SEED, this.systems[0], this.systems, createInitialPlayer());
  private mode: GameMode = "start";
  private previousMode: GameMode = "flight";
  private player: PlayerState = createInitialPlayer();
  private enemy: Ship = createEnemyShip();
  private projectiles: Projectile[] = [];
  private selectedSystemId = 1;
  private selectedShipId: PlayerShipId = PLAYER_SHIPS[1].id;
  private equipmentPage = 0;
  private mapFilters: MapFilterState = { ...DEFAULT_MAP_FILTERS };
  private message = "";
  private lastTime = 0;
  private enemyCooldown = 1.5;
  private playerLaserCooldown = 0;
  private warningCooldown = 0;
  private dockingProgress = 0;
  private phosphorGlow = true;
  private animationFrame = 0;
  private respawnCountdown: number | null = null;
  private playerHitFlash = 0;
  private explosionEffect: ExplosionEffect | null = null;
  private runStats: RunStats = createRunStats(0);
  private meta: Meta = { hasSeenOnboarding: false, dismissedHints: [] };
  private isNewPersonalBest = false;
  private lastAmbientMode: AmbientMode = "none";
  private readonly mapSearchInput: HTMLInputElement;

  constructor(canvas: HTMLCanvasElement) {
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.mapSearchInput = this.createMapSearchInput();
    this.economy = recordPriceHistory(this.economy, this.player.currentSystemId, this.market);
  }

  start(): void {
    this.input.attach();
    this.lastTime = performance.now();
    this.animationFrame = requestAnimationFrame(this.loop);
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrame);
    this.input.detach();
    this.mapSearchInput.remove();
  }

  getDebugSnapshot(): { mode: GameMode; selectedSystemId: number; message: string; player: Pick<PlayerState, "docked" | "balance" | "fuel">; buttons: ButtonZone[] } {
    return {
      mode: this.mode,
      selectedSystemId: this.selectedSystemId,
      message: this.message,
      player: {
        docked: this.player.docked,
        balance: this.player.balance,
        fuel: this.player.fuel
      },
      buttons: this.renderer.getButtons()
    };
  }

  private readonly loop = (time: number): void => {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0);
    this.lastTime = time;
    this.update(dt);
    this.updateAmbient();
    this.render();
    this.input.endFrame();
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.handleClick();

    if (this.input.consume("KeyU")) {
      this.audio.unlock();
      this.audio.setMuted(!this.audio.isMuted());
      this.message = this.audio.isMuted() ? "Audio muted" : "Audio enabled";
      this.persist();
    }

    if (this.input.consume("KeyG")) {
      this.phosphorGlow = !this.phosphorGlow;
      this.message = this.phosphorGlow ? "Phosphor glow enabled" : "Crisp vector mode enabled";
    }

    if (this.mode === "start") {
      this.updateStart();
      return;
    }

    if (this.mode === "controls") {
      if (this.input.consume("Escape") || this.input.consume("Enter")) this.mode = "start";
      return;
    }

    if (this.mode === "gameOver") {
      if (this.input.consume("KeyR")) this.newGame();
      if (this.input.consume("Escape")) this.mode = "start";
      return;
    }

    if (this.input.consume("Escape")) {
      if (this.mode === "paused") this.mode = this.previousMode;
      else if (this.mode === "settings") this.mode = "paused";
      else if (this.mode === "map" || this.mode === "trade" || this.mode === "equipment" || this.mode === "shipyard" || this.mode === "missions") {
        this.mode = this.player.docked ? "docked" : "flight";
      } else {
        this.previousMode = this.mode;
        this.mode = "paused";
      }
      return;
    }

    if (this.mode === "paused") {
      if (this.input.consume("Enter")) this.mode = this.previousMode;
      return;
    }

    // Track time for all active non-paused game states
    this.runStats = advanceTimePlayed(this.runStats, dt);

    // Onboarding hint dismissal intercepts Enter before mode-specific handlers
    const activeHint = this.getActiveHint();
    if (activeHint !== null && this.input.consume("Enter")) {
      this.meta = dismissHint(this.meta, activeHint);
      this.persist();
      return;
    }

    if (this.mode === "docking") {
      this.updateDocking(dt);
      return;
    }

    if (this.input.consume("KeyM")) {
      this.audio.unlock();
      this.audio.play("ui");
      this.mode = this.mode === "map" ? (this.player.docked ? "docked" : "flight") : "map";
    }

    if (this.mode === "map") {
      this.updateMap();
      return;
    }

    if (this.player.docked) {
      if (this.input.consume("KeyT")) this.openStationMode("trade");
      if (this.input.consume("KeyE")) this.openStationMode("equipment");
      if (this.input.consume("KeyY")) this.openStationMode("shipyard");
      if (this.input.consume("KeyR")) this.openStationMode("missions");
    }

    if (this.mode === "trade") {
      this.updateTrade();
      return;
    }

    if (this.mode === "equipment") {
      this.updateEquipment();
      return;
    }

    if (this.mode === "shipyard") {
      this.updateShipyard();
      return;
    }

    if (this.mode === "missions") {
      this.updateMissions();
      return;
    }

    if (this.input.consume("KeyD")) {
      this.handleDockCommand();
    }

    if (this.mode === "docked") {
      return;
    }

    this.updateFlight(dt);
  }

  private updateStart(): void {
    if (this.input.consume("Digit1") || this.input.consume("Enter")) {
      this.audio.unlock();
      this.audio.play("ui");
      this.newGame();
    }
    if (this.input.consume("Digit2")) {
      this.audio.unlock();
      this.audio.play("ui");
      this.continueGame();
    }
    if (this.input.consume("Digit3")) this.mode = "controls";
  }

  private updateFlight(dt: number): void {
    const axes = this.input.getFlightAxes();
    const shipStats = getPlayerShipStats(this.player);
    this.player = {
      ...this.player,
      orientation: updateOrientation(this.player.orientation, axes, dt, shipStats.handlingModifier)
    };
    const velocity = updateVelocity(this.player.velocity, this.player.orientation, axes.throttle, dt, shipStats.speedModifier);
    const shieldRecharge = this.player.equipment.quietShieldMatrix ? 2.6 : 2;
    this.player = {
      ...this.player,
      velocity,
      position: updatePosition(this.player.position, velocity, dt),
      speed: length(velocity),
      energy: clamp(this.player.energy + dt * 3, 0, 100),
      shield: clamp(this.player.shield + dt * shieldRecharge, 0, this.player.maxShield),
      fuel:
        this.player.equipment.fuelScoop && length(velocity) > 12
          ? clamp(Number((this.player.fuel + dt * 0.035).toFixed(3)), 0, shipStats.fuelCapacity)
          : this.player.fuel
    };

    this.playerLaserCooldown = Math.max(0, this.playerLaserCooldown - dt);
    this.warningCooldown = Math.max(0, this.warningCooldown - dt);
    if (this.playerHitFlash > 0) this.playerHitFlash = Math.max(0, this.playerHitFlash - dt);
    if (this.explosionEffect) {
      this.explosionEffect = { ...this.explosionEffect, age: this.explosionEffect.age + dt };
      if (this.explosionEffect.age >= this.explosionEffect.maxAge) this.explosionEffect = null;
    }

    if (this.input.consume("Space")) {
      this.firePlayerLaser();
    }

    const wasAlive = this.enemy.alive;
    const previousEnemyHull = this.enemy.hull;
    if (this.enemy.alive) {
      this.enemy = updateEnemy(this.enemy, this.player, dt);
      this.enemyCooldown -= dt;
      if (this.enemyCooldown <= 0) {
        this.projectiles.push(fireEnemyLaser(this.enemy));
        this.enemyCooldown = this.enemy.fireCooldown;
      }
    }

    const prevPlayerShield = this.player.shield;
    const prevPlayerHull = this.player.hull;
    const resolved = resolveProjectileHits(this.projectiles, this.enemy, this.player, dt);
    this.projectiles = resolved.projectiles;
    this.enemy = resolved.enemy;
    this.player = resolved.player;

    if (resolved.player.shield < prevPlayerShield || resolved.player.hull < prevPlayerHull) {
      this.playerHitFlash = 0.28;
    }

    if (resolved.player.hull < prevPlayerHull) {
      this.audio.play("damage");
    }

    if (this.enemy.hull < previousEnemyHull && this.enemy.alive) {
      this.audio.play("hit");
    }

    if (wasAlive && !this.enemy.alive) {
      this.player = {
        ...this.player,
        reputation: this.player.reputation + 4,
        legalRisk: Math.max(0, this.player.legalRisk - 1)
      };
      this.runStats = recordEnemyDestroyed(this.runStats);
      this.explosionEffect = { worldPosition: { ...this.enemy.position }, age: 0, maxAge: 1.5 };
      this.respawnCountdown = RESPAWN_DELAY;
      this.message = `${this.enemy.name} destroyed`;
      this.audio.play("destroyed");
      this.persist();
    }

    if (this.respawnCountdown !== null) {
      this.respawnCountdown = Math.max(0, this.respawnCountdown - dt);
      if (this.respawnCountdown === 0) {
        this.spawnEnemy();
        this.respawnCountdown = null;
      }
    }

    if (this.player.shield < 25 && this.warningCooldown <= 0) {
      this.audio.play("warning");
      this.warningCooldown = WARNING_COOLDOWN;
    }

    if (this.player.hull <= 0) {
      this.runStats = setDeathCause(this.runStats, "Destroyed in combat");
      this.finalizeDeathStats();
      this.mode = "gameOver";
    }
  }

  private finalizeDeathStats(): void {
    const currentBest = this.meta.personalBest?.totalBalEarned ?? 0;
    if (this.runStats.totalBalEarned > currentBest) {
      this.meta = { ...this.meta, personalBest: { totalBalEarned: this.runStats.totalBalEarned } };
      this.isNewPersonalBest = true;
    }
    this.persist();
  }

  private spawnEnemy(): void {
    const classIdx = selectEnemyClass(this.player.reputation, this.player.legalRisk);
    const spawnPos: Vector3 = vec3(0, 0, 85);
    this.enemy = createEnemyShip(`contact-${this.player.currentSystemId}-${Date.now()}`, spawnPos, classIdx);
    this.enemyCooldown = this.enemy.fireCooldown;
    this.message = "New contact detected";
  }

  private firePlayerLaser(): void {
    const profile = getLaserProfile(this.player);
    if (this.player.energy < profile.energyCost || this.playerLaserCooldown > 0) {
      this.message = "Laser charge unavailable";
      this.audio.play("tradeFail");
      return;
    }

    this.audio.unlock();
    this.projectiles.push(fireLaser("player", this.player.position, this.player.orientation, this.player.velocity, profile.damage));
    this.player = { ...this.player, energy: this.player.energy - profile.energyCost };
    this.playerLaserCooldown = this.player.equipment.beamLaser ? 0.34 : 0.22;
    this.message = `${profile.label} fired`;
    this.audio.play("laser");
  }

  private updateMap(): void {
    const action = this.input.consumeAction(normalizeMapAction);
    if (!action) return;

    if (action === "previous") {
      this.selectedSystemId = selectAdjacentFilteredSystem(this.systems, this.selectedSystemId, -1, this.mapFilters, this.player);
      this.audio.play("ui");
    }
    if (action === "next") {
      this.selectedSystemId = selectAdjacentFilteredSystem(this.systems, this.selectedSystemId, 1, this.mapFilters, this.player);
      this.audio.play("ui");
    }
    if (action === "jump") {
      this.jumpToSelectedSystem();
    }
    if (action === "return") {
      this.mode = this.player.docked ? "docked" : "flight";
    }
  }

  private updateTrade(): void {
    const action = this.input.consumeAction(normalizeMarketAction);
    if (!action) return;

    if (action.type === "buyFuel") {
      const result = buyFuel(this.player, 0.5);
      this.applyTradeResult(result.ok, result.player, result.reason);
      return;
    }

    const item = this.market[action.index];
    if (!item) return;

    if (action.type === "bulkBuyCommodity") {
      this.doBulkBuy(item);
      return;
    }

    if (action.type === "bulkSellCommodity") {
      this.doBulkSell(item);
      return;
    }

    const prevBalance = this.player.balance;
    const result =
      action.type === "sellCommodity" ? sellCommodity(this.player, item, 1) : buyCommodity(this.player, item, 1);

    if (result.ok) {
      if (action.type === "sellCommodity") {
        const revenue = result.player.balance - prevBalance;
        if (revenue > 0) this.runStats = addBalEarned(this.runStats, revenue);
      }
      const quantityDelta = action.type === "sellCommodity" ? 1 : -1;
      this.economy = applyTradeToEconomy(this.economy, this.player.currentSystemId, item.id, quantityDelta);
      this.player = {
        ...result.player,
        legalRisk: getTradeLegalRisk(result.player.legalRisk, item.id, action.type)
      };
      this.refreshMarket(true);
      this.applyTradeResult(true, this.player);
    } else {
      this.applyTradeResult(false, result.player, result.reason);
    }
  }

  private doBulkBuy(item: MarketItem): void {
    const qty = getBulkBuyQuantity(this.player, item);
    if (qty <= 0) {
      this.applyTradeResult(false, this.player, "Cannot buy: no BAL, cargo space, or market supply");
      return;
    }
    const result = buyCommodity(this.player, item, qty);
    if (result.ok) {
      this.economy = applyTradeToEconomy(this.economy, this.player.currentSystemId, item.id, -qty);
      this.player = {
        ...result.player,
        legalRisk: getTradeLegalRisk(result.player.legalRisk, item.id, "buyCommodity")
      };
      this.refreshMarket(true);
      this.message = `Bought ${qty} × ${item.name} for ${qty * item.price} BAL`;
      this.audio.play("tradeOk");
      this.persist();
    } else {
      this.applyTradeResult(false, result.player, result.reason);
    }
  }

  private doBulkSell(item: MarketItem): void {
    const qty = getBulkSellQuantity(this.player, item);
    if (qty <= 0) {
      this.applyTradeResult(false, this.player, `None of ${item.name} in hold`);
      return;
    }
    const prevBalance = this.player.balance;
    const result = sellCommodity(this.player, item, qty);
    if (result.ok) {
      const revenue = result.player.balance - prevBalance;
      if (revenue > 0) this.runStats = addBalEarned(this.runStats, revenue);
      this.economy = applyTradeToEconomy(this.economy, this.player.currentSystemId, item.id, qty);
      this.player = {
        ...result.player,
        legalRisk: getTradeLegalRisk(result.player.legalRisk, item.id, "sellCommodity")
      };
      this.refreshMarket(true);
      this.message = `Sold ${qty} × ${item.name} for ${qty * item.price} BAL`;
      this.audio.play("tradeOk");
      this.persist();
    } else {
      this.applyTradeResult(false, result.player, result.reason);
    }
  }

  private updateEquipment(): void {
    const station = getStationProfile(this.systems[this.player.currentSystemId]);
    if (this.input.consume("KeyH")) {
      const result = repairHull(this.player, station.repairCostModifier);
      this.applyTradeResult(result.ok, result.player, result.reason ?? "Hull repair failed");
      return;
    }

    if (this.input.consume("KeyN")) {
      this.equipmentPage = Math.min(this.getEquipmentPageCount() - 1, this.equipmentPage + 1);
      this.audio.play("ui");
      return;
    }

    if (this.input.consume("KeyP")) {
      this.equipmentPage = Math.max(0, this.equipmentPage - 1);
      this.audio.play("ui");
      return;
    }

    const equipmentKeys = this.getVisibleEquipmentKeys();
    for (let index = 0; index < equipmentKeys.length; index += 1) {
      if (!this.input.consume(`Digit${index + 1}`)) continue;

      const result = buyEquipment(this.player, equipmentKeys[index], station);
      this.applyTradeResult(result.ok, result.player, result.reason);
      return;
    }
  }

  private updateShipyard(): void {
    for (let index = 0; index < PLAYER_SHIPS.length; index += 1) {
      if (!this.input.consume(`Digit${index + 1}`)) continue;
      this.selectedShipId = PLAYER_SHIPS[index].id;
      this.audio.play("ui");
      return;
    }

    if (this.input.consume("Enter")) {
      this.purchaseSelectedShip();
    }
  }

  private updateMissions(): void {
    for (let index = 0; index < this.missions.length; index += 1) {
      if (!this.input.consume(`Digit${index + 1}`)) continue;

      if (this.player.activeMission) {
        this.message = "Complete the active mission before accepting another";
        this.audio.play("tradeFail");
        return;
      }

      const mission = this.missions[index];
      const result = acceptMission(this.player, mission);
      if (!result.ok) {
        this.message = result.reason ?? "Cannot accept mission";
        this.audio.play("tradeFail");
      } else {
        this.player = result.player;
        this.message = `Accepted: ${mission.title}`;
        this.audio.play("missionAccepted");
        this.persist();
      }
      return;
    }
  }

  private openStationMode(mode: "trade" | "equipment" | "shipyard" | "missions"): void {
    const current = this.systems[this.player.currentSystemId];
    const service = mode === "trade" ? "market" : mode === "equipment" ? "equipment" : mode === "shipyard" ? "shipyard" : "missions";
    if (!hasStationService(current, service)) {
      this.message = `${modeLabel(mode)} unavailable at this station`;
      this.audio.play("tradeFail");
      return;
    }

    this.mode = mode;
    this.audio.play("ui");
  }

  private purchaseSelectedShip(): void {
    const result = buyShip(this.player, this.selectedShipId);
    if (result.ok) {
      this.player = result.player;
      this.message = "Ship transfer complete";
      this.audio.play("tradeOk");
      this.persist();
    } else {
      this.message = result.reason ?? "Ship transfer blocked";
      this.audio.play("tradeFail");
    }
  }

  private getVisibleEquipmentKeys(): EquipmentId[] {
    const keys = getEquipmentKeys();
    const start = this.equipmentPage * EQUIPMENT_PAGE_SIZE;
    return keys.slice(start, start + EQUIPMENT_PAGE_SIZE);
  }

  private getEquipmentPageCount(): number {
    return Math.max(1, Math.ceil(getEquipmentKeys().length / EQUIPMENT_PAGE_SIZE));
  }

  private cycleMapFilter(zoneId: string): void {
    if (zoneId === "map-filter-clear") {
      this.mapFilters = { ...DEFAULT_MAP_FILTERS };
      this.mapSearchInput.value = "";
      this.message = "Map filters cleared";
      this.audio.play("ui");
      return;
    }

    if (zoneId === "map-filter-hazard") {
      const values: MapFilterState["hazard"][] = ["all", "calm", "ionWeather", "debris", "patrolGap", "signalNoise", "raiderTrace"];
      this.mapFilters = { ...this.mapFilters, hazard: nextValue(values, this.mapFilters.hazard) };
    }

    if (zoneId === "map-filter-economy") {
      const values: MapFilterState["economy"][] = ["all", "Agricultural", "Industrial", "Research", "Mining", "Periphery", "Trade Hub"];
      this.mapFilters = { ...this.mapFilters, economy: nextValue(values, this.mapFilters.economy) };
    }

    if (zoneId === "map-filter-discovery") {
      const values: MapFilterState["discovery"][] = ["all", "discovered", "undiscovered"];
      this.mapFilters = { ...this.mapFilters, discovery: nextValue(values, this.mapFilters.discovery) };
    }

    if (zoneId === "map-filter-service") {
      const values: MapFilterState["service"][] = ["all", "shipyard", "equipment", "advancedEquipment", "missions", "survey", "salvage", "restrictedContracts"];
      this.mapFilters = { ...this.mapFilters, service: nextValue(values, this.mapFilters.service) };
    }

    this.audio.play("ui");
  }

  private applyTradeResult(ok: boolean, player: PlayerState, reason?: string): void {
    this.player = player;
    this.message = ok ? "Transaction complete" : reason ?? "Transaction failed";
    this.audio.play(ok ? "tradeOk" : "tradeFail");
    this.persist();
  }

  private handleDockCommand(): void {
    this.audio.unlock();
    if (this.player.docked) {
      this.player = { ...this.player, docked: false, velocity: vec3(), speed: 0 };
      this.mode = "flight";
      this.message = "Launch clearance granted";
      this.audio.play("dock");
      this.persist();
      return;
    }

    const stationDistance = distance(this.player.position, STATION_POSITION);
    if (stationDistance > DOCKING_RANGE) {
      this.message = `Station approach required: ${stationDistance.toFixed(0)} units out`;
      this.audio.play("tradeFail");
      return;
    }

    this.mode = "docking";
    this.dockingProgress = 0;
    this.projectiles = [];
    this.message = "Auto-dock corridor engaged";
  }

  private updateDocking(dt: number): void {
    this.dockingProgress = clamp(this.dockingProgress + dt / DOCKING_DURATION, 0, 1);
    this.player = {
      ...this.player,
      position: {
        x: lerp(this.player.position.x, STATION_POSITION.x, dt * 2.2),
        y: lerp(this.player.position.y, STATION_POSITION.y, dt * 2.2),
        z: lerp(this.player.position.z, STATION_POSITION.z - 8, dt * 2.2)
      },
      velocity: vec3(),
      speed: 0
    };

    if (this.dockingProgress >= 1) {
      this.player = { ...this.player, docked: true };
      this.mode = "docked";
      this.refreshMissions();
      this.message = "Docking complete";
      this.audio.play("dock");
      this.persist();
    }
  }

  private jumpToSelectedSystem(): void {
    const current = this.systems[this.player.currentSystemId];
    const selected = this.systems[this.selectedSystemId];
    if (selected.id === current.id) {
      this.message = "Already in this system";
      return;
    }

    if (!canJump(current, selected, this.player.fuel, this.player)) {
      this.message = "Jump blocked: range or fuel insufficient";
      this.audio.play("tradeFail");
      return;
    }

    const fuelRequired = getFuelRequired(current, selected, this.player);
    this.economy = applyEconomyDrift(this.economy, this.systems, GAME_SEED);
    this.player = {
      ...this.player,
      currentSystemId: selected.id,
      discoveredSystemIds: discoverSystem(this.player.discoveredSystemIds, selected.id),
      fuel: Number((this.player.fuel - fuelRequired).toFixed(1)),
      docked: false,
      position: vec3(),
      velocity: vec3(),
      speed: 0
    };

    this.runStats = recordJump(this.runStats, selected.id);
    this.completeArrivalMission(selected.id);

    if (this.player.activeMission) {
      const deadlineResult = decrementMissionDeadline(this.player);
      this.player = deadlineResult.player;
      if (deadlineResult.failed) {
        this.runStats = recordMissionFailed(this.runStats);
        this.message = "Mission failed: deadline passed";
        this.audio.play("missionFailed");
      }
    }

    this.refreshMarket(true);
    this.refreshMissions();
    this.enemy = createEnemyShip(`contact-${selected.id}`, vec3(0, 0, 85), selected.id);
    this.enemyCooldown = this.enemy.fireCooldown;
    this.projectiles = [];
    this.mode = "flight";
    if (!this.message.startsWith("Mission")) {
      this.message = `Arrived at ${selected.name}`;
    }
    this.audio.play("jump");
    this.persist();
  }

  private completeArrivalMission(systemId: number): void {
    const active = this.player.activeMission;
    if (!active || active.destinationSystemId !== systemId) return;

    this.runStats = addBalEarned(this.runStats, active.reward);
    this.runStats = recordMissionCompleted(this.runStats);
    this.player = completeMission(this.player, active);
    this.message = `Mission complete: ${active.title}`;
    this.audio.play("missionComplete");
  }

  private handleClick(): void {
    const click = this.input.consumeClick();
    if (!click) return;

    this.audio.unlock();
    const zone = this.renderer
      .getButtons()
      .find((button) => click.x >= button.x && click.x <= button.x + button.width && click.y >= button.y && click.y <= button.y + button.height);

    if (!zone) return;

    if (zone.id === "hint-dismiss") {
      const activeHint = this.getActiveHint();
      if (activeHint !== null) {
        this.meta = dismissHint(this.meta, activeHint);
        this.persist();
      }
      return;
    }

    if (zone.id === "death-restart") {
      this.newGame();
      return;
    }

    if (zone.id === "death-menu") {
      this.mode = "start";
      return;
    }

    if (zone.id.startsWith("map-system-")) {
      const systemId = parseInt(zone.id.slice("map-system-".length), 10);
      const current = this.systems[this.player.currentSystemId];
      const target = this.systems[systemId];
      if (!target) return;

      this.selectedSystemId = systemId;
      this.audio.play("ui");

      if (target.id === current.id) {
        this.message = "Already in this system";
      } else if (!canJump(current, target, this.player.fuel, this.player)) {
        const withinRange = getJumpDistance(current, target) <= getPlayerShipStats(this.player).maxJumpRange;
        this.message = withinRange ? "Insufficient fuel — buy fuel first" : "Out of jump range";
      } else {
        this.message = `${target.name} selected — press Enter or JUMP to travel`;
      }
      return;
    }

    if (zone.id === "map-jump") {
      this.jumpToSelectedSystem();
      return;
    }

    if (zone.id.startsWith("map-filter-")) {
      this.cycleMapFilter(zone.id);
      return;
    }

    if (zone.id === "trade-fuel") {
      const result = buyFuel(this.player, 0.5);
      this.applyTradeResult(result.ok, result.player, result.reason);
      return;
    }

    if (zone.id.startsWith("trade-row-")) {
      const index = parseInt(zone.id.slice("trade-row-".length), 10);
      const item = this.market[index];
      if (item) {
        const isBulk = click.ctrlKey || click.altKey;
        if (isBulk && click.shiftKey) {
          this.doBulkSell(item);
        } else if (isBulk) {
          this.doBulkBuy(item);
        } else {
          const prevBalance = this.player.balance;
          const result = click.shiftKey ? sellCommodity(this.player, item, 1) : buyCommodity(this.player, item, 1);
          if (result.ok) {
            if (click.shiftKey) {
              const revenue = result.player.balance - prevBalance;
              if (revenue > 0) this.runStats = addBalEarned(this.runStats, revenue);
            }
            const delta = click.shiftKey ? 1 : -1;
            this.economy = applyTradeToEconomy(this.economy, this.player.currentSystemId, item.id, delta);
            this.player = {
              ...result.player,
              legalRisk: getTradeLegalRisk(result.player.legalRisk, item.id, click.shiftKey ? "sellCommodity" : "buyCommodity")
            };
            this.refreshMarket(true);
            this.applyTradeResult(true, this.player);
          } else {
            this.applyTradeResult(false, result.player, result.reason);
          }
        }
      }
      return;
    }

    if (zone.id.startsWith("equip-row-")) {
      const index = parseInt(zone.id.slice("equip-row-".length), 10);
      const equipId = this.getVisibleEquipmentKeys()[index];
      if (equipId) {
        const result = buyEquipment(this.player, equipId, getStationProfile(this.systems[this.player.currentSystemId]));
        this.applyTradeResult(result.ok, result.player, result.reason);
      }
      return;
    }

    if (zone.id === "equip-page-prev") {
      this.equipmentPage = Math.max(0, this.equipmentPage - 1);
      this.audio.play("ui");
      return;
    }

    if (zone.id === "equip-page-next") {
      this.equipmentPage = Math.min(this.getEquipmentPageCount() - 1, this.equipmentPage + 1);
      this.audio.play("ui");
      return;
    }

    if (zone.id === "equip-repair") {
      const result = repairHull(this.player, getStationProfile(this.systems[this.player.currentSystemId]).repairCostModifier);
      this.applyTradeResult(result.ok, result.player, result.reason ?? "Hull repair failed");
      return;
    }

    if (zone.id.startsWith("ship-row-")) {
      const index = parseInt(zone.id.slice("ship-row-".length), 10);
      const ship = PLAYER_SHIPS[index];
      if (ship) {
        this.selectedShipId = ship.id;
        this.audio.play("ui");
      }
      return;
    }

    if (zone.id === "ship-buy") {
      this.purchaseSelectedShip();
      return;
    }

    if (zone.id.startsWith("mission-row-")) {
      const index = parseInt(zone.id.slice("mission-row-".length), 10);
      const mission = this.missions[index];
      if (mission) {
        if (this.player.activeMission) {
          this.message = "Complete the active mission before accepting another";
          this.audio.play("tradeFail");
        } else {
          const result = acceptMission(this.player, mission);
          if (!result.ok) {
            this.message = result.reason ?? "Cannot accept mission";
            this.audio.play("tradeFail");
          } else {
            this.player = result.player;
            this.message = `Accepted: ${mission.title}`;
            this.audio.play("missionAccepted");
            this.persist();
          }
        }
      }
      return;
    }

    this.audio.play("ui");
    if (zone.id === "new") this.newGame();
    if (zone.id === "continue") this.continueGame();
    if (zone.id === "controls") this.mode = "controls";
    if (zone.id === "back") this.mode = "start";
    if (zone.id === "touch-fire") this.firePlayerLaser();
    if (zone.id === "touch-map") this.mode = "map";
    if (zone.id === "touch-dock") this.handleDockCommand();
    if (zone.id === "touch-trade" && this.player.docked) this.openStationMode("trade");
    if (zone.id === "touch-equipment" && this.player.docked) this.openStationMode("equipment");
    if (zone.id === "touch-shipyard" && this.player.docked) this.openStationMode("shipyard");
    if (zone.id === "touch-missions" && this.player.docked) this.openStationMode("missions");
    if (zone.id === "touch-menu") {
      this.previousMode = this.mode;
      this.mode = "paused";
    }
    if (zone.id === "pause-resume") {
      this.mode = this.previousMode;
    }
    if (zone.id === "pause-settings") {
      this.mode = "settings";
    }
    if (zone.id === "pause-menu") {
      this.mode = "start";
    }
    if (zone.id === "settings-back") {
      this.mode = "paused";
      this.persist();
    }
    if (zone.id === "settings-mute") {
      this.audio.setMuted(!this.audio.isMuted());
      this.persist();
    }
    if (zone.id === "settings-glow") {
      this.phosphorGlow = !this.phosphorGlow;
      this.persist();
    }
    if (zone.id === "settings-sfx-up") {
      this.audio.setSfxVolume(this.audio.getSfxVolume() + 0.1);
      this.persist();
    }
    if (zone.id === "settings-sfx-down") {
      this.audio.setSfxVolume(this.audio.getSfxVolume() - 0.1);
      this.persist();
    }
    if (zone.id === "settings-music-up") {
      this.audio.setMusicVolume(this.audio.getMusicVolume() + 0.1);
      this.persist();
    }
    if (zone.id === "settings-music-down") {
      this.audio.setMusicVolume(this.audio.getMusicVolume() - 0.1);
      this.persist();
    }
    if (zone.id === "touch-up") this.player.orientation.pitch -= 0.08;
    if (zone.id === "touch-down") this.player.orientation.pitch += 0.08;
    if (zone.id === "touch-left") this.player.orientation.yaw -= 0.08;
    if (zone.id === "touch-right") this.player.orientation.yaw += 0.08;
    if (zone.id === "touch-throttle-up") this.player.velocity.z += 1.2;
    if (zone.id === "touch-throttle-down") this.player.velocity.z -= 1.2;
  }

  private newGame(): void {
    this.systems = generateUniverse(GAME_SEED);
    this.economy = createEconomyState(this.systems);
    this.player = createInitialPlayer();
    this.market = generateDynamicMarket(this.systems[this.player.currentSystemId], this.economy);
    this.economy = recordPriceHistory(this.economy, this.player.currentSystemId, this.market);
    this.refreshMissions();
    this.enemy = createEnemyShip();
    this.enemyCooldown = this.enemy.fireCooldown;
    this.projectiles = [];
    this.resetTransientState();
    this.selectedSystemId = 1;
    this.selectedShipId = PLAYER_SHIPS[1].id;
    this.equipmentPage = 0;
    this.mapFilters = { ...DEFAULT_MAP_FILTERS };
    this.mapSearchInput.value = "";
    this.runStats = createRunStats(this.player.currentSystemId);
    this.isNewPersonalBest = false;
    this.mode = "flight";
    this.message = "Launch complete";
    this.persist();
  }

  private continueGame(): void {
    const save = loadGame();
    if (!save) {
      this.message = "No valid save found";
      return;
    }

    this.systems = generateUniverse(save.seed);
    this.economy = save.economy ?? createEconomyState(this.systems);
    this.player = save.player;
    this.meta = save.meta ?? { hasSeenOnboarding: false, dismissedHints: [] };

    if (save.settings) {
      this.audio.setMuted(save.settings.muted);
      this.audio.setSfxVolume(save.settings.sfxVolume);
      this.audio.setMusicVolume(save.settings.musicVolume);
    }

    this.refreshMarket(true);
    this.refreshMissions();
    this.enemy = createEnemyShip(`contact-${this.player.currentSystemId}`, vec3(0, 0, 85), this.player.currentSystemId);
    this.enemyCooldown = this.enemy.fireCooldown;
    this.projectiles = [];
    this.resetTransientState();
    this.selectedSystemId = (this.player.currentSystemId + 1) % this.systems.length;
    this.selectedShipId = this.player.shipId === STARTER_SHIP_ID ? PLAYER_SHIPS[1].id : this.player.shipId;
    this.equipmentPage = 0;
    this.mapFilters = { ...DEFAULT_MAP_FILTERS };
    this.mapSearchInput.value = "";
    this.runStats = save.runStats ?? createRunStats(this.player.currentSystemId);
    this.isNewPersonalBest = false;
    this.mode = this.player.docked ? "docked" : "flight";
    this.message = "Save restored";
  }

  private refreshMarket(recordHistory: boolean): void {
    const current = this.systems[this.player.currentSystemId];
    this.market = generateDynamicMarket(current, this.economy, getStationProfile(current).marketScale);
    if (recordHistory) {
      this.economy = recordPriceHistory(this.economy, this.player.currentSystemId, this.market);
    }
  }

  private refreshMissions(): void {
    this.missions = generateMissions(
      GAME_SEED + this.economy.day,
      this.systems[this.player.currentSystemId],
      this.systems,
      this.player,
      getStationProfile(this.systems[this.player.currentSystemId])
    );
  }

  private persist(): void {
    const data: SaveData = {
      version: 1,
      savedAt: Date.now(),
      seed: GAME_SEED,
      player: this.player,
      economy: this.economy,
      meta: this.meta,
      settings: {
        muted: this.audio.isMuted(),
        sfxVolume: this.audio.getSfxVolume(),
        musicVolume: this.audio.getMusicVolume()
      },
      runStats: this.runStats
    };
    saveGame(data);
  }

  private createMapSearchInput(): HTMLInputElement {
    const input = document.createElement("input");
    input.type = "search";
    input.placeholder = "Search systems";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.className = "map-search-input";
    input.hidden = true;
    input.addEventListener("input", () => {
      this.mapFilters = { ...this.mapFilters, query: input.value };
    });
    document.body.appendChild(input);
    return input;
  }

  private syncMapSearchInput(): void {
    const visible = this.mode === "map";
    this.mapSearchInput.hidden = !visible;
    if (visible) {
      this.mapSearchInput.value = this.mapFilters.query;
    } else if (document.activeElement === this.mapSearchInput) {
      this.mapSearchInput.blur();
    }
  }

  private resetTransientState(): void {
    const state = createInitialTransientState();
    this.respawnCountdown = state.respawnCountdown;
    this.explosionEffect = state.explosionEffect;
    this.playerHitFlash = state.playerHitFlash;
    this.dockingProgress = state.dockingProgress;
  }

  private updateAmbient(): void {
    let target: AmbientMode = "none";
    if (
      this.mode === "docked" ||
      this.mode === "docking" ||
      this.mode === "trade" ||
      this.mode === "equipment" ||
      this.mode === "shipyard" ||
      this.mode === "missions"
    ) {
      target = "docked";
    } else if (this.mode === "flight") {
      target = this.enemy.alive ? "combat" : "flight";
    }

    if (target !== this.lastAmbientMode) {
      this.lastAmbientMode = target;
      this.audio.setAmbient(target);
    }
  }

  private getActiveHint(): HintId | null {
    const hint = HINT_MODES[this.mode];
    if (!hint) return null;
    return shouldShowHint(this.meta, hint) ? hint : null;
  }

  private render(): void {
    const priceHistory = this.economy.priceHistory;
    const systemId = this.player.currentSystemId;
    const previousPrices = Object.fromEntries(
      this.market.map((item) => [item.id, getLastKnownPrice({ ...this.economy, priceHistory }, systemId, item.id)])
    );
    const pilotRank: RankInfo = getPilotRank({
      totalBalEarned: this.runStats.totalBalEarned,
      missionsCompleted: this.runStats.missionsCompleted,
      enemiesDestroyed: this.runStats.enemiesDestroyed,
    });

    this.renderer.render({
      mode: this.mode,
      player: this.player,
      systems: this.systems,
      selectedSystemId: this.selectedSystemId,
      market: this.market,
      enemy: this.enemy,
      projectiles: this.projectiles,
      hasSave: hasSave(),
      message: this.message,
      stationPosition: STATION_POSITION,
      dockingProgress: this.dockingProgress,
      phosphorGlow: this.phosphorGlow,
      audioMuted: this.audio.isMuted(),
      missions: this.missions,
      economy: this.economy,
      mousePosition: this.input.getMousePosition(),
      playerHitFlash: this.playerHitFlash,
      explosionEffect: this.explosionEffect,
      previousPrices,
      runStats: this.runStats,
      meta: this.meta,
      pilotRank,
      isNewPersonalBest: this.isNewPersonalBest,
      activeHint: this.getActiveHint(),
      mapFilters: this.mapFilters,
      sfxVolume: this.audio.getSfxVolume(),
      musicVolume: this.audio.getMusicVolume(),
      selectedShipId: this.selectedShipId,
      equipmentPage: this.equipmentPage,
    });
    this.syncMapSearchInput();
  }
}

function createInitialPlayer(): PlayerState {
  return {
    position: vec3(),
    velocity: vec3(),
    orientation: { pitch: 0, yaw: 0, roll: 0 },
    speed: 0,
    shipId: STARTER_SHIP_ID,
    hull: 100,
    maxHull: 100,
    shield: 100,
    maxShield: 100,
    energy: 100,
    balance: 1000,
    fuel: 7.5,
    cargo: {},
    cargoCapacity: 20,
    currentSystemId: 0,
    discoveredSystemIds: [0],
    docked: false,
    legalRisk: 0,
    reputation: 0,
    equipment: { ...DEFAULT_EQUIPMENT },
    missionCargoUnits: 0
  };
}

function getTradeLegalRisk(current: number, commodityId: string, action: "buyCommodity" | "sellCommodity"): number {
  if (action === "sellCommodity") return Math.max(0, Number((current - 0.1).toFixed(1)));
  if (commodityId === "fuelCells" || commodityId === "luxuries") return Number((current + 0.2).toFixed(1));
  if (commodityId === "medicine") return Math.max(0, Number((current - 0.1).toFixed(1)));
  return current;
}

function discoverSystem(discoveredSystemIds: number[], systemId: number): number[] {
  return [...new Set([...discoveredSystemIds, systemId])].sort((a, b) => a - b);
}

function modeLabel(mode: "trade" | "equipment" | "shipyard" | "missions"): string {
  if (mode === "trade") return "Market";
  if (mode === "equipment") return "Equipment";
  if (mode === "shipyard") return "Shipyard";
  return "Mission board";
}

function nextValue<T>(values: T[], current: T): T {
  const index = values.findIndex((value) => value === current);
  return values[(index + 1 + values.length) % values.length];
}

function lerp(a: number, b: number, amount: number): number {
  return a + (b - a) * Math.min(1, amount);
}
