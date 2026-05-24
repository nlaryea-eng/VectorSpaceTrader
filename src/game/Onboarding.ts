export type HintId = "flight" | "docking" | "trade" | "map" | "missions" | "shipyard";

export const ALL_HINTS: readonly HintId[] = ["flight", "docking", "trade", "map", "missions", "shipyard"] as const;

interface HasOnboarding {
  hasSeenOnboarding: boolean;
  dismissedHints: string[];
}

export function shouldShowHint(state: HasOnboarding, hint: HintId): boolean {
  return !state.hasSeenOnboarding && !state.dismissedHints.includes(hint);
}

export function dismissHint<T extends HasOnboarding>(state: T, hint: HintId): T {
  const dismissedHints = state.dismissedHints.includes(hint)
    ? state.dismissedHints
    : [...state.dismissedHints, hint];
  return normalizeOnboardingMeta({ ...state, dismissedHints });
}

export function dismissAllOnboarding<T extends HasOnboarding>(state: T): T {
  return {
    ...state,
    hasSeenOnboarding: true,
    dismissedHints: [...ALL_HINTS],
  };
}

export function normalizeOnboardingMeta<T extends HasOnboarding>(state: T): T {
  if (state.hasSeenOnboarding) return state;
  return ALL_HINTS.every((hint) => state.dismissedHints.includes(hint))
    ? { ...state, hasSeenOnboarding: true }
    : state;
}

export const HINT_TEXT: Readonly<Record<HintId, string>> = {
  flight:   "Fly with arrow keys or W/S. Press Space to fire. Approach the station and press D to dock.  [Enter to dismiss]",
  docking:  "Docked: T for market, E for gear, Y for shipyard, R for missions, D to launch again.  [Enter to dismiss]",
  trade:    "Click a commodity to buy. Shift+click to sell. Buy low in one system, sell high in another.  [Enter to dismiss]",
  map:      "Press M for the map. Search by name or cycle filters, then select a system and press Enter.  [Enter to dismiss]",
  missions: "Accept a contract and jump to the destination to complete it for a reward.  [Enter to dismiss]",
  shipyard: "Compare hulls at shipyard stations. Clear cargo overflow before buying a smaller ship.  [Enter to dismiss]",
};
