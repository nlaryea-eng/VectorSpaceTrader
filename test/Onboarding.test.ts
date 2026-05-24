import { describe, expect, it } from "vitest";
import {
  ALL_HINTS,
  dismissAllOnboarding,
  dismissHint,
  HINT_TEXT,
  normalizeOnboardingMeta,
  shouldShowHint,
} from "../src/game/Onboarding";

function freshState() {
  return { hasSeenOnboarding: false, dismissedHints: [] as string[] };
}

function seenState() {
  return { hasSeenOnboarding: true, dismissedHints: [] as string[] };
}

describe("shouldShowHint", () => {
  it("shows hints on first run", () => {
    const state = freshState();
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(state, hint)).toBe(true);
    }
  });

  it("does not show hints when hasSeenOnboarding is true", () => {
    const state = seenState();
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(state, hint)).toBe(false);
    }
  });

  it("does not show a hint that has been dismissed", () => {
    const state = { hasSeenOnboarding: false, dismissedHints: ["flight"] };
    expect(shouldShowHint(state, "flight")).toBe(false);
  });

  it("still shows other hints when one is dismissed", () => {
    const state = { hasSeenOnboarding: false, dismissedHints: ["flight"] };
    expect(shouldShowHint(state, "trade")).toBe(true);
    expect(shouldShowHint(state, "map")).toBe(true);
  });
});

describe("dismissHint", () => {
  it("adds the hint to dismissedHints", () => {
    const state = freshState();
    const updated = dismissHint(state, "flight");
    expect(updated.dismissedHints).toContain("flight");
  });

  it("prevents the dismissed hint from showing again", () => {
    const state = freshState();
    const updated = dismissHint(state, "trade");
    expect(shouldShowHint(updated, "trade")).toBe(false);
  });

  it("does not duplicate an already-dismissed hint", () => {
    const state = freshState();
    const once = dismissHint(state, "map");
    const twice = dismissHint(once, "map");
    expect(twice.dismissedHints.filter(h => h === "map")).toHaveLength(1);
  });

  it("preserves existing dismissed hints", () => {
    const state = { hasSeenOnboarding: false, dismissedHints: ["flight"] };
    const updated = dismissHint(state, "trade");
    expect(updated.dismissedHints).toContain("flight");
    expect(updated.dismissedHints).toContain("trade");
  });

  it("does not alter hasSeenOnboarding", () => {
    const state = freshState();
    const updated = dismissHint(state, "map");
    expect(updated.hasSeenOnboarding).toBe(false);
  });

  it("sets hasSeenOnboarding when the final hint is dismissed", () => {
    let state = freshState();
    for (const hint of ALL_HINTS) {
      state = dismissHint(state, hint);
    }
    expect(state.hasSeenOnboarding).toBe(true);
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(state, hint)).toBe(false);
    }
  });
});

describe("dismissAllOnboarding", () => {
  it("sets hasSeenOnboarding to true", () => {
    const updated = dismissAllOnboarding(freshState());
    expect(updated.hasSeenOnboarding).toBe(true);
  });

  it("causes all hints to stop showing", () => {
    const updated = dismissAllOnboarding(freshState());
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(updated, hint)).toBe(false);
    }
  });

  it("includes all hint IDs in dismissedHints", () => {
    const updated = dismissAllOnboarding(freshState());
    for (const hint of ALL_HINTS) {
      expect(updated.dismissedHints).toContain(hint);
    }
  });
});

describe("HINT_TEXT", () => {
  it("has text for every hint ID", () => {
    for (const hint of ALL_HINTS) {
      expect(HINT_TEXT[hint]).toBeTypeOf("string");
      expect(HINT_TEXT[hint].length).toBeGreaterThan(0);
    }
  });

  it("each hint mentions how to dismiss", () => {
    for (const hint of ALL_HINTS) {
      expect(HINT_TEXT[hint].toLowerCase()).toContain("dismiss");
    }
  });
});

describe("onboarding persistence semantics", () => {
  it("a dismissed state survives a JSON round-trip", () => {
    const state = dismissHint(freshState(), "flight");
    const serialized = JSON.stringify(state);
    const restored = JSON.parse(serialized) as typeof state;
    expect(shouldShowHint(restored, "flight")).toBe(false);
    expect(shouldShowHint(restored, "trade")).toBe(true);
  });

  it("fully dismissed state survives a JSON round-trip", () => {
    const state = dismissAllOnboarding(freshState());
    const restored = JSON.parse(JSON.stringify(state)) as typeof state;
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(restored, hint)).toBe(false);
    }
  });

  it("treats legacy all-dismissed state as complete", () => {
    const legacy = { hasSeenOnboarding: false, dismissedHints: [...ALL_HINTS] };
    const normalized = normalizeOnboardingMeta(legacy);
    expect(normalized.hasSeenOnboarding).toBe(true);
    for (const hint of ALL_HINTS) {
      expect(shouldShowHint(normalized, hint)).toBe(false);
    }
  });
});
