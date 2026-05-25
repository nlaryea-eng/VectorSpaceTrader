export type SignalGlassStatus = "success" | "warning" | "danger" | "info" | "neutral";

export const SIGNAL_GLASS_STORAGE_PREFIX = "vst.signalglass.v1" as const;

export const SIGNAL_GLASS_THEME = {
  name: "Signal Glass",
  colors: {
    background: "#05070C",
    surface1: "#0E1320",
    surface2: "#161E2E",
    surface3: "#1F2A3F",
    surfaceGlass: "rgba(14, 19, 32, 0.82)",
    surfaceOverlay: "rgba(14, 19, 32, 0.7)",
    accent: "#6CE3D6",
    accent2: "#F5C062",
    accentViolet: "#A88CFF",
    text: "#E6ECF5",
    textMuted: "#8A93A6",
    textDim: "#5F697D",
    grid: "#1E2638",
    focus: "#9FF0FF",
    disabled: "#3A4256",
    success: "#5BD66B",
    warning: "#F5A623",
    danger: "#FF5A5F",
    info: "#7AA7FF"
  },
  typography: {
    // Restored pre-Signal Glass game fonts: Space Grotesk (display), Inter (body), JetBrains Mono (telemetry).
    // System fallbacks ensure canvas rendering works before web fonts resolve.
    ui: "\"Inter\", system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, sans-serif",
    telemetry: "\"JetBrains Mono\", ui-monospace, \"SF Mono\", Menlo, Consolas, \"Liberation Mono\", monospace",
    display: "\"Space Grotesk\", \"Segoe UI\", system-ui, -apple-system, sans-serif",
    scale: {
      display: 28,
      h1: 22,
      h2: 18,
      body: 16,
      small: 14,
      caption: 13,
      telemetry: 15
    },
    lineHeight: {
      body: 1.4,
      telemetry: 1.2
    },
    weight: {
      regular: 400,
      medium: 500,
      semibold: 600
    },
    letterSpacing: {
      display: "0.04em",
      normal: "0"
    }
  },
  spacing: {
    px: 1,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48
  },
  radius: {
    chip: 4,
    control: 6,
    panel: 8,
    full: 999
  },
  stroke: {
    hairline: 1,
    icon: 1.5,
    route: 1.5,
    focus: 2,
    selected: 2
  },
  glow: {
    none: "none",
    focus: "0 0 0 3px rgba(159, 240, 255, 0.28)",
    accent: "0 0 10px rgba(108, 227, 214, 0.34)",
    amber: "0 0 10px rgba(245, 192, 98, 0.32)",
    danger: "0 0 10px rgba(255, 90, 95, 0.3)"
  },
  shadow: {
    panel: "0 10px 30px rgba(0, 0, 0, 0.24)",
    elevated: "0 18px 44px rgba(0, 0, 0, 0.32)",
    insetTop: "inset 0 1px 0 rgba(230, 236, 245, 0.08)"
  },
  status: {
    success: { color: "#5BD66B", glyph: "+", label: "Success" },
    warning: { color: "#F5A623", glyph: "!", label: "Warning" },
    danger: { color: "#FF5A5F", glyph: "x", label: "Danger" },
    info: { color: "#7AA7FF", glyph: "i", label: "Info" },
    neutral: { color: "#8A93A6", glyph: "-", label: "Neutral" }
  } satisfies Record<SignalGlassStatus, { color: string; glyph: string; label: string }>,
  focus: {
    ringColor: "#9FF0FF",
    ringWidth: 3,
    ringOffset: 1
  },
  zIndex: {
    canvas: 0,
    hud: 10,
    panel: 20,
    manual: 25,
    modal: 30,
    touchControls: 40,
    toast: 50
  }
};

export type SignalGlassTheme = typeof SIGNAL_GLASS_THEME;

export const SIGNAL_GLASS_TEXT_SIZES = {
  hudTelemetry: 10,
  marketRow: 11,
  equipmentRow: 10,
  missionRow: 10,
  pauseMicrocopy: 11,
  settingsMicrocopy: 10,
  mapDetail: 10
} as const;

export const SIGNAL_GLASS_CSS_VARS: Record<string, string> = {
  "--vst-bg": SIGNAL_GLASS_THEME.colors.background,
  "--vst-surface-1": SIGNAL_GLASS_THEME.colors.surface1,
  "--vst-surface-2": SIGNAL_GLASS_THEME.colors.surface2,
  "--vst-surface-3": SIGNAL_GLASS_THEME.colors.surface3,
  "--vst-surface-glass": SIGNAL_GLASS_THEME.colors.surfaceGlass,
  "--vst-surface-overlay": SIGNAL_GLASS_THEME.colors.surfaceOverlay,
  "--vst-accent": SIGNAL_GLASS_THEME.colors.accent,
  "--vst-accent-2": SIGNAL_GLASS_THEME.colors.accent2,
  "--vst-accent-violet": SIGNAL_GLASS_THEME.colors.accentViolet,
  "--vst-warning": SIGNAL_GLASS_THEME.colors.warning,
  "--vst-danger": SIGNAL_GLASS_THEME.colors.danger,
  "--vst-success": SIGNAL_GLASS_THEME.colors.success,
  "--vst-info": SIGNAL_GLASS_THEME.colors.info,
  "--vst-text": SIGNAL_GLASS_THEME.colors.text,
  "--vst-text-muted": SIGNAL_GLASS_THEME.colors.textMuted,
  "--vst-text-dim": SIGNAL_GLASS_THEME.colors.textDim,
  "--vst-grid": SIGNAL_GLASS_THEME.colors.grid,
  "--vst-focus": SIGNAL_GLASS_THEME.colors.focus,
  "--vst-disabled": SIGNAL_GLASS_THEME.colors.disabled,
  "--vst-font-ui": SIGNAL_GLASS_THEME.typography.ui,       // Inter → system-ui fallback
  "--vst-font-telemetry": SIGNAL_GLASS_THEME.typography.telemetry, // JetBrains Mono → ui-monospace fallback
  "--vst-font-display": SIGNAL_GLASS_THEME.typography.display,    // Space Grotesk → Segoe UI fallback
  "--vst-radius-chip": `${SIGNAL_GLASS_THEME.radius.chip}px`,
  "--vst-radius-control": `${SIGNAL_GLASS_THEME.radius.control}px`,
  "--vst-radius-panel": `${SIGNAL_GLASS_THEME.radius.panel}px`,
  "--vst-focus-width": `${SIGNAL_GLASS_THEME.focus.ringWidth}px`,
  "--vst-focus-offset": `${SIGNAL_GLASS_THEME.focus.ringOffset}px`
};

export const THEME = {
  colors: {
    bgDeep: "#020408",
    bgSurface: "#0a0e14",
    bgElevated: "#121820",
    bgGlass: "rgba(10, 14, 20, 0.7)",
    accentPink: "#ff007f",
    accentTeal: "#00f2ff",
    accentAmber: "#ffaa00",
    accentViolet: "#8a2be2",
    accentMagenta: "#ff00ff",
    textPrimary: "#f0f4f8",
    textSecondary: "#94a3b8",
    textDim: "#64748b",
    success: "#10b981",
    warning: "#f59e0b",
    danger: "#ef4444",
    info: "#3b82f6",
    grid: "#1E2638",
    focus: "#9FF0FF",
    disabled: "#3A4256"
  },
  fonts: {
    // Restored game font stacks — accent uses Space Grotesk (distinctive, uppercase-friendly);
    // primary uses Inter (clean body text); mono uses JetBrains Mono (telemetry numerics).
    primary: SIGNAL_GLASS_THEME.typography.ui,
    accent: SIGNAL_GLASS_THEME.typography.display,
    mono: SIGNAL_GLASS_THEME.typography.telemetry
  },
  glow: {
    pink: "rgba(245, 192, 98, 0.5)",
    teal: "rgba(108, 227, 214, 0.5)",
    amber: "rgba(245, 192, 98, 0.5)"
  }
};

export function getStatusToken(status: SignalGlassStatus): { color: string; glyph: string; label: string } {
  return SIGNAL_GLASS_THEME.status[status];
}
