import type { HelpSectionId } from "../HelpContent";
import type { MapFilterState } from "../MapSearch";
import type { HintId } from "../Onboarding";
import type { RankInfo } from "../Rank";
import type { RunStats } from "../RunStats";
import type { MessageLog } from "../TransientState";
import type {
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
} from "../types";

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
  /** False when a fine pointer device is detected - suppresses on-screen touch overlay in flight. */
  showTouchControls: boolean;
  /** True when the compact map filter sheet is expanded (mobile only). */
  mapFilterSheetOpen: boolean;
}
