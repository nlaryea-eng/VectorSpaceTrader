import { HINT_TEXT, type HintId } from "../../Onboarding";
import { THEME } from "../../Theme";
import { addButtonZone } from "../ButtonZones";
import { drawText, setVectorStroke, wrapText } from "../CanvasPrimitives";
import type { RenderContext } from "../RenderContext";
import { getOnboardingHintY } from "../RendererLayout";
import type { RenderState } from "../types";

export function renderOnboardingHint(rc: RenderContext, state: RenderState, hint: HintId): void {
  const { ctx } = rc;
  const hintText = HINT_TEXT[hint];
  const padding = 12;
  const fontSize = rc.narrow ? 11 : 13;
  const barW = Math.min(rc.width - 32, 600);

  ctx.font = `${fontSize}px ${THEME.fonts.accent}`;
  const lines = wrapText(ctx, hintText.toUpperCase(), barW - padding * 2);
  const lineHeight = fontSize + 6;
  const barH = lineHeight * lines.length + padding * 2;
  const barX = rc.width / 2 - barW / 2;

  const barY = getOnboardingHintY(state.mode, rc.height, barH, rc.narrow, state.messageLog.entries.length > 0);

  ctx.fillStyle = THEME.colors.bgGlass;
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 8);
  ctx.fill();

  setVectorStroke(rc, THEME.colors.accentTeal, 1.5, true);
  ctx.beginPath();
  ctx.roundRect(barX, barY, barW, barH, 8);
  ctx.stroke();

  lines.forEach((line, i) => {
    drawText(rc, line, rc.width / 2, barY + padding + i * lineHeight + lineHeight / 2, {
      align: "center", color: THEME.colors.textPrimary, size: fontSize, font: THEME.fonts.accent
    });
  });

  addButtonZone(rc.buttonZones, { id: "hint-dismiss", label: "Dismiss hint", x: barX, y: barY, width: barW, height: barH });
}
