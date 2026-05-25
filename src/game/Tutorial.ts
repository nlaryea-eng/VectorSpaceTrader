import { distance, forwardVector, length, normalize, subtract } from "./Physics";
import type { Orientation, Vector3 } from "./types";

export const TUTORIAL_STAGES = [
  "beginFlight",
  "orientStation",
  "dock",
  "openMarket",
  "buyCommodity",
  "openMap",
  "jumpNearby",
  "sellCargo",
  "complete",
] as const;

export type TutorialStage = typeof TUTORIAL_STAGES[number];

export type TutorialEvent =
  | "beginFlight"
  | "stationOriented"
  | "flightProgress"
  | "docked"
  | "marketOpened"
  | "commodityBought"
  | "mapOpened"
  | "jumped"
  | "cargoSold";

export interface TutorialState {
  stage: TutorialStage;
}

export const INITIAL_TUTORIAL_STAGE: TutorialStage = "beginFlight";
export const COMPLETE_TUTORIAL_STAGE: TutorialStage = "complete";

const HINTS: Readonly<Record<Exclude<TutorialStage, "complete">, string>> = {
  beginFlight: "Begin your first flight.",
  orientStation: "Face the station marker, then approach.",
  dock: "Press D near the station to dock.",
  openMarket: "Open the Market with T.",
  buyCommodity: "Buy one low-cost commodity.",
  openMap: "Open the map with M.",
  jumpNearby: "Choose a nearby system and jump.",
  sellCargo: "Dock and sell your cargo.",
};

const NEXT_STAGE: Readonly<Record<Exclude<TutorialStage, "complete">, Partial<Record<TutorialEvent, TutorialStage>>>> = {
  beginFlight: { beginFlight: "orientStation" },
  orientStation: { stationOriented: "dock", flightProgress: "dock" },
  dock: { docked: "openMarket" },
  openMarket: { marketOpened: "buyCommodity" },
  buyCommodity: { commodityBought: "openMap" },
  openMap: { mapOpened: "jumpNearby" },
  jumpNearby: { jumped: "sellCargo" },
  sellCargo: { cargoSold: "complete" },
};

export function isTutorialStage(value: unknown): value is TutorialStage {
  return typeof value === "string" && TUTORIAL_STAGES.includes(value as TutorialStage);
}

export function isTutorialComplete(stage: TutorialStage): boolean {
  return stage === COMPLETE_TUTORIAL_STAGE;
}

export function advanceTutorial(state: TutorialState, event: TutorialEvent): TutorialState {
  if (state.stage === COMPLETE_TUTORIAL_STAGE) return state;
  const stage = state.stage as Exclude<TutorialStage, "complete">;
  const next = NEXT_STAGE[stage][event] ?? state.stage;
  return next === state.stage ? state : { stage: next };
}

export function getActiveTutorialHint(state: TutorialState): string | null {
  if (state.stage === COMPLETE_TUTORIAL_STAGE) return null;
  return HINTS[state.stage as Exclude<TutorialStage, "complete">];
}

export function getTutorialEventForFlightProgress(
  position: Vector3,
  orientation: Orientation,
  stationPosition: Vector3,
  origin: Vector3,
): TutorialEvent | null {
  const stationVector = subtract(stationPosition, position);
  const stationDistance = distance(position, stationPosition);
  const forward = forwardVector(orientation);
  const towardStation = normalize(stationVector);
  const facingScore = forward.x * towardStation.x + forward.y * towardStation.y + forward.z * towardStation.z;

  if (stationDistance < 86 || facingScore >= 0.72) return "stationOriented";
  return length(subtract(position, origin)) >= 24 ? "flightProgress" : null;
}
