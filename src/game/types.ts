import type { RunStats } from "./RunStats";

export type GameMode =
  | "start"
  | "controls"
  | "help"
  | "flight"
  | "docking"
  | "paused"
  | "map"
  | "docked"
  | "trade"
  | "equipment"
  | "shipyard"
  | "missions"
  | "settings"
  | "gameOver";

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Orientation {
  pitch: number;
  yaw: number;
  roll: number;
}

export type SystemClassId =
  | "cradle"
  | "forge"
  | "archive"
  | "garden"
  | "drift"
  | "relay"
  | "bastion"
  | "quarry"
  | "veil"
  | "harbor"
  | "clinic"
  | "observatory"
  | "freehold"
  | "crucible"
  | "reserve";

export interface SystemClassDefinition {
  id: SystemClassId;
  displayName: string;
  shortLabel: string;
  description: string;
  tradeBias: number;
  missionBias: number;
  serviceBias: number;
  hazardBias: number;
  discoveryNoteStyle: string;
  mapHint: string;
}

export interface WorldProfile {
  classId: SystemClassId;
  localDescriptor: string;
  tradeHint: string;
  serviceHint: string;
  missionHint: string;
  travelCaution: string;
  discoveryNote: string;
  knownFor?: string;
}

export interface StarSystem {
  id: number;
  name: string;
  x: number;
  y: number;
  economy: EconomyType;
  government: GovernmentType;
  techLevel: number;
  population: number;
  marketModifiers: Record<CommodityId, number>;
  description: string;
  culture: string;
  hazardTag: HazardTag;
  hazardLevel: number;
  opportunityTag: OpportunityTag;
  importHint: CommodityId;
  exportHint: CommodityId;
  stationHint: string;
  profile: WorldProfile;
}

export type EconomyType =
  | "Agricultural"
  | "Industrial"
  | "Research"
  | "Mining"
  | "Periphery"
  | "Trade Hub";

export type GovernmentType =
  | "Cooperative"
  | "Council"
  | "Syndicate"
  | "Corporate"
  | "Collective"
  | "Independent";

export type CommodityId =
  | "grain"
  | "minerals"
  | "computers"
  | "medicine"
  | "machinery"
  | "luxuries"
  | "fuelCells"
  | "alloys";

export interface Commodity {
  id: CommodityId;
  name: string;
  basePrice: number;
  baseQuantity: number;
  mass: number;
}

export type CargoHold = Partial<Record<CommodityId, number>>;
export type MarketSignal = "SURPLUS" | "STEADY" | "DEMAND" | "SHORTAGE";

export interface MarketItem extends Commodity {
  /** BUY/reference price retained for compatibility with older market callers. */
  price: number;
  buyPrice?: number;
  sellPrice?: number;
  marketSignal?: MarketSignal;
  quantity: number;
}

export type PlayerShipId =
  | "mirelle"
  | "vaskRelay" | "swiftVector" | "dashFrame"
  | "vannicHold" | "bulkTitan" | "cargoWhale"
  | "talemRange" | "voidSeeker" | "stellarScout"
  | "brontWard" | "ironBastion" | "fortressHull"
  | "calderaSpan" | "apexVoyager"
  | "voidTrekker" | "spoolMaster"
  | "surveyRig" | "salvageBarge";

export type ShipClassId =
  | "starter"
  | "courier"
  | "hauler"
  | "explorer"
  | "patrol"
  | "armored"
  | "longRange"
  | "balanced"
  | "specialist";

export type StationService =
  | "market"
  | "fuel"
  | "repair"
  | "missions"
  | "equipment"
  | "advancedEquipment"
  | "shipyard"
  | "survey"
  | "salvage"
  | "restrictedContracts";

export type HazardTag =
  | "calm"
  | "ionWeather"
  | "debris"
  | "patrolGap"
  | "signalNoise"
  | "raiderTrace";

export type OpportunityTag =
  | "steadyDemand"
  | "shortHaul"
  | "surveyData"
  | "repairQueue"
  | "contractFlow"
  | "salvageTrace";

export type EquipmentCategory =
  | "ship"
  | "cargo"
  | "hull"
  | "weapon"
  | "shield"
  | "fuel"
  | "range"
  | "efficiency"
  | "navigation"
  | "survey"
  | "salvage"
  | "defensive"
  | "repair"
  | "mission"
  | "utility";

export type EquipmentId =
  | "pulseLaser" | "beamLaser" | "ribbonLance" | "needleEmitter" | "burstRepeater"
  | "cargoExpansion" | "foldedHoldGrid" | "modularRack" | "densityCompressor" | "vaultSleeve"
  | "shieldBooster" | "quietShieldMatrix" | "staticFieldGen" | "pulseAbsorber" | "fluxCapacitor"
  | "fuelScoop" | "thriftBurnRegulator" | "reserveCell" | "flowOptimizer" | "ionFilter"
  | "laneGlassScanner" | "routeAbacus" | "arcSpoolDrive" | "pathVectorLogic" | "stellarCompass" | "driftStabilizer"
  | "fieldPatchDrones" | "salvageTongs" | "surveyMast" | "wreckProbe" | "dataSiphon" | "salvageLoom"
  | "reinforcedRibs" | "alloyPlating" | "impactBuffer" | "stressBraces" | "tensileWeb"
  | "engineTuning" | "gyroStabilizer" | "reactionThruster" | "inertialDampener" | "vectorNozzle"
  | "coolingFin" | "heatSink" | "powerRegulator" | "energyCycle" | "circuitBreaker"
  | "signalJammer" | "decoyLauncher" | "chaffDispenser" | "flareArray" | "stealthCoating"
  | "autoRepairBot" | "naniteGel" | "weldKit" | "sealantFoam" | "componentSpare"
  | "contractLog" | "priorityTransceiver" | "secureLockbox" | "diplomaticSeal" | "cargoScanner"
  | "tradeLedger" | "marketLink" | "pricePredictor" | "routePlotter" | "dockingComputer"
  | "hazardSensor" | "weatherRadar" | "debrisShield" | "patrolTracker" | "raiderAlarm"
  | "jumpBooster" | "rangeExtender" | "warpSpool" | "voidSails" | "gravityAnchor";

export type EquipmentState = Record<EquipmentId, boolean>;

export type MissionType =
  | "courier"
  | "fragile"
  | "urgent"
  | "medical"
  | "survey"
  | "passenger"
  | "salvage"
  | "supply"
  | "restricted"
  | "reputation";

import type { MissionId } from "./MissionIds";

export interface Mission {
  id: MissionId;
  type: MissionType;
  typeLabel: string;
  title: string;
  briefing: string;
  originSystemId: number;
  destinationSystemId: number;
  reward: number;
  reputationChange: number;
  legalRiskChange: number;
  failureReputationChange: number;
  failureLegalRiskChange: number;
  cargoUnitsRequired: number;
  cargoLabel: string;
  deadlineJumps: number;
  riskLabel: string;
  riskLevel: number;
  requiredEquipment?: EquipmentId;
  requiredCategory?: EquipmentCategory;
  minReputation?: number;
}

export interface PriceHistoryEntry {
  day: number;
  systemId: number;
  commodityId: CommodityId;
  price: number;
}

export interface EconomyState {
  day: number;
  drift: Record<number, Record<CommodityId, number>>;
  supplyAdjustments: Record<number, Partial<Record<CommodityId, number>>>;
  priceHistory: PriceHistoryEntry[];
}

export interface PlayerState {
  position: Vector3;
  velocity: Vector3;
  orientation: Orientation;
  speed: number;
  shipId: PlayerShipId;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  energy: number;
  balance: number;
  fuel: number;
  cargo: CargoHold;
  cargoCostBasis: Partial<Record<CommodityId, number>>;
  cargoCapacity: number;
  currentSystemId: number;
  discoveredSystemIds: number[];
  docked: boolean;
  legalRisk: number;
  reputation: number;
  equipment: EquipmentState;
  activeMissionId?: string;
  activeMission?: Mission;
  missionCargoUnits?: number;
}

export type EnemyBehavior = "direct" | "strafe" | "sniper" | "guard";

export interface Ship {
  id: string;
  classId: string;
  name: string;
  behavior: EnemyBehavior;
  position: Vector3;
  velocity: Vector3;
  orientation: Orientation;
  radius: number;
  hull: number;
  maxHull: number;
  shield: number;
  maxShield: number;
  damage: number;
  fireCooldown: number;
  turnSpeed: number;
  thrust: number;
  alive: boolean;
  wireframe: Vector3[];
  edges: Array<[number, number]>;
}

export interface Projectile {
  id: string;
  owner: "player" | "enemy";
  position: Vector3;
  velocity: Vector3;
  damage: number;
  ttl: number;
}

export interface PersonalBest {
  totalBalEarned: number;
}

export interface Meta {
  hasSeenOnboarding: boolean;
  dismissedHints: string[];
  personalBest?: PersonalBest;
}

export interface Settings {
  muted: boolean;
  sfxVolume: number;
  musicVolume: number;
}

export interface SaveData {
  version: 1;
  savedAt: number;
  seed: number;
  player: PlayerState;
  economy?: EconomyState;
  meta?: Meta;
  settings?: Settings;
  runStats?: RunStats;
}

export interface TradeResult {
  ok: boolean;
  reason?: string;
  player: PlayerState;
}

export interface ButtonZone {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
