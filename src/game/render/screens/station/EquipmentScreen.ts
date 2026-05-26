import { isEquipmentAvailableAtStation } from "../../../Equipment";
import { getScreenPanelBounds } from "../../../Layout";
import { classifyEquipment, getEquipmentAffordability, getEquipmentDisplayOrder } from "../../../SignalGlassScreens";
import { getStationProfile } from "../../../StationServices";
import { SIGNAL_GLASS_TEXT_SIZES, SIGNAL_GLASS_THEME, THEME } from "../../../Theme";
import { calcRepairCost } from "../../../Trading";
import { addButtonZone } from "../../ButtonZones";
import { drawButton, drawChip, drawPanel, drawProgressBar, drawText, isPointInRect, wrapText } from "../../CanvasPrimitives";
import { createPanelChrome, drawFooterHint, drawHeaderActions, drawPanelHeader, rowTextY } from "../../PanelChrome";
import type { RenderContext } from "../../RenderContext";
import type { RenderState } from "../../types";

const HELP_HOVER_FILL = "rgba(108, 227, 214, 0.08)";

export function renderEquipment(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const bounds = getScreenPanelBounds({ width: rc.width, height: rc.height }, "equipment");
  const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
  drawPanel(rc, panelX, panelY, panelW, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW, panelH);

  const profile = getStationProfile(state.systems[state.player.currentSystemId]);
  const sections = classifyEquipment(state.player, profile);
  const equipmentVendorLabel = profile.services.equipment
    ? `INSTALLED ${sections.installed.length} / AVAILABLE ${sections.available.length} / UNAVAILABLE ${sections.unavailable.length}`
    : "HULL REPAIR ACTIVE / EQUIPMENT VENDOR OFFLINE";
  drawPanelHeader(rc, chrome, "EQUIPMENT BAY", equipmentVendorLabel, `${profile.label.toUpperCase()} · MAINTENANCE`);
  drawHeaderActions(rc, chrome, [{ id: "help", label: "HELP [?]", width: rc.narrow ? 76 : 94 }]);

  // Build ordered list (installed → available → unavailable) then apply category filter.
  const orderedEquipment = getEquipmentDisplayOrder(state.player, profile);
  const filteredEquipment = state.equipmentCategoryFilter === "all"
    ? orderedEquipment
    : orderedEquipment.filter((e) => e.category === state.equipmentCategoryFilter);

  const rowH = rc.narrow ? 44 : 48;
  const rowSpacing = rc.narrow ? 52 : 48;
  const pageSize = Math.max(4, Math.floor(chrome.contentBounds.height / rowSpacing));
  const pageCount = Math.max(1, Math.ceil(filteredEquipment.length / pageSize));
  const page = Math.max(0, Math.min(state.equipmentPage, pageCount - 1));
  const visibleEquipment = filteredEquipment.slice(page * pageSize, page * pageSize + pageSize);

  const left = rc.narrow ? panelX + 12 : rc.width * 0.14;
  const top = chrome.contentBounds.y + (rc.narrow ? 22 : 34);
  const rowW = rc.narrow ? panelW - 24 : rc.width * 0.72;

  visibleEquipment.forEach((item, index) => {
    const installed = state.player.equipment[item.id];
    const stocked = isEquipmentAvailableAtStation(item, profile);
    const unavailable = !installed && !stocked;
    const y = top + index * rowSpacing;
    const rowY = y - 20;
    const hovered = isPointInRect(state.mousePosition, left, rowY, rowW, rowH);

    if (unavailable) ctx.save();
    if (unavailable) ctx.globalAlpha = 0.6;

    if (hovered && !installed && stocked) {
      ctx.fillStyle = HELP_HOVER_FILL;
      ctx.beginPath();
      ctx.roundRect(left - 8, rowY, rowW + 16, rowH, 4);
      ctx.fill();
    }

    addButtonZone(rc.buttonZones, { id: `equip-row-${index}`, label: item.name, x: left, y: rowY, width: rowW, height: rowH });
    drawText(rc, `${index + 1 + page * pageSize}`, left, y, { color: THEME.colors.textDim, font: THEME.fonts.mono, size: 12 });
    const nameSize = rc.narrow ? 12 : 14;
    drawText(rc, item.name.toUpperCase(), left + 22, y, {
      color: installed ? THEME.colors.accentTeal : THEME.colors.textPrimary, font: THEME.fonts.accent, size: nameSize
    });

    // Status chip
    const status = installed ? "INSTALLED" : !stocked ? "UNAVAILABLE" : getEquipmentAffordability(state.player, item).toUpperCase();
    const chipToken = installed
      ? THEME.colors.success
      : !stocked
        ? SIGNAL_GLASS_THEME.colors.disabled
        : SIGNAL_GLASS_THEME.colors.accent2;

    if (rc.narrow) {
      // Chip right-aligned; description on a second row.
      drawChip(rc, left + rowW - 8, y, status, chipToken, true);
      ctx.font = `${SIGNAL_GLASS_TEXT_SIZES.equipmentRow}px ${THEME.fonts.primary}`;
      const descLines = wrapText(ctx, item.description, rowW - 24);
      if (descLines.length > 0) {
        drawText(rc, descLines[0], left + 22, y + 16, { size: SIGNAL_GLASS_TEXT_SIZES.equipmentRow, color: THEME.colors.textSecondary });
      }
    } else {
      drawChip(rc, left + 260, y, status, chipToken);
      drawText(rc, item.description, left + 400, y, { size: 11, color: THEME.colors.textSecondary });
    }

    if (unavailable) ctx.restore();
  });

  // Subtle separator above footer band
  ctx.strokeStyle = "rgba(0, 242, 255, 0.12)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(panelX + 8, chrome.footerRow.y);
  ctx.lineTo(panelX + panelW - 8, chrome.footerRow.y);
  ctx.stroke();

  const missing = state.player.maxHull - state.player.hull;

  if (missing === 0) {
    // Full hull — compact single-line affordance; no progress bar.
    const compactY = rowTextY(chrome.footerStatusRow);
    ctx.strokeStyle = SIGNAL_GLASS_THEME.colors.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chrome.footerStatusRow.x, chrome.footerStatusRow.y);
    ctx.lineTo(chrome.footerStatusRow.x + chrome.footerStatusRow.width, chrome.footerStatusRow.y);
    ctx.stroke();
    drawText(rc, "Hull fully operational · Repair available here", chrome.footerStatusRow.x, compactY, {
      size: rc.narrow ? 10 : 11,
      font: THEME.fonts.mono,
      color: SIGNAL_GLASS_THEME.colors.textMuted
    });
  } else {
    const hullFraction = state.player.hull / state.player.maxHull;
    const hullColor = hullFraction < 0.3 ? THEME.colors.danger : hullFraction < 0.6 ? THEME.colors.warning : THEME.colors.success;
    drawText(rc, "HULL REPAIR", chrome.footerStatusRow.x, rowTextY(chrome.footerStatusRow), {
      size: rc.narrow ? 10 : 11,
      font: THEME.fonts.mono,
      color: THEME.colors.textSecondary
    });
    const barX = chrome.footerStatusRow.x + (rc.narrow ? 86 : 104);
    const barW = rc.narrow ? 104 : 150;
    drawProgressBar(rc, barX, chrome.footerStatusRow.y + 5, barW, 12, hullFraction, hullColor);
    drawText(rc, `${Math.round(state.player.hull)}/${state.player.maxHull}`, barX + barW + 12, rowTextY(chrome.footerStatusRow), {
      size: rc.narrow ? 10 : 11,
      font: THEME.fonts.mono,
      color: hullColor
    });
    const repairCost = calcRepairCost(state.player, profile.repairCostModifier);
    const repairLabel = `REPAIR HULL (${repairCost} BAL) [H]`;
    drawButton(rc, "equip-repair", repairLabel, chrome.footerPrimaryActionRow.x, chrome.footerPrimaryActionRow.y, chrome.footerPrimaryActionRow.width, chrome.footerPrimaryActionRow.height);
  }

  const catLabel = `CAT: ${state.equipmentCategoryFilter.toUpperCase()}`;
  const ctrlY = chrome.footerSecondaryActionRow.y;
  const ctrlH = chrome.footerSecondaryActionRow.height;
  if (rc.narrow) {
    const gap = 6;
    const catW = Math.min(112, chrome.footerSecondaryActionRow.width * 0.36);
    const pageW = Math.min(64, (chrome.footerSecondaryActionRow.width - catW - gap * 2) / 2);
    drawButton(rc, "equip-category-cycle", catLabel, chrome.footerSecondaryActionRow.x, ctrlY, catW, ctrlH);
    if (page > 0) drawButton(rc, "equip-page-prev", "PREV", chrome.footerSecondaryActionRow.x + catW + gap, ctrlY, pageW, ctrlH);
    if (page < pageCount - 1) drawButton(rc, "equip-page-next", "NEXT", chrome.footerSecondaryActionRow.x + catW + gap + pageW + gap, ctrlY, pageW, ctrlH);
    drawText(rc, `PAGE ${page + 1}/${pageCount}`, chrome.footerSecondaryActionRow.x + chrome.footerSecondaryActionRow.width, rowTextY(chrome.footerSecondaryActionRow), {
      align: "right", color: THEME.colors.accentTeal, size: 10, font: THEME.fonts.mono
    });
  } else {
    drawText(rc, `PAGE ${page + 1} / ${pageCount} · ${profile.label.toUpperCase()}`, chrome.footerSecondaryActionRow.x, rowTextY(chrome.footerSecondaryActionRow), {
      color: THEME.colors.accentTeal, size: 11, font: THEME.fonts.mono
    });
    const right = chrome.footerSecondaryActionRow.x + chrome.footerSecondaryActionRow.width;
    if (page < pageCount - 1) drawButton(rc, "equip-page-next", "NEXT", right - 70, ctrlY, 70, ctrlH);
    if (page > 0) drawButton(rc, "equip-page-prev", "PREV", right - 148, ctrlY, 70, ctrlH);
    drawButton(rc, "equip-category-cycle", catLabel, right - 268, ctrlY, 112, ctrlH);
  }

  if (!rc.narrow) {
    drawFooterHint(rc, chrome, "CLICK ROW TO PURCHASE · N/P PAGES · H REPAIR (HERE) · ESC BACK");
  }
}
