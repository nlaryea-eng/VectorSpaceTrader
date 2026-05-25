import { SIGNAL_GLASS_THEME } from "./Theme";
import type { ButtonZone } from "./types";

export type ViewportKind = "mobilePortrait" | "mobileLandscape" | "tablet" | "desktop" | "ultrawide";

export interface ViewportSize {
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PanelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  fullScreen: boolean;
}

export type PanelMode = "fullSheet" | "sideSheet" | "panel";

export interface ResponsiveUiProfile {
  viewport: ViewportKind;
  panelMode: PanelMode;
  minTouchTarget: number;
  compactHud: boolean;
  mapFiltersAsSheet: boolean;
  fontScale: number;
}

export const BREAKPOINTS = {
  mobilePortraitMax: 480,
  mobileLandscapeMin: 481,
  mobileLandscapeMax: 767,
  mobileLandscapeMaxHeight: 500,
  tabletMin: 768,
  tabletMax: 1023,
  desktopMin: 1024,
  desktopMax: 1599,
  ultrawideMin: 1600,
  ultrawideAspect: 21 / 9
} as const;

export const UI_LAYERS = SIGNAL_GLASS_THEME.zIndex;

export function getViewportKind(size: ViewportSize): ViewportKind {
  if (size.width <= BREAKPOINTS.mobilePortraitMax) return "mobilePortrait";
  if (size.width <= BREAKPOINTS.mobileLandscapeMax && size.height <= BREAKPOINTS.mobileLandscapeMaxHeight) return "mobileLandscape";
  if (size.width >= BREAKPOINTS.ultrawideMin && size.width / Math.max(1, size.height) >= BREAKPOINTS.ultrawideAspect) return "ultrawide";
  if (size.width >= BREAKPOINTS.tabletMin && size.width <= BREAKPOINTS.tabletMax) return "tablet";
  return "desktop";
}

export function isCompactViewport(size: ViewportSize): boolean {
  const kind = getViewportKind(size);
  return kind === "mobilePortrait" || kind === "mobileLandscape";
}

export function space(step: keyof typeof SIGNAL_GLASS_THEME.spacing): number {
  return SIGNAL_GLASS_THEME.spacing[step];
}

export function clampSpacing(value: number, min = SIGNAL_GLASS_THEME.spacing.sm, max = SIGNAL_GLASS_THEME.spacing.xxl): number {
  return Math.max(min, Math.min(max, value));
}

export function getSafeAreaInsets(): Insets {
  if (typeof window === "undefined") {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const style = getComputedStyle(document.documentElement);
  return {
    top: readCssPx(style.getPropertyValue("--sat")),
    right: readCssPx(style.getPropertyValue("--sar")),
    bottom: readCssPx(style.getPropertyValue("--sab")),
    left: readCssPx(style.getPropertyValue("--sal"))
  };
}

export function getReservedTouchControlArea(size: ViewportSize): ButtonZone {
  const compact = isCompactViewport(size);
  const width = compact ? Math.min(228, size.width) : 280;
  const height = compact ? 190 : 150;
  const margin = compact ? 8 : 16;
  return {
    id: "touch-reserved-zone",
    label: "Touch reserved zone",
    x: Math.max(0, size.width - width - margin),
    y: Math.max(0, size.height - height - margin),
    width,
    height
  };
}

export function getPanelBounds(size: ViewportSize, preferredWidth = 640, preferredHeightRatio = 0.84): PanelBounds {
  const kind = getViewportKind(size);
  if (kind === "mobilePortrait") {
    return { x: 8, y: 8, width: size.width - 16, height: size.height - 16, fullScreen: true };
  }
  if (kind === "mobileLandscape") {
    const width = Math.min(size.width * 0.82, preferredWidth);
    return { x: size.width - width - 8, y: 8, width, height: size.height - 16, fullScreen: false };
  }

  const width = kind === "ultrawide" ? Math.min(preferredWidth, 720) : Math.min(preferredWidth, size.width * 0.9);
  const height = Math.min(size.height * preferredHeightRatio, size.height - 64);
  return {
    x: size.width - width - 32,
    y: (size.height - height) / 2,
    width,
    height,
    fullScreen: false
  };
}

export function getHudBounds(size: ViewportSize): { vitals: PanelBounds; status: PanelBounds; compact: boolean } {
  const compact = isCompactViewport(size);
  if (compact) {
    return {
      vitals: { x: 8, y: 8, width: size.width - 16, height: 64, fullScreen: false },
      status: { x: 8, y: 80, width: size.width - 16, height: 26, fullScreen: false },
      compact
    };
  }

  return {
    vitals: { x: 16, y: 16, width: 230, height: 234, fullScreen: false },
    status: { x: size.width - 246, y: 16, width: 230, height: 234, fullScreen: false },
    compact
  };
}

export function getResponsiveUiProfile(size: ViewportSize, fontScalePreference = 1): ResponsiveUiProfile {
  const viewport = getViewportKind(size);
  const compact = viewport === "mobilePortrait" || viewport === "mobileLandscape";
  const fontScale = Math.max(0.875, Math.min(1.25, fontScalePreference));
  return {
    viewport,
    panelMode: viewport === "mobilePortrait" ? "fullSheet" : viewport === "mobileLandscape" ? "sideSheet" : "panel",
    minTouchTarget: compact ? 44 : 32,
    compactHud: compact,
    mapFiltersAsSheet: compact,
    fontScale
  };
}

export function getMapFilterBounds(size: ViewportSize): PanelBounds {
  const profile = getResponsiveUiProfile(size);
  if (profile.mapFiltersAsSheet) {
    return { x: 8, y: 118, width: size.width - 16, height: 74, fullScreen: false };
  }
  return { x: 24, y: Math.max(120, size.height * 0.18), width: 96, height: Math.min(360, size.height - 180), fullScreen: false };
}

export function respectsReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function assertLayerOrder(layers: Record<string, number> = UI_LAYERS): boolean {
  return layers.canvas < layers.hud
    && layers.hud < layers.panel
    && layers.panel < layers.manual
    && layers.manual < layers.modal
    && layers.modal < layers.touchControls
    && layers.touchControls < layers.toast;
}

export function rectsOverlap(a: Pick<ButtonZone, "x" | "y" | "width" | "height">, b: Pick<ButtonZone, "x" | "y" | "width" | "height">): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

export interface SubRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelLayout {
  panelBounds: PanelBounds;
  headerBand: SubRect;
  subheaderRow: SubRect;
  contentBounds: SubRect;
  footerRow: SubRect;
  emptyStateArea: SubRect;
}

/**
 * Divides a modal panel into named structural sub-regions.
 *
 * headerBand    — title + close/back affordance
 * subheaderRow  — summary/status line (balance, cargo, etc.)
 * contentBounds — main scrollable/list area (≥55% of panel height)
 * footerRow     — action buttons and paging controls
 * emptyStateArea — centered within contentBounds for empty-state cards
 */
export function getPanelLayout(size: ViewportSize, preferredWidth = 640): PanelLayout {
  const panelBounds = getPanelBounds(size, preferredWidth);
  const compact = isCompactViewport(size);

  const headerH = compact ? 44 : 52;
  const subheaderH = compact ? 26 : 32;
  const footerH = compact ? 42 : 48;
  const innerGap = 4;

  const px = panelBounds.x;
  const py = panelBounds.y;
  const pw = panelBounds.width;
  const ph = panelBounds.height;

  const headerBand: SubRect = { x: px, y: py, width: pw, height: headerH };
  const subheaderRow: SubRect = { x: px, y: py + headerH, width: pw, height: subheaderH };
  const footerRow: SubRect = { x: px, y: py + ph - footerH, width: pw, height: footerH };

  const contentY = py + headerH + subheaderH + innerGap;
  const contentH = (py + ph - footerH - innerGap) - contentY;
  const contentBounds: SubRect = { x: px, y: contentY, width: pw, height: contentH };

  const emptyH = Math.min(148, contentH * 0.55);
  const emptyW = Math.min(pw - 32, 540);
  const emptyStateArea: SubRect = {
    x: px + (pw - emptyW) / 2,
    y: contentY + (contentH - emptyH) / 2,
    width: emptyW,
    height: emptyH
  };

  return { panelBounds, headerBand, subheaderRow, contentBounds, footerRow, emptyStateArea };
}

export interface StationHubZones {
  identity: SubRect;
  pilotSummary: SubRect;
  recommendation: SubRect;
  serviceActions: SubRect;
}

/**
 * Returns the four logical zones of the Station Hub screen.
 * Uses the same panelX/Y/W/H geometry as the renderer's renderDocked().
 */
export function getStationHubZones(size: ViewportSize): StationHubZones {
  const compact = isCompactViewport(size);
  const panelX = compact ? 8 : size.width * 0.2;
  const panelY = compact ? 12 : size.height * 0.1;
  const panelW = compact ? size.width - 16 : size.width * 0.6;
  const panelH = compact ? size.height - 24 : size.height * 0.68;

  // Service actions: bottom of the panel (matches renderDocked serviceY).
  const serviceY = compact ? panelY + panelH - 240 : size.height * 0.67;
  const serviceH = compact ? 240 : panelY + panelH - serviceY;
  const serviceActions: SubRect = { x: panelX, y: serviceY, width: panelW, height: serviceH };

  // Recommendation card: snapped just above service actions.
  const recH = compact ? 62 : 70;
  const maxGap = compact ? 16 : 24;
  const recY = serviceY - recH - maxGap;
  const recommendation: SubRect = { x: panelX, y: recY, width: panelW, height: recH };

  // Identity zone: top portion (title + subtitle). Approximate height.
  const identityH = compact ? 80 : 96;
  const identity: SubRect = { x: panelX, y: panelY, width: panelW, height: identityH };

  // Pilot summary: between identity and recommendation.
  const pilotSummaryY = panelY + identityH;
  const pilotSummaryH = recY - pilotSummaryY;
  const pilotSummary: SubRect = { x: panelX, y: pilotSummaryY, width: panelW, height: Math.max(0, pilotSummaryH) };

  return { identity, pilotSummary, recommendation, serviceActions };
}

function readCssPx(value: string): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
