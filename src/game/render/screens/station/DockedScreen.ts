import { getScreenPanelBounds } from "../../../Layout";
import { getLegalRiskLabel, getReputationLabel } from "../../../Reputation";
import { getStationRecommendation, getStationServiceTiles } from "../../../SignalGlassScreens";
import { getStationProfile } from "../../../StationServices";
import { SIGNAL_GLASS_THEME, THEME } from "../../../Theme";
import { calcRepairCost } from "../../../Trading";
import { drawButton, drawPanel, drawSignalPanel, drawText, wrapText } from "../../CanvasPrimitives";
import { createPanelChrome, drawHeaderActions, drawPanelHeader, drawPrimaryButton, rowTextY } from "../../PanelChrome";
import type { RenderContext } from "../../RenderContext";
import type { RenderState } from "../../types";

export function renderDocked(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const bounds = getScreenPanelBounds({ width: rc.width, height: rc.height }, "docked");
  const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
  drawPanel(rc, panelX, panelY, panelW, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW, panelH);

  const system = state.systems[state.player.currentSystemId];
  const profile = getStationProfile(system);
  const hullFraction = state.player.hull / state.player.maxHull;
  const repLabel = getReputationLabel(state.player.reputation);
  const riskLabel = getLegalRiskLabel(state.player.legalRisk);

  // On compact viewports the HELP button sits in the right portion of titleRow —
  // constrain the title to the available left region to prevent overlap.
  const dockedTitleW = rc.narrow
    ? chrome.titleRow.width - chrome.headerActionRow.width - 8
    : undefined;
  drawPanelHeader(rc, chrome, `${system.name.toUpperCase()} STATION`, profile.label.toUpperCase(), system.stationHint.toUpperCase(), dockedTitleW);
  drawHeaderActions(rc, chrome, [{ id: "help", label: "HELP [?]", width: rc.narrow ? 76 : 94 }]);

  const infoY = chrome.contentBounds.y + (rc.narrow ? 18 : 20);
  const infoSize = rc.narrow ? 11 : 14;
  const infoGap = rc.narrow ? 22 : 32;

  // Value colors — only deviate from muted when off-nominal.
  const muted = THEME.colors.textSecondary;
  const hullValueColor = hullFraction < 0.3 ? THEME.colors.danger
    : hullFraction < 0.6 ? THEME.colors.warning
    : muted;
  const repValueColor = state.player.reputation < 0 ? THEME.colors.warning : muted;
  const riskValueColor = state.player.legalRisk >= 5 ? THEME.colors.danger
    : state.player.legalRisk >= 2 ? THEME.colors.warning
    : muted;

  // Helper: draw a centered multi-segment line (label + value each with their own color).
  const drawInfoLine = (y: number, fontSize: number, segments: Array<{ text: string; color: string }>): void => {
    const font = `${fontSize}px ${THEME.fonts.mono}`;
    const widths = segments.map((seg) => { ctx.font = font; return ctx.measureText(seg.text).width; });
    const totalW = widths.reduce((a, b) => a + b, 0);
    let x = rc.width / 2 - totalW / 2;
    for (let i = 0; i < segments.length; i++) {
      drawText(rc, segments[i].text, x, y, { color: segments[i].color, size: fontSize, font: THEME.fonts.mono });
      x += widths[i];
    }
  };

  drawInfoLine(infoY, infoSize, [
    { text: "PILOT RANK  ", color: muted },
    { text: state.pilotRank.title.toUpperCase(), color: muted }
  ]);
  drawInfoLine(infoY + infoGap, infoSize, [
    { text: "HULL  ", color: muted },
    { text: `${Math.round(state.player.hull)}/${state.player.maxHull}`, color: hullValueColor },
    { text: `   BAL  ${Math.round(state.player.balance)}`, color: muted }
  ]);
  drawInfoLine(infoY + infoGap * 2, infoSize - 2, [
    { text: "REPUTATION  ", color: muted },
    { text: repLabel.toUpperCase(), color: repValueColor },
    { text: "   STATUS  ", color: muted },
    { text: riskLabel.toUpperCase(), color: riskValueColor }
  ]);

  if (state.player.activeMission) {
    const am = state.player.activeMission;
    const dest = state.systems[am.destinationSystemId]?.name ?? "unknown";
    const missionText = `ACTIVE: ${am.title} → ${dest}`;
    ctx.font = `${infoSize - 2}px ${THEME.fonts.mono}`;
    const missionLines = wrapText(ctx, missionText, panelW - 32);
    missionLines.forEach((line, i) => {
      drawText(rc, line, rc.width / 2, infoY + infoGap * 3 + i * (infoSize + 2), {
        align: "center", color: THEME.colors.accentAmber, size: infoSize - 2, font: THEME.fonts.mono
      });
    });
  }

  // Service action zone — computed first so recommendation card can snap to it.
  const serviceY = chrome.footerRow.y;

  if (rc.signalGlassUi) {
    const repairCost = calcRepairCost(state.player, profile.repairCostModifier);
    const recommendation = getStationRecommendation(state.player, system, state.market, repairCost);
    const recW = rc.narrow ? panelW - 32 : Math.min(520, panelW - 64);
    const recX = rc.width / 2 - recW / 2;
    const recH = rc.narrow ? 62 : 70;
    // Snap recommendation card close to service actions (gap ≤ 16px mobile / 24px desktop).
    const maxGap = rc.narrow ? 16 : 24;
    const recY = serviceY - recH - maxGap;
    drawSignalPanel(rc, recX, recY, recW, recH, "base");
    drawText(rc, "RECOMMENDED NEXT ACTION", recX + 14, recY + 16, {
      color: SIGNAL_GLASS_THEME.colors.textMuted, size: 9, font: THEME.fonts.mono
    });
    drawText(rc, recommendation.title.toUpperCase(), recX + 14, recY + (rc.narrow ? 34 : 38), {
      color: SIGNAL_GLASS_THEME.colors.accent2, size: rc.narrow ? 12 : 14, font: THEME.fonts.accent
    });
    drawText(rc, recommendation.detail.toUpperCase(), recX + 14, recY + (rc.narrow ? 50 : 56), {
      color: SIGNAL_GLASS_THEME.colors.textMuted, size: rc.narrow ? 8 : 10, font: THEME.fonts.mono
    });
  }

  const unavailable = getStationServiceTiles(system).filter((tile) => !tile.available);
  const stationStatus = unavailable.length > 0
    ? `${unavailable.map((tile) => tile.shortLabel).join(" / ")} OFFLINE`
    : "EQUIPMENT INCLUDES HULL REPAIR";
  drawText(rc, stationStatus, chrome.footerStatusRow.x + chrome.footerStatusRow.width / 2, rowTextY(chrome.footerStatusRow), {
    align: "center",
    color: unavailable.length > 0 ? THEME.colors.textDim : THEME.colors.success,
    size: rc.narrow ? 9 : 10,
    font: THEME.fonts.mono
  });

  if (rc.narrow) {
    // Two-column grid of station service buttons that fits at 390px.
    const cols = 2;
    const rowYs = [chrome.footerPrimaryActionRow.y, chrome.footerSecondaryActionRow.y];
    const bgap = 8;
    const bw = (panelW - 32 - bgap * (cols - 1)) / cols;
    const bh = Math.min(34, chrome.footerPrimaryActionRow.height);
    const labels = rc.signalGlassUi
      ? getStationServiceTiles(system).map((tile) => [tile.id, tile.available ? tile.shortLabel : `${tile.shortLabel} LOCKED`] as [string, string])
      : [["touch-trade", "MARKET"], ["touch-equipment", "EQUIPMENT"], ["touch-shipyard", "SHIPS"], ["touch-missions", "MISSIONS"]] as Array<[string, string]>;
    labels.forEach((entry, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const bx = panelX + 16 + col * (bw + bgap);
      const by = rowYs[Math.min(row, rowYs.length - 1)];
      drawButton(rc, entry[0], entry[1], bx, by, bw, bh);
    });
    // Mobile LAUNCH — full-width primary CTA with accent fill.
    drawPrimaryButton(rc, "touch-dock", "LAUNCH", panelX + 16, chrome.footerHintRow.y - 6, panelW - 32, 28);
  } else {
    const bw = 84;
    const launchW = Math.round(bw * 1.5); // 126 — wider to signal dominance
    const bgap = 10;
    const tiles = rc.signalGlassUi ? getStationServiceTiles(system) : null;
    const labels: Array<[string, string]> = tiles
      ? tiles.map((tile) => [tile.id, tile.available ? tile.shortLabel : "LOCKED"])
      : [["touch-trade", "MARKET"], ["touch-equipment", "EQUIPMENT"], ["touch-shipyard", "SHIPS"], ["touch-missions", "MISSIONS"]];

    // Service tiles at uniform bw, then double gap, then LAUNCH at 1.5× width.
    const nTiles = labels.length;
    const totalServiceW = nTiles * bw + (nTiles - 1) * bgap;
    const totalW = totalServiceW + bgap * 2 + launchW;
    const startX = rc.width / 2 - totalW / 2;

    labels.forEach(([id, label], index) => {
      drawButton(rc, id, label, startX + index * (bw + bgap), chrome.footerPrimaryActionRow.y, bw, chrome.footerPrimaryActionRow.height);
      if (tiles && tiles[index] && !tiles[index].available) {
        drawText(rc, tiles[index].why.toUpperCase().slice(0, 18), startX + index * (bw + bgap) + bw / 2, chrome.footerSecondaryActionRow.y + 14, {
          align: "center", color: SIGNAL_GLASS_THEME.colors.textDim, size: 7, font: THEME.fonts.mono
        });
      }
    });

    // Desktop LAUNCH — wider, accent-filled primary CTA.
    const launchX = startX + totalServiceW + bgap * 2;
    drawPrimaryButton(rc, "touch-dock", "LAUNCH", launchX, chrome.footerPrimaryActionRow.y, launchW, chrome.footerPrimaryActionRow.height);
  }
}
