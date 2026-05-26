import { SIGNAL_GLASS_THEME, THEME } from "../../Theme";
import { drawSignalPanel, drawText } from "../CanvasPrimitives";
import type { RenderContext } from "../RenderContext";
import { getTutorialBannerRect } from "../RendererLayout";
import type { RenderState } from "../types";

export function renderTutorialBanner(rc: RenderContext, state: RenderState): void {
  const hint = state.tutorialHint;
  if (!hint) return;

  const rect = getTutorialBannerRect(state.mode, rc.width, rc.height, rc.narrow, state.messageLog.entries.length);
  const colors = SIGNAL_GLASS_THEME.colors;
  drawSignalPanel(rc, rect.x, rect.y, rect.width, rect.height, "overlay");
  drawText(rc, "FIRST FLIGHT", rect.x + 12, rect.y + 15, {
    color: colors.accent2, size: rc.narrow ? 8 : 9, font: THEME.fonts.mono
  });
  drawText(rc, hint.toUpperCase(), rect.x + 12, rect.y + (rc.narrow ? 32 : 31), {
    color: colors.text, size: rc.narrow ? 10 : 11, font: THEME.fonts.accent
  });
}
