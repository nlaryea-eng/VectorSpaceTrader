import { SIGNAL_GLASS_THEME, THEME } from "../Theme";
import type { RenderContext } from "./RenderContext";

export interface TextDrawOptions {
  align?: CanvasTextAlign;
  color?: string;
  size?: number;
  font?: string;
}

export type SignalPanelTier = "base" | "elevated" | "overlay";

export function isPointInRect(
  point: { x: number; y: number } | null,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (!point) return false;
  return point.x >= x && point.x <= x + width && point.y >= y && point.y <= y + height;
}

export function drawText(
  renderContext: RenderContext,
  text: string,
  x: number,
  y: number,
  options: TextDrawOptions = {}
): void {
  const { ctx } = renderContext;
  ctx.shadowBlur = 0;
  ctx.shadowColor = "transparent";
  ctx.fillStyle = options.color ?? THEME.colors.textPrimary;
  ctx.font = `${options.size ?? 16}px ${options.font ?? THEME.fonts.primary}`;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
}

export function setVectorStroke(renderContext: RenderContext, color: string, width: number, glow: boolean): void {
  const { ctx } = renderContext;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = glow ? 12 : 0;
  ctx.shadowColor = glow ? color : "transparent";
}

export function drawCenteredTitle(renderContext: RenderContext, text: string, y: number): void {
  drawText(renderContext, text, renderContext.width / 2, y, {
    align: "center",
    color: THEME.colors.textPrimary,
    size: 48,
    font: THEME.fonts.accent
  });

  setVectorStroke(renderContext, THEME.colors.accentPink, 2, true);
  const { ctx } = renderContext;
  ctx.beginPath();
  ctx.moveTo(renderContext.width / 2 - 160, y + 24);
  ctx.lineTo(renderContext.width / 2 + 160, y + 24);
  ctx.stroke();
}

export function drawButton(renderContext: RenderContext, id: string, label: string, x: number, y: number, width: number, height: number): void {
  const { ctx } = renderContext;
  renderContext.buttonZones.add({ id, label, x, y, width, height });

  if (renderContext.signalGlassUi) {
    const hovered = isPointInRect(renderContext.currentMousePosition, x, y, width, height);
    const lift = hovered && !renderContext.reducedMotion ? -1 : 0;
    ctx.shadowBlur = hovered && !renderContext.reducedMotion ? 8 : 0;
    ctx.shadowColor = hovered ? "rgba(108, 227, 214, 0.24)" : "transparent";
    ctx.fillStyle = hovered ? SIGNAL_GLASS_THEME.colors.surface3 : "rgba(14, 19, 32, 0.74)";
    ctx.beginPath();
    ctx.roundRect(x, y + lift, width, height, SIGNAL_GLASS_THEME.radius.control);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.strokeStyle = hovered ? SIGNAL_GLASS_THEME.colors.focus : "rgba(108, 227, 214, 0.62)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y + lift, width, height, SIGNAL_GLASS_THEME.radius.control);
    ctx.stroke();

    ctx.fillStyle = "rgba(108, 227, 214, 0.9)";
    ctx.fillRect(x + 8, y + lift + height - 3, Math.max(12, width - 16), hovered ? 2 : 1.5);

    drawText(renderContext, label, x + width / 2, y + lift + height / 2, {
      align: "center",
      color: SIGNAL_GLASS_THEME.colors.text,
      size: Math.min(13, Math.max(9, height * 0.32)),
      font: THEME.fonts.accent
    });
    return;
  }

  ctx.fillStyle = "rgba(255, 255, 255, 0.03)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.fill();

  setVectorStroke(renderContext, THEME.colors.accentTeal, 1.5, false);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.stroke();

  drawText(renderContext, label, x + width / 2, y + height / 2, {
    align: "center",
    color: THEME.colors.textPrimary,
    size: 14,
    font: THEME.fonts.accent
  });
}

export function drawPanel(renderContext: RenderContext, x: number, y: number, width: number, height: number): void {
  const { ctx } = renderContext;
  if (renderContext.signalGlassUi) {
    drawSignalPanel(renderContext, x, y, width, height, "elevated");
    return;
  }

  ctx.fillStyle = THEME.colors.bgGlass;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.fill();

  setVectorStroke(renderContext, THEME.colors.accentTeal, 1.5, true);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 8);
  ctx.stroke();
}

export function drawHudPanel(renderContext: RenderContext, x: number, y: number, width: number, height: number): void {
  const { ctx } = renderContext;
  if (renderContext.signalGlassUi) {
    drawSignalPanel(renderContext, x, y, width, height, "base");
    return;
  }

  ctx.fillStyle = "rgba(10, 14, 20, 0.4)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.fill();

  setVectorStroke(renderContext, "rgba(0, 242, 255, 0.3)", 1, false);
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, 4);
  ctx.stroke();
}

export function drawSignalPanel(renderContext: RenderContext, x: number, y: number, width: number, height: number, tier: SignalPanelTier): void {
  const { ctx } = renderContext;
  const colors = SIGNAL_GLASS_THEME.colors;
  ctx.shadowBlur = tier === "elevated" ? 10 : 0;
  ctx.shadowColor = "rgba(0, 0, 0, 0.24)";
  ctx.fillStyle = tier === "overlay" ? colors.surfaceOverlay : tier === "elevated" ? colors.surface2 : colors.surfaceGlass;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.panel);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = "rgba(230, 236, 245, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.panel);
  ctx.stroke();

  ctx.strokeStyle = "rgba(108, 227, 214, 0.28)";
  ctx.beginPath();
  ctx.moveTo(x + SIGNAL_GLASS_THEME.radius.panel, y + 1);
  ctx.lineTo(x + width - SIGNAL_GLASS_THEME.radius.panel, y + 1);
  ctx.stroke();
}

export function drawSignalChip(
  renderContext: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  color: string
): void {
  const { ctx } = renderContext;
  ctx.fillStyle = "rgba(14, 19, 32, 0.78)";
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, SIGNAL_GLASS_THEME.radius.chip);
  ctx.fill();
  ctx.strokeStyle = "rgba(230, 236, 245, 0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.fillRect(x + 8, y + height - 3, Math.max(20, width - 16), 1);

  const maxChars = Math.max(8, Math.floor(width / 8));
  const clipped = label.length > maxChars ? `${label.slice(0, maxChars - 1)}...` : label;
  drawText(renderContext, clipped.toUpperCase(), x + width / 2, y + height / 2, {
    align: "center",
    color,
    size: renderContext.narrow ? 9 : 10,
    font: THEME.fonts.mono
  });
}

export function drawChip(renderContext: RenderContext, x: number, y: number, label: string, tokenColor: string, rightAligned = false): number {
  const { ctx } = renderContext;
  const chipH = renderContext.narrow ? 16 : 18;
  const padX = 6;
  const fontSize = renderContext.narrow ? 9 : 10;
  ctx.font = `${fontSize}px ${THEME.fonts.mono}`;
  const textW = ctx.measureText(label).width;
  const chipW = Math.ceil(textW + padX * 2);
  const chipX = rightAligned ? x - chipW : x;
  const chipY = y - chipH / 2;

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = tokenColor;
  ctx.beginPath();
  ctx.roundRect(chipX, chipY, chipW, chipH, SIGNAL_GLASS_THEME.radius.chip);
  ctx.fill();
  ctx.restore();

  drawText(renderContext, label, chipX + padX, y, { color: tokenColor, size: fontSize, font: THEME.fonts.mono });
  return chipW;
}

/**
 * Greedy word-wrap so onboarding/help text doesn't clip on narrow screens.
 * Assumes the canvas font is already set on `ctx`.
 */
export function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [text];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [text];
}
