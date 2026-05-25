import { formatTimePlayed } from "../../RunStats";
import { SIGNAL_GLASS_THEME, THEME } from "../../Theme";
import type { RenderState } from "../../Renderer";
import { drawButton, drawPanel, drawText } from "../CanvasPrimitives";
import { createPanelChrome, drawHeaderActions, drawPanelHeader } from "../PanelChrome";
import type { RenderContext } from "../RenderContext";

export function renderGameOver(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const panelW = Math.min(560, rc.width * 0.9);
  const panelH = 480;
  const px = rc.width / 2 - panelW / 2;
  const py = rc.height / 2 - panelH / 2;

  ctx.globalAlpha = 0.8;
  ctx.fillStyle = THEME.colors.bgDeep;
  ctx.fillRect(0, 0, rc.width, rc.height);
  ctx.globalAlpha = 1;

  drawPanel(rc, px, py, panelW, panelH);
  const chrome = createPanelChrome(rc, px, py, panelW, panelH);

  drawPanelHeader(rc, chrome, "VESSEL CRITICAL FAILURE");
  drawHeaderActions(rc, chrome, [{ id: "help", label: "HELP [?]", width: rc.narrow ? 76 : 94 }]);

  const cx = rc.width / 2;
  let row = py + 84;
  const rowGap = 28;
  drawText(rc, `FINAL PILOT RANK: ${state.pilotRank.title.toUpperCase()}`, cx, row, {
    align: "center", color: THEME.colors.accentPink, size: 18, font: THEME.fonts.accent
  });

  row += rowGap;
  drawText(rc, `INCIDENT: ${state.runStats.causeOfDeath.toUpperCase()}`, cx, row, {
    align: "center", color: THEME.colors.accentAmber, size: 14, font: THEME.fonts.mono
  });

  row += rowGap + 12;

  const labelX = px + 48;
  const valueX = px + panelW - 48;
  const statRows: Array<[string, string]> = [
    ["TOTAL BAL EARNED", `${state.runStats.totalBalEarned} BAL`],
    ["FINAL BALANCE", `${Math.round(state.player.balance)} BAL`],
    ["STAR SYSTEMS VISITED", `${state.runStats.systemsVisited.length}`],
    ["JUMPS COMPLETED", `${state.runStats.jumpsCompleted}`],
    ["CONTRACTS COMPLETED", `${state.runStats.missionsCompleted}`],
    ["CONTRACTS FAILED", `${state.runStats.missionsFailed}`],
    ["HOSTILES NEUTRALIZED", `${state.runStats.enemiesDestroyed}`],
    ["TIME IN SERVICE", formatTimePlayed(state.runStats.timePlayed)],
  ];

  for (const [label, value] of statRows) {
    drawText(rc, label, labelX, row, { align: "left", color: THEME.colors.textSecondary, size: 12, font: THEME.fonts.mono });
    drawText(rc, value, valueX, row, { align: "right", color: THEME.colors.textPrimary, size: 12, font: THEME.fonts.mono });
    row += rowGap;
  }

  const pb = state.meta.personalBest?.totalBalEarned ?? 0;
  if (pb > 0 || state.isNewPersonalBest) {
    const pbLabel = state.isNewPersonalBest ? "NEW PERSONAL BEST ESTABLISHED!" : `PERSONAL BEST: ${pb} BAL`;
    const pbColor = state.isNewPersonalBest ? THEME.colors.accentTeal : THEME.colors.success;
    row += rowGap + 8;
    drawText(rc, pbLabel, cx, row, { align: "center", color: pbColor, size: 13, font: THEME.fonts.accent });
  }
  if (rc.signalGlassUi) {
    drawText(rc, "SUGGESTED NEXT ACTION: RESTART, DOCK EARLY, REPAIR BEFORE RISKY CORRIDORS", cx, py + panelH - 92, {
      align: "center", color: SIGNAL_GLASS_THEME.colors.accent2, size: 10, font: THEME.fonts.mono
    });
  }

  const btnRowY = py + panelH - 64;
  const gbw = 130;
  drawButton(rc, "death-restart", "RESTART [R]", cx - gbw - 10, btnRowY, gbw, 42);
  drawButton(rc, "death-menu", "MENU [Esc]", cx + 10, btnRowY, gbw, 42);
}
