import { describe, expect, it } from "vitest";

import { SIGNAL_GLASS_CSS_VARS, SIGNAL_GLASS_THEME, getStatusToken } from "../src/game/Theme";

const requiredColorTokens = [
  "background",
  "surface1",
  "surface2",
  "surface3",
  "accent",
  "accent2",
  "text",
  "textMuted",
  "focus",
  "success",
  "warning",
  "danger"
] as const;

describe("Signal Glass theme tokens", () => {
  it("defines the required color tokens", () => {
    for (const token of requiredColorTokens) {
      expect(SIGNAL_GLASS_THEME.colors[token]).toMatch(/^#|^rgba/);
    }
  });

  it("binds core colors and typography to CSS custom properties", () => {
    expect(SIGNAL_GLASS_CSS_VARS["--vst-bg"]).toBe(SIGNAL_GLASS_THEME.colors.background);
    expect(SIGNAL_GLASS_CSS_VARS["--vst-accent"]).toBe(SIGNAL_GLASS_THEME.colors.accent);
    expect(SIGNAL_GLASS_CSS_VARS["--vst-focus"]).toBe(SIGNAL_GLASS_THEME.colors.focus);
    expect(SIGNAL_GLASS_CSS_VARS["--vst-font-ui"]).toContain("system-ui");
    expect(SIGNAL_GLASS_CSS_VARS["--vst-font-telemetry"]).toContain("ui-monospace");
  });

  it("keeps all status tokens text-and-glyph addressable", () => {
    for (const status of ["success", "warning", "danger", "info", "neutral"] as const) {
      const token = getStatusToken(status);
      expect(token.color).toMatch(/^#/);
      expect(token.glyph.length).toBeGreaterThan(0);
      expect(token.label.length).toBeGreaterThan(0);
    }
  });

  it("keeps the theme name project-original", () => {
    expect(SIGNAL_GLASS_THEME.name).toBe("Signal Glass");
  });
});
