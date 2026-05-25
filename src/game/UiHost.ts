import { UI_LAYERS, getHudBounds, getPanelBounds, getReservedTouchControlArea, rectsOverlap, type PanelBounds, type ViewportSize } from "./Layout";
import type { GameMode, StarSystem } from "./types";

export type UiLayerId = "canvas" | "hud" | "panel" | "manual" | "modal" | "touchControls" | "toast";

export interface UiLayer {
  id: UiLayerId;
  zIndex: number;
  interactive: boolean;
}

export interface HudShellLayout {
  vitals: PanelBounds;
  status: PanelBounds;
  /** Single compact capsule replacing the old separate systemChip + missionChip strips. */
  topCapsule: PanelBounds;
  threatChip: PanelBounds;
  touchReserved: PanelBounds;
  compact: boolean;
}

export interface ToastModel {
  text: string;
  tone: "info" | "success" | "warning" | "danger";
  bounds: PanelBounds;
}

export const UI_LAYER_ORDER: UiLayer[] = [
  { id: "canvas", zIndex: UI_LAYERS.canvas, interactive: true },
  { id: "hud", zIndex: UI_LAYERS.hud, interactive: false },
  { id: "panel", zIndex: UI_LAYERS.panel, interactive: true },
  { id: "manual", zIndex: UI_LAYERS.manual, interactive: true },
  { id: "modal", zIndex: UI_LAYERS.modal, interactive: true },
  { id: "touchControls", zIndex: UI_LAYERS.touchControls, interactive: true },
  { id: "toast", zIndex: UI_LAYERS.toast, interactive: false }
];

export function getTopInteractiveLayer(mode: GameMode, touchVisible: boolean): UiLayerId {
  if (mode === "settings" || mode === "paused" || mode === "gameOver") return "modal";
  if (mode === "help") return "manual";
  if (mode === "map" || mode === "docked" || mode === "trade" || mode === "equipment" || mode === "shipyard" || mode === "missions" || mode === "docking") {
    return "panel";
  }
  if (touchVisible) return "touchControls";
  return "canvas";
}

export function isLayerInteractive(layer: UiLayerId, mode: GameMode, touchVisible: boolean): boolean {
  return layer === getTopInteractiveLayer(mode, touchVisible);
}

export function createHudShellLayout(size: ViewportSize): HudShellLayout {
  const hud = getHudBounds(size);
  const touchArea = getReservedTouchControlArea(size);
  const touchReserved = { ...touchArea, fullScreen: false };

  if (hud.compact) {
    // Mobile: capsule sits below the compact vitals band (y=8,h=64+26=106).
    // Height ≤ 36px per requirement.
    return {
      vitals: hud.vitals,
      status: hud.status,
      topCapsule: { x: 12, y: 110, width: size.width - 24, height: 32, fullScreen: false },
      threatChip: { x: size.width - 108, y: 148, width: 96, height: 24, fullScreen: false },
      touchReserved,
      compact: true
    };
  }

  // Desktop: single capsule centered between vitals and status panels.
  // Vitals right edge ≈ 246; status left edge ≈ size.width - 246.
  // Height ≤ 48px per requirement.
  const capsuleW = Math.min(420, size.width * 0.34);
  const capsuleX = size.width / 2 - capsuleW / 2;
  return {
    vitals: hud.vitals,
    status: hud.status,
    topCapsule: { x: capsuleX, y: 16, width: capsuleW, height: 44, fullScreen: false },
    threatChip: { x: size.width - 246, y: 264, width: 230, height: 30, fullScreen: false },
    touchReserved,
    compact: false
  };
}

export function createPanelLayerBounds(size: ViewportSize, preferredWidth?: number): PanelBounds {
  return getPanelBounds(size, preferredWidth ?? 640);
}

export function hudOverlapsTouch(layout: HudShellLayout): boolean {
  return rectsOverlap(layout.vitals, layout.touchReserved)
    || rectsOverlap(layout.status, layout.touchReserved)
    || rectsOverlap(layout.topCapsule, layout.touchReserved);
}

export function createToastModel(message: string, size: ViewportSize): ToastModel | null {
  const text = message.trim();
  if (text.length === 0) return null;

  const width = Math.min(size.width - 32, 360);
  const height = 42;
  const compact = size.width <= 480;
  return {
    text,
    tone: inferToastTone(text),
    bounds: {
      x: compact ? 16 : size.width - width - 24,
      y: compact ? Math.max(112, size.height - 252) : 316,
      width,
      height,
      fullScreen: false
    }
  };
}

export function formatSystemChip(system: StarSystem): string {
  return `${system.name} / ${system.profile.classId.toUpperCase()}`;
}

function inferToastTone(message: string): ToastModel["tone"] {
  const normalized = message.toLowerCase();
  if (normalized.includes("complete") || normalized.includes("accepted") || normalized.includes("restored")) return "success";
  if (normalized.includes("blocked") || normalized.includes("failed") || normalized.includes("insufficient") || normalized.includes("unavailable")) return "danger";
  if (normalized.includes("required") || normalized.includes("warning")) return "warning";
  return "info";
}
