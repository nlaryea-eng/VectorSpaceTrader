import { SIGNAL_GLASS_TEXT_SIZES, SIGNAL_GLASS_THEME, THEME } from "../../Theme";
import type { RenderState } from "../../Renderer";
import { drawButton, drawPanel, drawText } from "../CanvasPrimitives";
import { createPanelChrome, drawPanelHeader } from "../PanelChrome";
import type { RenderContext } from "../RenderContext";
import { SHORT_BREAKPOINT } from "../RendererLayout";

export function renderPause(rc: RenderContext, state: RenderState): void {
  const short = rc.height < SHORT_BREAKPOINT;
  const panelW = Math.min(360, rc.width - 24);
  const panelH = short ? 260 : 300;
  const panelX = rc.width / 2 - panelW / 2;
  const panelY = rc.height / 2 - panelH / 2;
  drawPanel(rc, panelX, panelY, panelW, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW, panelH);
  drawPanelHeader(rc, chrome, "SESSION PAUSED", "ENTER TO RESUME");

  const microSize = SIGNAL_GLASS_TEXT_SIZES.pauseMicrocopy;
  drawText(rc, "AUTO-SAVED DURING TRANSITS", rc.width / 2, panelY + 108, {
    align: "center", color: THEME.colors.textSecondary, size: microSize, font: THEME.fonts.mono
  });
  if (rc.signalGlassUi) {
    drawText(rc, "SAVE CARD: SYSTEM / SHIP / CARGO", rc.width / 2, panelY + 128, {
      align: "center", color: SIGNAL_GLASS_THEME.colors.textMuted, size: microSize, font: THEME.fonts.mono
    });
    drawText(rc, "BAL / ACTIVE MISSION / LOADOUT", rc.width / 2, panelY + 146, {
      align: "center", color: SIGNAL_GLASS_THEME.colors.textMuted, size: microSize, font: THEME.fonts.mono
    });
  }
  drawText(rc, `BALANCE: ${Math.round(state.player.balance)} BAL`, rc.width / 2, panelY + 166, {
    align: "center", font: THEME.fonts.mono, size: 13, color: THEME.colors.accentAmber
  });
  const btnY = panelY + panelH - 106;
  const btnW = Math.min(100, (panelW - 48) / 3);
  drawButton(rc, "pause-resume", "RESUME", panelX + 12, btnY, btnW, 38);
  drawButton(rc, "help", "HELP [?]", panelX + 12 + btnW + 12, btnY, btnW, 38);
  drawButton(rc, "pause-settings", "CONFIG", panelX + 12 + (btnW + 12) * 2, btnY, btnW, 38);
  drawButton(rc, "pause-menu", "ABORT TO MAIN MENU", panelX + 12, btnY + 50, panelW - 24, 34);
}
