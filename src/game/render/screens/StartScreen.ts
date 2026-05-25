import { THEME } from "../../Theme";
import type { RenderState } from "../../Renderer";
import { drawButton, drawCenteredTitle, drawText } from "../CanvasPrimitives";
import type { RenderContext } from "../RenderContext";

export function renderStart(rc: RenderContext, state: RenderState): void {
  const titleY = rc.narrow ? rc.height * 0.18 : rc.height * 0.24;
  drawCenteredTitle(rc, "Vector Space Trader", titleY);
  const subtitle = rc.narrow
    ? "CLEAN-ROOM WIREFRAME TRADER"
    : "A CLEAN-ROOM WIREFRAME TRADING AND COMBAT GAME";
  drawText(rc, subtitle, rc.width / 2, titleY + (rc.narrow ? 40 : 80), {
    align: "center",
    color: THEME.colors.accentTeal,
    size: rc.narrow ? 12 : 14,
    font: THEME.fonts.accent
  });
  const btnW = Math.min(300, rc.width - 48);
  const btnH = rc.narrow ? 44 : 48;
  const btnX = rc.width / 2 - btnW / 2;
  const btnTop = rc.narrow ? rc.height * 0.4 : rc.height * 0.44;
  const btnGap = rc.narrow ? 56 : 64;
  drawButton(rc, "new", "INITIALIZE MISSION   [1]", btnX, btnTop, btnW, btnH);
  let nextY = btnTop + btnGap;
  if (state.hasSave) {
    drawButton(rc, "continue", "RESUME SESSION   [2]", btnX, nextY, btnW, btnH);
    nextY += btnGap;
  }
  drawButton(rc, "help", "PILOT MANUAL     [?]", btnX, nextY, btnW, btnH);
  nextY += btnGap;
  drawButton(rc, "controls", "SYSTEM OVERVIEW   [3]", btnX, nextY, btnW, btnH);
  const footer = rc.narrow
    ? "ORIGINAL CODE, ASSETS, AND DATA"
    : "ORIGINAL CODE, ASSETS, NAMES, SYSTEMS, AND GAMEPLAY DATA";
  drawText(rc, footer, rc.width / 2, rc.height - (rc.narrow ? 24 : 44), {
    align: "center",
    color: THEME.colors.textDim,
    size: rc.narrow ? 9 : 11,
    font: THEME.fonts.mono
  });
}
