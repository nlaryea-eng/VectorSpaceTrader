import { getPanelChromeLayout, type PanelChromeLayout, type SubRect } from "../Layout";
import { SIGNAL_GLASS_THEME, THEME } from "../Theme";
import { drawButton, drawText } from "./CanvasPrimitives";
import type { RenderContext } from "./RenderContext";

export function createPanelChrome(renderContext: RenderContext, x: number, y: number, width: number, height: number): PanelChromeLayout {
  return getPanelChromeLayout({ x, y, width, height }, renderContext.narrow);
}

export function rowTextY(row: SubRect): number {
  return row.y + row.height / 2 + 4;
}

/**
 * @param titleAvailableWidth Optional override for the horizontal span used to center the title.
 *   Pass `chrome.titleRow.width - chrome.headerActionRow.width - 8` on compact viewports where
 *   the action row overlaps the right portion of the title row (e.g. docked screen on mobile).
 */
export function drawPanelHeader(
  renderContext: RenderContext,
  chrome: PanelChromeLayout,
  title: string,
  subtitle?: string,
  context?: string,
  titleAvailableWidth?: number
): void {
  const titleCenterX = titleAvailableWidth != null
    ? chrome.titleRow.x + titleAvailableWidth / 2
    : chrome.titleRow.x + chrome.titleRow.width / 2;
  drawText(renderContext, title, titleCenterX, rowTextY(chrome.titleRow), {
    align: "center",
    size: renderContext.narrow ? 18 : 24,
    color: THEME.colors.textPrimary,
    font: THEME.fonts.accent
  });
  if (subtitle) {
    drawText(renderContext, subtitle, chrome.subtitleRow.x + chrome.subtitleRow.width / 2, rowTextY(chrome.subtitleRow), {
      align: "center",
      color: THEME.colors.accentTeal,
      size: renderContext.narrow ? 10 : 12,
      font: THEME.fonts.mono
    });
  }
  if (context) {
    drawText(renderContext, context, chrome.contextChipRow.x + chrome.contextChipRow.width / 2, rowTextY(chrome.contextChipRow), {
      align: "center",
      color: SIGNAL_GLASS_THEME.colors.accent2,
      size: renderContext.narrow ? 9 : 10,
      font: THEME.fonts.mono
    });
  }
}

export function drawHeaderActions(renderContext: RenderContext, chrome: PanelChromeLayout, actions: Array<{ id: string; label: string; width?: number }>): void {
  const gap = renderContext.narrow ? 6 : 8;
  const h = Math.min(renderContext.narrow ? 28 : 30, chrome.headerActionRow.height);
  let x = chrome.headerActionRow.x + chrome.headerActionRow.width;
  for (let index = actions.length - 1; index >= 0; index -= 1) {
    const action = actions[index];
    const width = action.width ?? (renderContext.narrow ? 70 : 96);
    x -= width;
    drawButton(renderContext, action.id, action.label, x, chrome.headerActionRow.y + (chrome.headerActionRow.height - h) / 2, width, h);
    x -= gap;
  }
}

export function drawFooterHint(renderContext: RenderContext, chrome: PanelChromeLayout, hint: string): void {
  if (!chrome.showFooterHint) return;
  drawText(renderContext, hint, chrome.footerHintRow.x + chrome.footerHintRow.width / 2, rowTextY(chrome.footerHintRow), {
    align: "center",
    color: THEME.colors.textDim,
    size: renderContext.narrow ? 9 : 10,
    font: THEME.fonts.mono
  });
}

/**
 * Primary CTA button: accent-filled background at 18 % alpha plus 1.5 px cyan border.
 * Used for LAUNCH on the Station Hub so it reads as the dominant action.
 * Pushes a buttonZone so InputRouter can route clicks normally.
 */
export function drawPrimaryButton(renderContext: RenderContext, id: string, label: string, x: number, y: number, width: number, height: number): void {
  const { ctx } = renderContext;
  renderContext.buttonZones.add({ id, label, x, y, width, height });

  ctx.save();
  ctx.fillStyle = SIGNAL_GLASS_THEME.colors.accent;
  ctx.globalAlpha = 0.18;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.control);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = SIGNAL_GLASS_THEME.colors.accent;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.control);
  ctx.stroke();

  drawText(renderContext, label, x + width / 2, y + height / 2, {
    align: "center",
    color: SIGNAL_GLASS_THEME.colors.accent,
    size: Math.min(13, Math.max(9, height * 0.32)),
    font: THEME.fonts.accent
  });
}
