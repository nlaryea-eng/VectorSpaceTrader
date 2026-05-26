import { getPriceTrend } from "../../../Economy";
import { getScreenPanelBounds } from "../../../Layout";
import { getMarketRowDisplay } from "../../../SignalGlassScreens";
import { getPlayerShipStats } from "../../../Ships";
import { SIGNAL_GLASS_TEXT_SIZES, THEME } from "../../../Theme";
import { getTotalOccupiedCargo } from "../../../Trading";
import type { MarketSignal } from "../../../types";
import { addButtonZone } from "../../ButtonZones";
import { drawButton, drawPanel, drawText, isPointInRect } from "../../CanvasPrimitives";
import { createPanelChrome, drawFooterHint, drawHeaderActions, drawPanelHeader } from "../../PanelChrome";
import type { RenderContext } from "../../RenderContext";
import type { RenderState } from "../../types";

export function renderTrade(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const bounds = getScreenPanelBounds({ width: rc.width, height: rc.height }, "market");
  const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
  drawPanel(rc, panelX, panelY, panelW, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW, panelH);

  const cargoUsed = getTotalOccupiedCargo(state.player);
  const shipStats = getPlayerShipStats(state.player);
  const missionCargo = state.player.missionCargoUnits ?? 0;
  const cargoLabel = missionCargo > 0
    ? `${cargoUsed}/${state.player.cargoCapacity} (${missionCargo} Mission)`
    : `${cargoUsed}/${state.player.cargoCapacity}`;

  const summaryText = rc.narrow
    ? `${Math.round(state.player.balance)} BAL · ${cargoLabel} · FUEL ${state.player.fuel.toFixed(1)}/${shipStats.fuelCapacity.toFixed(1)}`
    : `BALANCE: ${Math.round(state.player.balance)} BAL · CARGO: ${cargoLabel} · FUEL: ${state.player.fuel.toFixed(1)}/${shipStats.fuelCapacity.toFixed(1)}`;
  drawPanelHeader(rc, chrome, "STATION MARKET", summaryText, "BUY / SELL / FUEL");
  drawHeaderActions(rc, chrome, [{ id: "help", label: "HELP [?]", width: rc.narrow ? 76 : 94 }]);

  const top = chrome.contentBounds.y + (rc.narrow ? 22 : 32);
  const rowH = rc.narrow ? 30 : 32;
  const rowGap = rc.narrow ? 32 : 36;
  const rowW = panelW - 16;
  const rowLeft = panelX + 8;
  const headerColor = THEME.colors.accentPink;
  const headerFont = THEME.fonts.mono;

  if (rc.narrow) {
    // Compact rows use two lines so BUY, SELL, signal, held, and P/L fit at 390px.
    const colName = rowLeft + 8;
    const colTrade = rowLeft + rowW * 0.49;
    const colHeld = rowLeft + rowW * 0.72;
    const colPL = rowLeft + rowW - 8;
    drawText(rc, "ITEM", colName, top - 16, { color: headerColor, font: headerFont, size: 9 });
    drawText(rc, "BUY/SELL", colTrade, top - 16, { align: "right", color: headerColor, font: headerFont, size: 9 });
    drawText(rc, "HELD", colHeld, top - 16, { align: "right", color: headerColor, font: headerFont, size: 9 });
    drawText(rc, "P/L", colPL, top - 16, { align: "right", color: headerColor, font: headerFont, size: 9 });

    state.market.forEach((item, index) => {
      const y = top + index * rowGap;
      const rowY = y - 14;
      const hovered = isPointInRect(state.mousePosition, rowLeft, rowY, rowW, rowH);
      if (hovered) {
        ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(rowLeft, rowY, rowW, rowH, 4);
        ctx.fill();
      }
      addButtonZone(rc.buttonZones, { id: `trade-row-${index}`, label: item.name, x: rowLeft, y: rowY, width: rowW, height: rowH });

      const display = getMarketRowDisplay(state.player, item);
      const prevPrice = state.previousPrices[item.id];
      const trend = getPriceTrend(prevPrice, display.buyPrice);
      const priceColor = trend.label === "rising" ? THEME.colors.danger : trend.label === "falling" ? THEME.colors.success : THEME.colors.textPrimary;
      const arrow = trend.label === "rising" ? "↑" : trend.label === "falling" ? "↓" : " ";
      const plText = display.profitLossText === "Basis unknown"
        ? "?"
        : display.profitLossText.replace(" BAL / ", "/");

      drawText(rc, item.name.toUpperCase(), colName, y, { size: 12, font: THEME.fonts.accent, color: THEME.colors.textPrimary });
      drawText(rc, `${arrow}${display.buyPrice}/${display.sellPrice}`, colTrade, y, { align: "right", size: SIGNAL_GLASS_TEXT_SIZES.marketRow, font: THEME.fonts.mono, color: priceColor });
      drawText(rc, `${display.held}`, colHeld, y, { align: "right", size: SIGNAL_GLASS_TEXT_SIZES.marketRow, font: THEME.fonts.mono, color: THEME.colors.accentAmber });
      drawText(rc, plText, colPL, y, { align: "right", size: SIGNAL_GLASS_TEXT_SIZES.marketRow, font: THEME.fonts.mono, color: profitLossColor(display.profitLossTone) });
      drawText(rc, `${display.signalShort} · STOCK ${display.quantity}`, colName, y + 13, { size: 9, font: THEME.fonts.mono, color: THEME.colors.textDim });
    });

    drawButton(rc, "trade-fuel", "BUY FUEL [F]", chrome.footerPrimaryActionRow.x, chrome.footerPrimaryActionRow.y, chrome.footerPrimaryActionRow.width, chrome.footerPrimaryActionRow.height);
    drawFooterHint(rc, chrome, "TAP BUY · LONG-TAP SELL · F REFUEL · ESC BACK");
  } else {
    const left = panelX + 16;
    const wideRowW = panelW - 32;
    const headerSize = 10;
    // Numeric column right-edge anchors — all values in a column share the same x.
    const cBuyR = left + Math.round(wideRowW * 0.29);
    const cSellR = left + Math.round(wideRowW * 0.40);
    const cSignalR = left + Math.round(wideRowW * 0.54);
    const cSupplyR = left + Math.round(wideRowW * 0.66);
    const cHeldR = left + Math.round(wideRowW * 0.77);
    const cPLR = left + wideRowW;

    drawText(rc, "ID", left, top - 28, { color: headerColor, font: headerFont, size: headerSize });
    drawText(rc, "COMMODITY", left + 32, top - 28, { color: headerColor, font: headerFont, size: headerSize });
    drawText(rc, "BUY", cBuyR, top - 28, { align: "right", color: headerColor, font: headerFont, size: headerSize });
    drawText(rc, "SELL", cSellR, top - 28, { align: "right", color: headerColor, font: headerFont, size: headerSize });
    drawText(rc, "SIGNAL", cSignalR, top - 28, { align: "right", color: headerColor, font: headerFont, size: headerSize });
    drawText(rc, "SUPPLY", cSupplyR, top - 28, { align: "right", color: headerColor, font: headerFont, size: headerSize });
    drawText(rc, "HELD", cHeldR, top - 28, { align: "right", color: headerColor, font: headerFont, size: headerSize });
    drawText(rc, "P/L", cPLR, top - 28, { align: "right", color: headerColor, font: headerFont, size: headerSize });

    // Subtle header separator
    ctx.strokeStyle = "rgba(0, 242, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(left, top - 10);
    ctx.lineTo(left + wideRowW, top - 10);
    ctx.stroke();

    state.market.forEach((item, index) => {
      const y = top + index * 36;
      const rowY = y - 16;
      const hovered = isPointInRect(state.mousePosition, left, rowY, wideRowW, 32);

      if (hovered) {
        ctx.fillStyle = "rgba(0, 242, 255, 0.08)";
        ctx.beginPath();
        ctx.roundRect(left - 8, rowY, wideRowW + 16, 32, 4);
        ctx.fill();
      }

      addButtonZone(rc.buttonZones, { id: `trade-row-${index}`, label: item.name, x: left, y: rowY, width: wideRowW, height: 32 });

      const display = getMarketRowDisplay(state.player, item);
      const prevPrice = state.previousPrices[item.id];
      const trend = getPriceTrend(prevPrice, display.buyPrice);
      const trendColor = trend.label === "rising" ? THEME.colors.danger : trend.label === "falling" ? THEME.colors.success : THEME.colors.textDim;
      const buyTrendText = trend.label === "unknown" || trend.label === "stable"
        ? "—"
        : `${trend.symbol}${trend.delta > 0 ? "+" : ""}${trend.delta}%`;

      const rowFont = THEME.fonts.mono;
      const rowSize = 13;

      drawText(rc, `${index + 1}`, left, y, { size: rowSize, font: rowFont, color: THEME.colors.textDim });
      drawText(rc, item.name.toUpperCase(), left + 32, y, { size: rowSize, font: THEME.fonts.accent, color: THEME.colors.textPrimary });
      drawText(rc, `${display.buyPrice} ${buyTrendText}`, cBuyR, y, { align: "right", size: rowSize, font: rowFont, color: trendColor });
      drawText(rc, `${display.sellPrice}`, cSellR, y, { align: "right", size: rowSize, font: rowFont });
      drawText(rc, display.signal, cSignalR, y, { align: "right", size: 12, font: rowFont, color: marketSignalColor(display.signal) });
      drawText(rc, `${display.quantity}`, cSupplyR, y, { align: "right", size: rowSize, font: rowFont });
      drawText(rc, `${display.held}`, cHeldR, y, { align: "right", size: rowSize, font: rowFont, color: THEME.colors.accentAmber });
      drawText(rc, display.profitLossText, cPLR, y, { align: "right", size: rowSize, font: rowFont, color: profitLossColor(display.profitLossTone) });

      // Row separator
      if (index < state.market.length - 1) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(left, rowY + 32);
        ctx.lineTo(left + wideRowW, rowY + 32);
        ctx.stroke();
      }
    });

    drawButton(rc, "trade-fuel", "BUY FUEL [F]", chrome.footerPrimaryActionRow.x, chrome.footerPrimaryActionRow.y, Math.min(180, chrome.footerPrimaryActionRow.width), chrome.footerPrimaryActionRow.height);
    drawFooterHint(rc, chrome, "CLICK BUY · SHIFT+CLICK SELL · ALT+CLICK MAX · F REFUEL · ESC BACK");
  }
}

function profitLossColor(tone: "success" | "danger" | "neutral"): string {
  if (tone === "success") return THEME.colors.success;
  if (tone === "danger") return THEME.colors.danger;
  return THEME.colors.textDim;
}

function marketSignalColor(signal: MarketSignal): string {
  if (signal === "SURPLUS") return THEME.colors.success;
  if (signal === "SHORTAGE") return THEME.colors.danger;
  if (signal === "DEMAND") return THEME.colors.accentAmber;
  return THEME.colors.textDim;
}
