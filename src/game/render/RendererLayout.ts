import type { ButtonZone, GameMode } from "../types";

/**
 * Layout breakpoints. The renderer reflows on narrow screens (phone-sized)
 * so HUD, onboarding hints, and touch controls don't overlap.
 */
export const NARROW_BREAKPOINT = 720;
export const SHORT_BREAKPOINT = 640;
export const NARROW_TOUCH_AREA = 176;

export function getCompactTouchControlRects(width: number, height: number, docked: boolean): ButtonZone[] {
  const size = width <= 420 ? 36 : 40;
  const gap = width <= 420 ? 5 : 6;
  const side = width <= 420 ? 12 : 16;
  const bottomMargin = 8;
  const modeH = 28;
  const modeGap = 8;

  const ringHeight = size * 3 + gap * 2;
  const ringTop = Math.max(modeH + modeGap, height - bottomMargin - ringHeight);
  const modeY = Math.max(4, ringTop - modeGap - modeH);
  const modeBtnW = Math.min(60, (width - 16) / 4 - 4);
  const rowGap = 4;
  const modeRowW = modeBtnW * 4 + rowGap * 3;
  const modeStart = width / 2 - modeRowW / 2;
  const rightX = width - side - size * 2 - gap;

  const rects: ButtonZone[] = [
    { id: "touch-map", label: "MAP", x: modeStart, y: modeY, width: modeBtnW, height: modeH },
    { id: "touch-dock", label: docked ? "LAUNCH" : "DOCK", x: modeStart + (modeBtnW + rowGap), y: modeY, width: modeBtnW, height: modeH },
    { id: "touch-menu", label: "MENU", x: modeStart + (modeBtnW + rowGap) * 3, y: modeY, width: modeBtnW, height: modeH },
    { id: "touch-up", label: "↑", x: side + size + gap, y: ringTop, width: size, height: size },
    { id: "touch-left", label: "←", x: side, y: ringTop + size + gap, width: size, height: size },
    { id: "touch-right", label: "→", x: side + (size + gap) * 2, y: ringTop + size + gap, width: size, height: size },
    { id: "touch-down", label: "↓", x: side + size + gap, y: ringTop + (size + gap) * 2, width: size, height: size },
    { id: "touch-throttle-up", label: "W", x: rightX, y: ringTop, width: size, height: size },
    { id: "touch-throttle-down", label: "S", x: rightX, y: ringTop + (size + gap) * 2, width: size, height: size },
    { id: "touch-fire", label: "FIRE", x: rightX, y: ringTop + size + gap, width: size * 2 + gap, height: size },
  ];

  if (docked) {
    rects.splice(2, 0, {
      id: "touch-trade",
      label: "MARKET",
      x: modeStart + (modeBtnW + rowGap) * 2,
      y: modeY,
      width: modeBtnW,
      height: modeH
    });
  }

  return rects;
}

/**
 * Returns true for modes that display a full-screen or side-sheet panel.
 * When true: background HUD is suppressed, global shortcut strips are hidden,
 * and onboarding hints are not floated over panel content.
 */
export function isModalPanelMode(mode: GameMode): boolean {
  return (
    mode === "map" ||
    mode === "docked" ||
    mode === "trade" ||
    mode === "equipment" ||
    mode === "shipyard" ||
    mode === "missions" ||
    mode === "help" ||
    mode === "settings" ||
    mode === "paused" ||
    mode === "gameOver" ||
    mode === "docking"
  );
}

export function getOnboardingHintY(mode: GameMode, height: number, barHeight: number, narrow: boolean, hasStatusMessage: boolean): number {
  if (narrow) {
    if (mode === "docked" || mode === "shipyard") {
      return Math.max(150, height - 315);
    }
    if (mode === "trade" || mode === "equipment" || mode === "missions" || mode === "map") {
      return Math.max(150, height - 214);
    }
    const statusGap = hasStatusMessage ? 42 : 12;
    return Math.max(96, height - NARROW_TOUCH_AREA - barHeight - statusGap);
  }

  if (mode === "docked" || mode === "shipyard") return height * 0.48;
  if (mode === "trade" || mode === "equipment" || mode === "missions") return 44;
  if (mode === "map") return height - barHeight - 48;
  return height - barHeight - 100;
}

export function getTutorialBannerRect(
  mode: GameMode,
  width: number,
  height: number,
  narrow: boolean,
  messageRows: number,
): ButtonZone {
  const bannerH = narrow ? 44 : 42;
  const bannerW = Math.min(width - 32, narrow ? width - 32 : 560);
  const rows = Math.min(5, Math.max(0, messageRows));
  const logH = rows > 0 ? rows * 18 + 10 : 0;
  const logY = narrow ? height - NARROW_TOUCH_AREA - logH - 6 : height - logH - 38;
  const y = isModalPanelMode(mode)
    ? (narrow ? 88 : 86)
    : rows > 0
      ? logY - bannerH - 10
      : narrow
        ? height - NARROW_TOUCH_AREA - bannerH - 44
        : height - bannerH - 96;

  return { id: "tutorial-banner", label: "First flight hint", x: width / 2 - bannerW / 2, y, width: bannerW, height: bannerH };
}
