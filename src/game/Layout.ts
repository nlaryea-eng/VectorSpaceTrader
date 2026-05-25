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
  titleRow: SubRect;
  subtitleRow: SubRect;
  contextChipRow: SubRect;
  headerActionRow: SubRect;
  subheaderRow: SubRect;
  contentBounds: SubRect;
  footerRow: SubRect;
  footerStatusRow: SubRect;
  footerPrimaryActionRow: SubRect;
  footerSecondaryActionRow: SubRect;
  footerHintRow: SubRect;
  emptyStateArea: SubRect;
  showFooterHint: boolean;
}

export interface PanelChromeLayout {
  panelBounds: SubRect;
  headerBand: SubRect;
  titleRow: SubRect;
  subtitleRow: SubRect;
  contextChipRow: SubRect;
  headerActionRow: SubRect;
  contentBounds: SubRect;
  footerRow: SubRect;
  footerStatusRow: SubRect;
  footerPrimaryActionRow: SubRect;
  footerSecondaryActionRow: SubRect;
  footerHintRow: SubRect;
  emptyStateArea: SubRect;
  showFooterHint: boolean;
}

/**
 * Divides a modal panel into named structural sub-regions.
 *
 * headerBand    — title, subtitle/status, context chips, header actions
 * contentBounds — main scrollable/list area
 * footerRow     — status, primary/secondary actions, and optional hint
 * emptyStateArea — centered within contentBounds for empty-state cards
 */
export function getPanelLayout(size: ViewportSize, preferredWidth = 640): PanelLayout {
  const panelBounds = getPanelBounds(size, preferredWidth);
  const compact = isCompactViewport(size);
  const chrome = getPanelChromeLayout(panelBoundsToRect(panelBounds), compact);

  return {
    ...chrome,
    panelBounds,
    subheaderRow: chrome.subtitleRow
  };
}

export function getPanelChromeLayout(panelBounds: SubRect, compact: boolean): PanelChromeLayout {
  const margin = compact ? 12 : 16;
  const rowGap = compact ? 4 : 6;
  const headerH = compact ? 96 : 104;
  const footerH = compact ? 156 : 144;
  const px = panelBounds.x;
  const py = panelBounds.y;
  const pw = panelBounds.width;
  const ph = panelBounds.height;
  const innerX = px + margin;
  const innerW = Math.max(0, pw - margin * 2);
  const actionReserve = Math.min(compact ? 166 : 224, innerW * 0.42);
  const titleW = Math.max(0, innerW - actionReserve - rowGap);

  const headerBand: SubRect = { x: px, y: py, width: pw, height: Math.min(headerH, ph * 0.28) };
  const titleRow: SubRect = { x: innerX, y: py + (compact ? 12 : 14), width: titleW, height: compact ? 26 : 30 };
  const headerActionRow: SubRect = {
    x: innerX + innerW - actionReserve,
    y: titleRow.y,
    width: actionReserve,
    height: compact ? 30 : 32
  };
  const subtitleRow: SubRect = {
    x: innerX,
    y: titleRow.y + titleRow.height + rowGap,
    width: innerW,
    height: compact ? 18 : 20
  };
  const contextChipRow: SubRect = {
    x: innerX,
    y: subtitleRow.y + subtitleRow.height + rowGap,
    width: innerW,
    height: compact ? 18 : 20
  };

  const footerRow: SubRect = { x: px, y: py + ph - footerH, width: pw, height: footerH };
  const footerHintRow: SubRect = {
    x: innerX,
    y: py + ph - margin - 16,
    width: innerW,
    height: 16
  };
  const footerSecondaryActionRow: SubRect = {
    x: innerX,
    y: footerHintRow.y - (compact ? 36 : 38),
    width: innerW,
    height: compact ? 32 : 34
  };
  const footerPrimaryActionRow: SubRect = {
    x: innerX,
    y: footerSecondaryActionRow.y - (compact ? 40 : 42),
    width: innerW,
    height: compact ? 34 : 36
  };
  const footerStatusRow: SubRect = {
    x: innerX,
    y: footerRow.y + (compact ? 10 : 8),
    width: innerW,
    height: compact ? 22 : 22
  };

  const contentY = headerBand.y + headerBand.height + rowGap;
  const contentBottom = footerRow.y - rowGap;
  const contentH = Math.max(0, contentBottom - contentY);
  const contentBounds: SubRect = { x: innerX, y: contentY, width: innerW, height: contentH };

  const emptyH = Math.min(148, contentH * 0.55);
  const emptyW = Math.min(pw - 32, 540);
  const emptyStateArea: SubRect = {
    x: px + (pw - emptyW) / 2,
    y: contentY + (contentH - emptyH) / 2,
    width: emptyW,
    height: emptyH
  };

  return {
    panelBounds,
    headerBand,
    titleRow,
    subtitleRow,
    contextChipRow,
    headerActionRow,
    contentBounds,
    footerRow,
    footerStatusRow,
    footerPrimaryActionRow,
    footerSecondaryActionRow,
    footerHintRow,
    emptyStateArea,
    showFooterHint: footerHintRow.y >= footerSecondaryActionRow.y + footerSecondaryActionRow.height
  };
}

function panelBoundsToRect(bounds: PanelBounds): SubRect {
  return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height };
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

  const chrome = getPanelChromeLayout({ x: panelX, y: panelY, width: panelW, height: panelH }, compact);
  const serviceActions = chrome.footerRow;

  // Recommendation card: snapped just above service actions.
  const recH = compact ? 62 : 70;
  const maxGap = compact ? 16 : 24;
  const recY = serviceActions.y - recH - maxGap;
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
