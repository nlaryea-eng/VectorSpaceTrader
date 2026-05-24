import type { RunStats } from "./RunStats";

export type GameMode =
  | "start"
  | "controls"
  | "flight"
  | "docking"
  | "paused"
  | "map"
  | "docked"
  | "trade"
  | "equipment"
  | "shipyard"
  | "missions"
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

export interface MarketItem extends Commodity {
  price: number;
  quantity: number;
}

export type PlayerShipId =
  | "mirelle"
  | "vaskRelay"
  | "vannicHold"
  | "talemRange"
  | "brontWard"
  | "calderaSpan";

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

export type EquipmentId =
  | "pulseLaser"
  | "beamLaser"
  | "cargoExpansion"
  | "fuelScoop"
  | "shieldBooster"
  | "laneGlassScanner"
  | "arcSpoolDrive"
  | "foldedHoldGrid"
  | "fieldPatchDrones"
  | "quietShieldMatrix"
  | "thriftBurnRegulator"
  | "routeAbacus"
  | "salvageTongs";

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

export interface Mission {
  id: string;
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
  credits: number;
  fuel: number;
  cargo: CargoHold;
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
  totalCreditsEarned: number;
}

export interface Meta {
  hasSeenOnboarding: boolean;
  dismissedHints: string[];
  personalBest?: PersonalBest;
}

export interface Settings {
  muted: boolean;
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
