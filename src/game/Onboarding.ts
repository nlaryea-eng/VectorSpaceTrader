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
  flight:   "Fly with arrows or W/S. Space fires. Approach the station and press D to dock.  [Enter to dismiss]",
  docking:  "Docked: T market, E gear, Y ships, R missions, D launch.  [Enter to dismiss]",
  trade:    "Tap a row to buy. Shift+click sells. Press F to buy fuel here.  [Enter to dismiss]",
  map:      "A/D or arrows pick a system. Enter jumps. Esc closes the map.  [Enter to dismiss]",
  missions: "Accept a contract here, then jump to its destination to complete it.  [Enter to dismiss]",
  shipyard: "1-6 picks a hull. Enter buys. Clear cargo overflow first if needed.  [Enter to dismiss]",
};
