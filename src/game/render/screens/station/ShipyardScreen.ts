import { getScreenPanelBounds } from "../../../Layout";
import { getShipComparison } from "../../../SignalGlassScreens";
import { getPlayerShip, getPlayerShipStats, PLAYER_SHIPS } from "../../../Ships";
import { THEME } from "../../../Theme";
import { getTotalOccupiedCargo } from "../../../Trading";
import { addButtonZone } from "../../ButtonZones";
import { drawButton, drawPanel, drawText, isPointInRect, wrapText } from "../../CanvasPrimitives";
import { createPanelChrome, drawFooterHint, drawHeaderActions, drawPanelHeader, rowTextY } from "../../PanelChrome";
import type { RenderContext } from "../../RenderContext";
import type { RenderState } from "../../types";

export function renderShipyard(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const bounds = getScreenPanelBounds({ width: rc.width, height: rc.height }, "shipyard");
  const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
  drawPanel(rc, panelX, panelY, panelW, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW, panelH);

  const currentShip = getPlayerShip(state.player.shipId);
  const selectedShip = getPlayerShip(state.selectedShipId);
  const currentStats = getPlayerShipStats(state.player);
  const selectedStats = getPlayerShipStats({ ...state.player, shipId: selectedShip.id });
  const comparison = getShipComparison(state.player, selectedShip.id);
  const cargoUsed = getTotalOccupiedCargo(state.player);
  const canAfford = state.player.balance >= selectedShip.price;
  const cargoFits = cargoUsed <= selectedStats.cargoCapacity;
  const alreadyCurrent = selectedShip.id === currentShip.id;

  drawPanelHeader(
    rc,
    chrome,
    "SHIPYARD",
    `${Math.round(state.player.balance)} BAL · CARGO ${cargoUsed}/${state.player.cargoCapacity}`,
    `COMPARISON READY / ${comparison.affordabilityLabel.toUpperCase()}`
  );
  drawHeaderActions(rc, chrome, [{ id: "help", label: "HELP [?]", width: rc.narrow ? 76 : 94 }]);

  const left = rc.narrow ? panelX + 12 : rc.width * 0.1;
  const listTop = chrome.contentBounds.y + (rc.narrow ? 20 : 30);
  const listW = rc.narrow ? panelW - 24 : rc.width * 0.36;
  const rowSpacing = rc.narrow ? 38 : 42;

  const filteredShips = PLAYER_SHIPS.filter((ship) => state.shipyardClassFilter === "all" || ship.classId === state.shipyardClassFilter);
  const pageSize = rc.narrow ? 5 : 8;
  const pageCount = Math.max(1, Math.ceil(filteredShips.length / pageSize));
  const page = Math.max(0, Math.min(state.shipyardPage, pageCount - 1));
  const visibleShips = filteredShips.slice(page * pageSize, page * pageSize + pageSize);

  visibleShips.forEach((ship, index) => {
    const y = listTop + index * rowSpacing;
    const rowY = y - 16;
    const rowH = rc.narrow ? 32 : 36;
    const selected = ship.id === selectedShip.id;

    if (selected || isPointInRect(state.mousePosition, left, rowY, listW, rowH)) {
      ctx.fillStyle = selected ? "rgba(255, 0, 127, 0.1)" : "rgba(0, 242, 255, 0.05)";
      ctx.beginPath();
      ctx.roundRect(left - 8, rowY, listW + 16, rowH, 4);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = THEME.colors.accentPink;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    addButtonZone(rc.buttonZones, { id: `ship-row-${index}`, label: ship.name, x: left, y: rowY, width: listW, height: rowH });
    drawText(rc, `${index + 1}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
    const nameSize = rc.narrow ? 12 : 14;
    drawText(rc, ship.name.toUpperCase(), left + 22, y, {
      color: ship.id === currentShip.id ? THEME.colors.accentTeal : THEME.colors.textPrimary, font: THEME.fonts.accent, size: nameSize
    });
    drawText(rc, ship.id === currentShip.id ? "ACTIVE" : `${ship.price} BAL`, left + listW - 8, y, {
      align: "right", size: 11, font: THEME.fonts.mono, color: ship.id === currentShip.id ? THEME.colors.accentTeal : THEME.colors.accentAmber
    });
  });

  const shipyardPageY = listTop + visibleShips.length * rowSpacing + (rc.narrow ? 8 : 12);
  const filterLabel = `CLASS: ${state.shipyardClassFilter.toUpperCase()}`;
  drawButton(rc, "shipyard-class-cycle", filterLabel, left, shipyardPageY - 14, 120, 28);
  if (page > 0) drawButton(rc, "shipyard-page-prev", "PREV", left + 130, shipyardPageY - 14, 60, 28);
  if (page < pageCount - 1) drawButton(rc, "shipyard-page-next", "NEXT", left + 200, shipyardPageY - 14, 60, 28);

  // On narrow viewports, render detail below the list; on wider screens, beside.
  const detailX = rc.narrow ? panelX + 16 : rc.width * 0.52;
  const detailY = rc.narrow ? shipyardPageY + 32 : rc.height * 0.27;
  const detailNameSize = rc.narrow ? 16 : 24;
  const detailRoleSize = rc.narrow ? 10 : 12;
  drawText(rc, selectedShip.name.toUpperCase(), detailX, detailY, { color: THEME.colors.textPrimary, size: detailNameSize, font: THEME.fonts.accent });
  drawText(rc, selectedShip.role.toUpperCase(), detailX, detailY + (rc.narrow ? 18 : 32), { color: THEME.colors.accentTeal, size: detailRoleSize, font: THEME.fonts.mono });

  // Wrap description on narrow viewports.
  if (rc.narrow) {
    ctx.font = `11px ${THEME.fonts.primary}`;
    const descLines = wrapText(ctx, selectedShip.description, panelW - 40).slice(0, 2);
    descLines.forEach((line, i) => {
      drawText(rc, line, detailX, detailY + 36 + i * 14, { color: THEME.colors.textSecondary, size: 11 });
    });
  } else {
    drawText(rc, selectedShip.description, detailX, detailY + 60, { color: THEME.colors.textSecondary, size: 12 });
  }

  const rows: Array<[string, string, string]> = [
    ["HULL", `${currentStats.maxHull}`, `${selectedStats.maxHull}`],
    ["SHIELD", `${currentStats.maxShield}`, `${selectedStats.maxShield}`],
    ["CARGO", `${currentStats.cargoCapacity}`, `${selectedStats.cargoCapacity}`],
    ["FUEL", currentStats.fuelCapacity.toFixed(1), selectedStats.fuelCapacity.toFixed(1)],
    ["RANGE", currentStats.maxJumpRange.toFixed(1), selectedStats.maxJumpRange.toFixed(1)],
    ["SPEED", currentStats.speedModifier.toFixed(2), selectedStats.speedModifier.toFixed(2)],
    ["HANDLING", currentStats.handlingModifier.toFixed(2), selectedStats.handlingModifier.toFixed(2)],
    ["COMBAT", currentStats.combatDamageModifier.toFixed(2), selectedStats.combatDamageModifier.toFixed(2)]
  ];

  const statsTop = detailY + (rc.narrow ? 70 : 104);
  const colCurrent = detailX + (rc.narrow ? panelW - 130 : 180);
  const colSelected = detailX + (rc.narrow ? panelW - 60 : 280);
  const statSpacing = rc.narrow ? 18 : 26;
  const headerSize = rc.narrow ? 9 : 10;
  drawText(rc, "CUR", colCurrent, statsTop, { align: "right", color: THEME.colors.textDim, size: headerSize, font: THEME.fonts.mono });
  drawText(rc, "NEW", colSelected, statsTop, { align: "right", color: THEME.colors.textDim, size: headerSize, font: THEME.fonts.mono });

  rows.forEach(([label, current, selected], index) => {
    const y = statsTop + 18 + index * statSpacing;
    drawText(rc, label, detailX, y, { size: rc.narrow ? 10 : 11, font: THEME.fonts.mono, color: THEME.colors.textSecondary });
    drawText(rc, current, colCurrent, y, { align: "right", size: rc.narrow ? 10 : 11, font: THEME.fonts.mono });
    drawText(rc, selected, colSelected, y, { align: "right", size: rc.narrow ? 10 : 11, font: THEME.fonts.mono, color: compareColor(Number(selected), Number(current)) });
  });

  const warning = alreadyCurrent
    ? "SYSTEMS ACTIVE"
    : !canAfford
      ? comparison.affordabilityLabel.toUpperCase()
      : !cargoFits
        ? `CARGO OVERFLOW: ${comparison.cargoOverflow} UNITS`
        : "READY FOR ACQUISITION";

  const warningColor = alreadyCurrent ? THEME.colors.accentTeal : (!canAfford || !cargoFits ? THEME.colors.danger : THEME.colors.success);
  drawText(rc, warning, chrome.footerStatusRow.x + chrome.footerStatusRow.width / 2, rowTextY(chrome.footerStatusRow), {
    align: "center", size: rc.narrow ? 10 : 12, font: THEME.fonts.accent, color: warningColor
  });
  drawButton(rc, "ship-buy", "PURCHASE [Enter]", chrome.footerPrimaryActionRow.x, chrome.footerPrimaryActionRow.y, chrome.footerPrimaryActionRow.width, chrome.footerPrimaryActionRow.height);

  const footer = rc.narrow ? "1-6 COMPARE · ENTER BUY · ESC BACK" : "CLICK HULL OR 1-6 TO COMPARE · ENTER PURCHASES · ESC BACK";
  drawFooterHint(rc, chrome, footer);
}

function compareColor(selected: number, current: number): string {
  if (selected > current) return THEME.colors.success;
  if (selected < current) return THEME.colors.danger;
  return THEME.colors.textPrimary;
}
