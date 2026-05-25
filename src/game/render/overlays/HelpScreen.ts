import { HELP_CONTENT, searchHelpContent } from "../../HelpContent";
import { getScreenPanelBounds } from "../../Layout";
import type { RenderState } from "../../Renderer";
import { SIGNAL_GLASS_THEME, THEME } from "../../Theme";
import { addButtonZone } from "../ButtonZones";
import { drawButton, drawPanel, drawText, isPointInRect, wrapText } from "../CanvasPrimitives";
import { createPanelChrome, drawHeaderActions } from "../PanelChrome";
import type { RenderContext } from "../RenderContext";

const HELP_HOVER_FILL = "rgba(108, 227, 214, 0.08)";

export function renderHelp(rc: RenderContext, state: RenderState): void {
  const { ctx } = rc;
  const bounds = getScreenPanelBounds({ width: rc.width, height: rc.height }, "help");
  const { x: panelX, y: panelY, width: panelW, height: panelH } = bounds;
  drawPanel(rc, panelX, panelY, panelW, panelH);
  const chrome = createPanelChrome(rc, panelX, panelY, panelW, panelH);

  const titleSize = rc.narrow ? 18 : 28;
  const titleY = panelY + (rc.narrow ? 32 : 48);
  drawText(rc, "PILOT MANUAL", rc.width / 2, titleY, {
    align: "center", size: titleSize, color: THEME.colors.textPrimary, font: THEME.fonts.accent
  });
  drawHeaderActions(rc, chrome, [{ id: "help-close", label: rc.narrow ? "CLOSE" : "CLOSE [Esc]", width: rc.narrow ? 78 : 112 }]);

  const sidebarW = rc.narrow ? 110 : 220;
  const sidebarX = panelX + 12;
  const contentX = sidebarX + sidebarW + 16;
  const contentW = panelW - sidebarW - 40;
  const top = titleY + (rc.narrow ? 28 : 64);

  const sidebarRowH = rc.narrow ? 22 : 30;
  const sidebarFontSize = rc.narrow ? 9 : 12;
  const helpQuery = state.helpSearchQuery ?? "";
  const helpSections = searchHelpContent(helpQuery);
  const visibleSections = helpSections.length > 0 ? helpSections : HELP_CONTENT;

  if (rc.signalGlassUi && helpQuery) {
    const manualInput = typeof document !== "undefined"
      ? document.querySelector(".manual-search-input")
      : null;
    if (manualInput) {
      const inputRect = manualInput.getBoundingClientRect();
      const captionY = inputRect.bottom + 14;
      drawText(rc, `${helpSections.length} RESULTS`, inputRect.left, captionY, {
        color: SIGNAL_GLASS_THEME.colors.textMuted, size: 11, font: THEME.fonts.mono
      });
    }
  }

  visibleSections.forEach((section, index) => {
    const y = top + index * sidebarRowH;
    const selected = section.id === state.helpSectionId;
    const rowY = y - sidebarRowH / 2;

    if (selected || isPointInRect(state.mousePosition, sidebarX, rowY, sidebarW, sidebarRowH)) {
      ctx.fillStyle = selected ? "rgba(108, 227, 214, 0.12)" : HELP_HOVER_FILL;
      ctx.beginPath();
      ctx.roundRect(sidebarX - 4, rowY, sidebarW, sidebarRowH, 4);
      ctx.fill();
      if (selected) {
        ctx.fillStyle = SIGNAL_GLASS_THEME.colors.accent;
        ctx.fillRect(sidebarX - 4, rowY, 3, sidebarRowH);
      }
    }

    addButtonZone(rc.buttonZones, { id: `help-sidebar-${section.id}`, label: section.title, x: sidebarX, y: rowY, width: sidebarW, height: sidebarRowH });
    drawText(rc, section.title.toUpperCase(), sidebarX + 8, y + 4, {
      color: selected ? SIGNAL_GLASS_THEME.colors.accent : THEME.colors.textPrimary,
      size: sidebarFontSize,
      font: THEME.fonts.accent
    });
  });

  const activeSection = HELP_CONTENT.find((s) => s.id === state.helpSectionId) ?? visibleSections[0] ?? HELP_CONTENT[0];
  const activePage = activeSection.pages[state.helpPageIndex] ?? activeSection.pages[0];

  drawText(rc, activeSection.title.toUpperCase(), contentX, top, {
    color: THEME.colors.accentTeal, size: rc.narrow ? 14 : 20, font: THEME.fonts.accent
  });

  drawText(rc, activePage.heading.toUpperCase(), contentX, top + (rc.narrow ? 24 : 36), {
    color: THEME.colors.textPrimary, size: rc.narrow ? 12 : 16, font: THEME.fonts.accent
  });

  let bodyY = top + (rc.narrow ? 48 : 72);
  const bodySize = rc.narrow ? 10 : 13;
  const bodyGap = rc.narrow ? 14 : 20;
  ctx.font = `${bodySize}px ${THEME.fonts.primary}`;
  activePage.body.forEach((line) => {
    const lines = wrapText(ctx, line, contentW);
    lines.forEach((l) => {
      drawText(rc, l, contentX, bodyY, { size: bodySize, color: THEME.colors.textPrimary });
      bodyY += bodyGap;
    });
    bodyY += 6;
  });

  if (activePage.tips && activePage.tips.length > 0) {
    bodyY += 8;
    drawText(rc, "PRO TIPS:", contentX, bodyY, { color: THEME.colors.accentAmber, size: rc.narrow ? 10 : 12, font: THEME.fonts.accent });
    bodyY += (rc.narrow ? 18 : 24);
    activePage.tips.forEach((tip) => {
      const lines = wrapText(ctx, `· ${tip}`, contentW);
      lines.forEach((l) => {
        drawText(rc, l, contentX, bodyY, { size: rc.narrow ? 10 : 12, color: THEME.colors.accentAmber });
        bodyY += (rc.narrow ? 14 : 18);
      });
    });
  }

  const navY = panelY + panelH - 74;
  const btnW = rc.narrow ? 70 : 120;
  const btnH = 30;
  if (state.helpPageIndex > 0) {
    drawButton(rc, "help-page-prev", "PREV", contentX, navY, btnW, btnH);
  }
  if (state.helpPageIndex < activeSection.pages.length - 1) {
    drawButton(rc, "help-page-next", "NEXT", contentX + contentW - btnW, navY, btnW, btnH);
  }

  drawText(rc, `PAGE ${state.helpPageIndex + 1} / ${activeSection.pages.length}`, contentX + contentW / 2, navY + 20, {
    align: "center", size: 10, font: THEME.fonts.mono, color: THEME.colors.textDim
  });

  drawButton(rc, "help-close", "CLOSE [Esc]", rc.width / 2 - 75, panelY + panelH - 34, 150, 28);
}
