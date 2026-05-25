/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";

import { SIGNAL_GLASS_CSS_VARS, SIGNAL_GLASS_TEXT_SIZES, SIGNAL_GLASS_THEME, THEME, getStatusToken } from "../src/game/Theme";
import styles from "../src/styles.css?raw";

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

  // ── Typography regression lock ────────────────────────────────────────────
  // These tests lock the approved game font stacks so Signal Glass typography
  // regressions are caught immediately. Tabular numerals remain in CSS.

  it("uses Space Grotesk as the primary display/accent font", () => {
    expect(SIGNAL_GLASS_THEME.typography.display).toContain("Space Grotesk");
    expect(SIGNAL_GLASS_CSS_VARS["--vst-font-display"]).toContain("Space Grotesk");
    // THEME.fonts.accent must also reference Space Grotesk (used for all titles/buttons)
    expect(THEME.fonts.accent).toContain("Space Grotesk");
  });

  it("uses Inter as the UI body font", () => {
    expect(SIGNAL_GLASS_THEME.typography.ui).toContain("Inter");
    expect(SIGNAL_GLASS_CSS_VARS["--vst-font-ui"]).toContain("Inter");
    expect(THEME.fonts.primary).toContain("Inter");
  });

  it("uses JetBrains Mono as the telemetry font for BAL/prices/stats", () => {
    expect(SIGNAL_GLASS_THEME.typography.telemetry).toContain("JetBrains Mono");
    expect(SIGNAL_GLASS_CSS_VARS["--vst-font-telemetry"]).toContain("JetBrains Mono");
    expect(THEME.fonts.mono).toContain("JetBrains Mono");
  });

  it("preserves system-font fallbacks in every game font stack", () => {
    // Each stack must have a system fallback so canvas renders before web fonts load.
    expect(SIGNAL_GLASS_THEME.typography.ui).toMatch(/system-ui|sans-serif/);
    expect(SIGNAL_GLASS_THEME.typography.display).toMatch(/system-ui|sans-serif/);
    expect(SIGNAL_GLASS_THEME.typography.telemetry).toMatch(/monospace/);
  });

  it("display and ui font stacks are distinct (no sterile identical assignment)", () => {
    // Signal Glass regression: both display and ui were set to bare system-ui.
    // They must now differ so titles/buttons render with Space Grotesk character.
    expect(SIGNAL_GLASS_THEME.typography.display).not.toBe(SIGNAL_GLASS_THEME.typography.ui);
    expect(THEME.fonts.accent).not.toBe(THEME.fonts.primary);
  });

  // ── Minimum readable font-size lock ──────────────────────────────────────
  it("keeps minimum type sizes above readable thresholds on dense panels", () => {
    const scale = SIGNAL_GLASS_THEME.typography.scale;
    // Body text must be at least 14px (market/equipment rows are this size)
    expect(scale.small).toBeGreaterThanOrEqual(14);
    // Caption text must be at least 12px
    expect(scale.caption).toBeGreaterThanOrEqual(12);
    // Telemetry must be at least 13px so numbers are readable at 390px width
    expect(scale.telemetry).toBeGreaterThanOrEqual(13);
    // Display/title heading must be at least 18px
    expect(scale.h2).toBeGreaterThanOrEqual(18);
  });

  it("locks readable minimum sizes for screenshot-polished surfaces", () => {
    expect(SIGNAL_GLASS_TEXT_SIZES.hudTelemetry).toBeGreaterThanOrEqual(10);
    expect(SIGNAL_GLASS_TEXT_SIZES.marketRow).toBeGreaterThanOrEqual(11);
    expect(SIGNAL_GLASS_TEXT_SIZES.equipmentRow).toBeGreaterThanOrEqual(10);
    expect(SIGNAL_GLASS_TEXT_SIZES.missionRow).toBeGreaterThanOrEqual(10);
    expect(SIGNAL_GLASS_TEXT_SIZES.pauseMicrocopy).toBeGreaterThanOrEqual(11);
    expect(SIGNAL_GLASS_TEXT_SIZES.settingsMicrocopy).toBeGreaterThanOrEqual(10);
    expect(SIGNAL_GLASS_TEXT_SIZES.mapDetail).toBeGreaterThanOrEqual(10);
  });

  it("does not introduce remote font imports", () => {
    expect(styles).not.toMatch(/@import\s+url\(["']?https?:\/\/[^"')]+font/i);
    expect(styles).not.toMatch(/fonts\.(googleapis|gstatic)\.com/i);
    for (const stack of [SIGNAL_GLASS_THEME.typography.ui, SIGNAL_GLASS_THEME.typography.display, SIGNAL_GLASS_THEME.typography.telemetry]) {
      expect(stack).not.toMatch(/https?:\/\//i);
    }
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
