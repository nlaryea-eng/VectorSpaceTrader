import { getScreenPanelBounds } from "../../../Layout";
import { getMissionCardState } from "../../../SignalGlassScreens";
import { SIGNAL_GLASS_TEXT_SIZES, THEME } from "../../../Theme";
import { addButtonZone } from "../../ButtonZones";
import { drawButton, drawPanel, drawSignalPanel, drawText, isPointInRect, wrapText } from "../../CanvasPrimitives";
import { createPanelChrome, drawFooterHint, drawHeaderActions, drawPanelHeader } from "../../PanelChrome";
import type { RenderContext } from "../../RenderContext";
import type { RenderState } from "../../types";

export function renderMissions(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const bounds = getScreenPanelBounds({ width: rc.width, height: rc.height }, "missions");
  const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
  drawPanel(rc, panelX, panelY, panelW, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW, panelH);

  const active = state.player.activeMission;
  const hasPostings = state.missions.length > 0;
  const postingsLabel = state.missions.length === 1 ? "1 POSTING AVAILABLE" : `${state.missions.length} POSTINGS AVAILABLE`;
  drawPanelHeader(
    rc,
    chrome,
    "MISSION BOARD",
    active ? "ACTIVE CONTRACT IN PROGRESS" : hasPostings ? "NO ACTIVE CONTRACT" : "LOCAL CONTRACT FEED",
    active || hasPostings ? postingsLabel : undefined
  );
  drawHeaderActions(rc, chrome, [{ id: "help", label: "HELP [?]", width: rc.narrow ? 76 : 94 }]);

  const activeY = chrome.contentBounds.y + (rc.narrow ? 16 : 24);
  if (active) {
    const dest = state.systems[active.destinationSystemId]?.name ?? "unknown";
    const deadlineText = active.deadlineJumps >= 0 ? `${active.deadlineJumps}J LEFT` : "OPEN";
    const deadlineColor = active.deadlineJumps >= 0 && active.deadlineJumps <= 1 ? THEME.colors.danger : THEME.colors.accentTeal;
    ctx.font = `${rc.narrow ? 10 : 11}px ${THEME.fonts.mono}`;
    const txt = `ACTIVE: ${active.title.toUpperCase()} → ${dest.toUpperCase()} [${deadlineText}]`;
    const lines = wrapText(ctx, txt, panelW - 24);
    lines.forEach((line, i) => {
      drawText(rc, line, rc.width / 2, activeY + i * 14, {
        align: "center", color: deadlineColor, font: THEME.fonts.mono, size: rc.narrow ? 10 : 11
      });
    });
  } else if (hasPostings) {
    drawText(rc, "NO ACTIVE CONTRACT.", rc.width / 2, activeY, {
      align: "center", color: THEME.colors.textDim, font: THEME.fonts.mono, size: rc.narrow ? 10 : 11
    });
  }

  const top = activeY + (rc.narrow ? 30 : 58);
  const left = rc.narrow ? panelX + 12 : rc.width * 0.12;
  const rowW = rc.narrow ? panelW - 24 : rc.width * 0.76;
  const rowSpacing = rc.narrow ? 56 : 62;
  const rowH = rc.narrow ? 48 : 54;
  const maxRows = rc.narrow
    ? Math.max(0, Math.floor((chrome.footerRow.y - top - 10) / rowSpacing))
    : Math.max(0, Math.floor((chrome.footerRow.y - top - 10) / rowSpacing));

  // ── Empty state ──────────────────────────────────────────────────────────
  if (state.missions.length === 0) {
    const emptyCardW = chrome.emptyStateArea.width;
    const emptyCardH = rc.narrow ? 108 : 128;
    // Center the card within the panel, not the viewport.
    const emptyCardX = chrome.emptyStateArea.x;
    const emptyCardY = Math.min(chrome.emptyStateArea.y, chrome.footerRow.y - emptyCardH - (rc.narrow ? 54 : 62));
    const cardCenterX = emptyCardX + emptyCardW / 2;
    rc.signalGlassUi
      ? drawSignalPanel(rc, emptyCardX, emptyCardY, emptyCardW, emptyCardH, "base")
      : (() => {
          ctx.fillStyle = "rgba(10, 14, 20, 0.5)";
          ctx.beginPath();
          ctx.roundRect(emptyCardX, emptyCardY, emptyCardW, emptyCardH, 8);
          ctx.fill();
        })();
    drawText(rc, "NO CONTRACTS AVAILABLE HERE", cardCenterX, emptyCardY + (rc.narrow ? 26 : 34), {
      align: "center", color: THEME.colors.accentAmber, size: rc.narrow ? 14 : 18, font: THEME.fonts.accent
    });
    const system = state.systems[state.player.currentSystemId];
    const whyText = system
      ? `${system.name.toUpperCase()} HAS NO ACTIVE POSTINGS AT THIS TIME.`
      : "NO ACTIVE POSTINGS AT THIS STATION.";
    drawText(rc, whyText, cardCenterX, emptyCardY + (rc.narrow ? 50 : 66), {
      align: "center", color: THEME.colors.textSecondary, size: rc.narrow ? 10 : 12, font: THEME.fonts.mono
    });
    drawText(rc, "TRY JUMPING TO ANOTHER SYSTEM OR CHECKING BACK AFTER A TRANSIT.", cardCenterX, emptyCardY + (rc.narrow ? 70 : 90), {
      align: "center", color: THEME.colors.textDim, size: rc.narrow ? 9 : 11, font: THEME.fonts.mono
    });
    // Action buttons attached below the card, centered with it.
    const actionY = Math.min(emptyCardY + emptyCardH + (rc.narrow ? 10 : 14), chrome.footerPrimaryActionRow.y);
    const btnW = rc.narrow ? (emptyCardW - 16) / 2 : 148;
    const btnH = rc.narrow ? 36 : 40;
    const btnGap = rc.narrow ? 16 : 12;
    const btnsW = btnW * 2 + btnGap;
    const btnStartX = emptyCardX + (emptyCardW - btnsW) / 2;
    drawButton(rc, "touch-dock", "LAUNCH [D]", btnStartX, actionY, btnW, btnH);
    drawButton(rc, "map-open", "OPEN MAP [M]", btnStartX + btnW + btnGap, actionY, btnW, btnH);
  }

  state.missions.slice(0, maxRows).forEach((mission, index) => {
    const y = top + index * rowSpacing;
    const rowY = y - 18;
    const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);

    if (hovered && !active) {
      ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
      ctx.beginPath();
      ctx.roundRect(left - 8, rowY, rowW + 16, rowH, 4);
      ctx.fill();
    }

    addButtonZone(rc.buttonZones, { id: `mission-row-${index}`, label: mission.title, x: left, y: rowY, width: rowW, height: rowH });
    drawText(rc, `${index + 1}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
    const cardState = getMissionCardState(state.player, mission);
    const cardColor = cardState.state === "acceptable"
      ? THEME.colors.success
      : cardState.state === "warning"
        ? THEME.colors.warning
        : THEME.colors.danger;

    const titleText = `${mission.typeLabel.toUpperCase()}: ${mission.title.toUpperCase()}`;
    if (rc.narrow) {
      // Two-line stacked: title row + meta row.
      ctx.font = `12px ${THEME.fonts.accent}`;
      const tLines = wrapText(ctx, titleText, rowW - 90);
      drawText(rc, tLines[0] ?? titleText, left + 22, y, { color: THEME.colors.textPrimary, size: 12, font: THEME.fonts.accent });
      drawText(rc, `${mission.reward} BAL`, left + rowW - 8, y, { align: "right", color: THEME.colors.accentAmber, font: THEME.fonts.mono, size: 12 });
      const dest = state.systems[mission.destinationSystemId]?.name.toUpperCase() ?? "?";
      const cargoText = mission.cargoUnitsRequired > 0 ? `${mission.cargoUnitsRequired}T` : "0T";
      const deadlineText = mission.deadlineJumps >= 0 ? `${mission.deadlineJumps}J` : "OPEN";
      drawText(rc, `→ ${dest} · ${cargoText} · ${deadlineText} · ${mission.riskLabel.toUpperCase()}`, left + 22, y + 18, {
        size: SIGNAL_GLASS_TEXT_SIZES.missionRow, color: THEME.colors.textSecondary, font: THEME.fonts.mono
      });
      drawText(rc, cardState.label.toUpperCase(), left + rowW - 8, y + 34, {
        align: "right", size: SIGNAL_GLASS_TEXT_SIZES.missionRow, color: cardColor, font: THEME.fonts.mono
      });
    } else {
      drawText(rc, titleText, left + 38, y, { color: THEME.colors.textPrimary, size: 14, font: THEME.fonts.accent });
      drawText(rc, `${mission.reward} BAL`, left + 320, y, { color: THEME.colors.accentAmber, font: THEME.fonts.mono, size: 13 });
      const cargoText = mission.cargoUnitsRequired > 0 ? `${mission.cargoUnitsRequired}T CARGO` : "NO CARGO";
      const deadlineText = mission.deadlineJumps >= 0 ? `${mission.deadlineJumps}J LIMIT` : "OPEN";
      drawText(rc, `${cargoText} · ${deadlineText} · ${mission.riskLabel.toUpperCase()} · ${cardState.label.toUpperCase()}`, left + 420, y, { size: 11, color: cardColor, font: THEME.fonts.mono });
      drawText(rc, state.systems[mission.destinationSystemId]?.name.toUpperCase() ?? "?", left + 38, y + 20, { size: 11, color: THEME.colors.textSecondary, font: THEME.fonts.mono });
      drawText(rc, `REP ${signed(mission.reputationChange)} / LEGAL ${signed(mission.legalRiskChange)} / ${cardState.slackLabel.toUpperCase()}`, left + 320, y + 20, { size: 11, color: THEME.colors.textDim, font: THEME.fonts.mono });
    }
  });

  const footer = rc.narrow ? "TAP TO ACCEPT · ESC BACK" : "CLICK ROW OR 1-8 TO ACCEPT CONTRACT · ESC BACK";
  drawFooterHint(rc, chrome, footer);
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
