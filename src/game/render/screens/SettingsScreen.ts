import { getScreenPanelBounds } from "../../Layout";
import { SIGNAL_GLASS_TEXT_SIZES, SIGNAL_GLASS_THEME, THEME } from "../../Theme";
import type { RenderState } from "../../Renderer";
import { drawButton, drawPanel, drawProgressBar, drawText } from "../CanvasPrimitives";
import { createPanelChrome, drawHeaderActions, drawPanelHeader } from "../PanelChrome";
import type { RenderContext } from "../RenderContext";

export function renderSettings(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const panelW = Math.min(rc.narrow ? rc.width - 24 : 460, rc.width - 24);
  const bounds = getScreenPanelBounds({ width: rc.width, height: rc.height }, "centered", panelW);
  const { x: panelX, y: panelY, width: panelW_adjusted, height: panelH } = bounds;
  drawPanel(rc, panelX, panelY, panelW_adjusted, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW_adjusted, panelH);
  drawPanelHeader(rc, chrome, "SYSTEM SETTINGS", "VALUES SAVE LOCALLY", "DISPLAY / AUDIO / CONTROLS");
  drawHeaderActions(rc, chrome, [{ id: "help", label: "HELP [?]", width: rc.narrow ? 70 : 94 }]);

  const left = chrome.contentBounds.x;
  const innerW = chrome.contentBounds.width;
  const rowH = rc.narrow ? 40 : 42;
  const gap = rc.narrow ? 8 : 10;
  const microSize = SIGNAL_GLASS_TEXT_SIZES.settingsMicrocopy;
  let y = chrome.contentBounds.y + (rc.narrow ? 2 : 4);

  const section = (label: string, color: string): void => {
    drawText(rc, label, left, y + 10, { size: 11, font: THEME.fonts.accent, color });
    y += 20;
  };
  const settingRowPanel = (): void => {
    ctx.fillStyle = "rgba(14, 19, 32, 0.38)";
    ctx.beginPath();
    ctx.roundRect(left, y, innerW, rowH, SIGNAL_GLASS_THEME.radius.control);
    ctx.fill();
    ctx.strokeStyle = "rgba(230, 236, 245, 0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(left, y, innerW, rowH, SIGNAL_GLASS_THEME.radius.control);
    ctx.stroke();
  };
  const controlGeometry = (): { controlRight: number; controlLeft: number; btn: number; btnGap: number; downX: number; upX: number; btnY: number } => {
    const btn = rc.narrow ? 30 : 32;
    const btnGap = 6;
    const controlRight = left + innerW - 10;
    const upX = controlRight - btn;
    const downX = upX - btnGap - btn;
    const controlLeft = Math.max(downX, controlRight - (rc.narrow ? 92 : 112));
    const btnY = y + (rowH - btn) / 2;
    return { controlRight, controlLeft, btn, btnGap, downX, upX, btnY };
  };
  const valueRow = (label: string, value: number, color: string, downId: string, upId: string): void => {
    settingRowPanel();
    drawText(rc, label, left + 12, y + rowH / 2, { size: 11, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
    const { btn, downX, upX, btnY } = controlGeometry();
    const barX = left + (rc.narrow ? 116 : 138);
    const barW = Math.max(46, downX - barX - 12);
    drawProgressBar(rc, barX, y + rowH / 2 - 6, barW, 12, value, color);
    drawButton(rc, downId, "-", downX, btnY, btn, btn);
    drawButton(rc, upId, "+", upX, btnY, btn, btn);
    y += rowH + gap;
  };
  const toggleRow = (label: string, id: string, value: string, detail: string): void => {
    settingRowPanel();
    drawText(rc, label, left + 12, y + 16, { size: 11, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
    const { controlRight, controlLeft, btn, btnY } = controlGeometry();
    drawButton(rc, id, value, controlLeft, btnY, controlRight - controlLeft, btn);
    drawText(rc, detail, left + 12, y + 31, { size: microSize, font: THEME.fonts.mono, color: THEME.colors.textDim });
    y += rowH + gap;
  };

  section("DISPLAY", THEME.colors.accentAmber);
  toggleRow("VISUAL GLOW", "settings-glow", state.phosphorGlow ? "ON" : "OFF", "Signal Glass phosphor effect");
  section("AUDIO", THEME.colors.accentTeal);
  valueRow("SFX VOLUME", state.sfxVolume, THEME.colors.accentTeal, "settings-sfx-down", "settings-sfx-up");
  valueRow("MUSIC VOLUME", state.musicVolume, THEME.colors.accentPink, "settings-music-down", "settings-music-up");
  toggleRow("AUDIO OUTPUT", "settings-mute", state.audioMuted ? "MUTE" : "LIVE", "Procedural audio output");
  section("CONTROLS / INFORMATION", THEME.colors.accentViolet);
  settingRowPanel();
  drawText(rc, "PILOT MANUAL KEEPS THE CONTROL MAP.", left + 12, y + 16, {
    color: THEME.colors.textSecondary,
    size: microSize,
    font: THEME.fonts.mono
  });
  drawText(rc, "ESC CLOSES SETTINGS. ? OPENS HELP.", left + 12, y + 31, {
    color: THEME.colors.textDim,
    size: microSize,
    font: THEME.fonts.mono
  });

  const closeW = Math.min(rc.narrow ? 150 : 176, chrome.footerPrimaryActionRow.width);
  drawButton(rc, "settings-back", "CLOSE [Esc]", chrome.footerPrimaryActionRow.x + (chrome.footerPrimaryActionRow.width - closeW) / 2, chrome.footerPrimaryActionRow.y, closeW, chrome.footerPrimaryActionRow.height);
}
