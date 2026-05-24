import type { SoundEvent } from "./Audio";

export type UiFeedbackEvent =
  | "button"
  | "rowSelect"
  | "filterCycle"
  | "mapTarget"
  | "routeValid"
  | "routeBlocked"
  | "profitReveal"
  | "missionAccepted"
  | "equipmentInstall"
  | "shipPurchase"
  | "saveConfirmed"
  | "warning";

export function getUiSoundEvent(event: UiFeedbackEvent): SoundEvent {
  switch (event) {
    case "routeBlocked":
    case "warning":
      return "tradeFail";
    case "missionAccepted":
      return "missionAccepted";
    case "equipmentInstall":
    case "shipPurchase":
    case "saveConfirmed":
    case "profitReveal":
      return "tradeOk";
    case "filterCycle":
    case "mapTarget":
    case "routeValid":
    case "rowSelect":
    case "button":
    default:
      return "ui";
  }
}

export function getUiMotionDuration(event: UiFeedbackEvent, reducedMotion: boolean): number {
  if (reducedMotion) return 0;
  switch (event) {
    case "routeValid":
    case "routeBlocked":
      return 240;
    case "profitReveal":
      return 200;
    case "mapTarget":
    case "missionAccepted":
      return 180;
    case "button":
    case "rowSelect":
    case "filterCycle":
    default:
      return 120;
  }
}
