import { THEME } from "../../Theme";
import type { RenderState } from "../../Renderer";
import { drawButton, drawCenteredTitle, drawText } from "../CanvasPrimitives";
import type { RenderContext } from "../RenderContext";

export function renderControls(rc: RenderContext, state: RenderState): void {
  void state;
  drawCenteredTitle(rc, "OPERATIONAL CONTROLS", rc.narrow ? 56 : 68);
  const flightLines = [
    "ARROW KEYS — PITCH AND YAW",
    "Q / E — ROLL LEFT / RIGHT",
    "W / S — THROTTLE UP / DOWN",
    "SPACE — FIRE LASER (FLIGHT)",
    "D — DOCK / LAUNCH (NEAR STATION)",
    "M — TOGGLE UNIVERSE MAP",
    "ENTER — ENGAGE JUMP (MAP)",
    "ESCAPE — PAUSE / BACK"
  ];
  const stationLines = [
    "T — STATION MARKET (DOCKED)",
    "E — EQUIPMENT BAY (DOCKED)",
    "Y — SHIPYARD (DOCKED)",
    "R — MISSION BOARD (DOCKED)",
    "F — BUY FUEL (MARKET ONLY)",
    "H — REPAIR HULL (EQUIPMENT BAY)",
    "G — TOGGLE PHOSPHOR GLOW",
    "U — GLOBAL AUDIO MUTE",
    "A/D / ←/→ — MAP SELECTION (MAP)"
  ];

  if (rc.narrow) {
    // Single-column compact list with section headings so all entries fit
    // without clipping on a 390-wide viewport.
    const top = 96;
    const gap = 18;
    const left = 20;
    const fontSize = 11;
    drawText(rc, "FLIGHT", left, top, { color: THEME.colors.accentTeal, font: THEME.fonts.accent, size: 12 });
    flightLines.forEach((line, i) => drawText(rc, line, left, top + 18 + i * gap, {
      align: "left", size: fontSize, font: THEME.fonts.mono, color: THEME.colors.textPrimary
    }));
    const second = top + 18 + flightLines.length * gap + 14;
    drawText(rc, "DOCKED / SCREENS", left, second, { color: THEME.colors.accentTeal, font: THEME.fonts.accent, size: 12 });
    stationLines.forEach((line, i) => drawText(rc, line, left, second + 18 + i * gap, {
      align: "left", size: fontSize, font: THEME.fonts.mono, color: THEME.colors.textPrimary
    }));
    const noteY = second + 18 + stationLines.length * gap + 12;
    drawText(rc, "ON-SCREEN TOUCH CONTROLS APPEAR IN FLIGHT", rc.width / 2, noteY, {
      align: "center", color: THEME.colors.accentTeal, size: 10, font: THEME.fonts.accent
    });
    drawButton(rc, "back", "BACK [Esc]", rc.width / 2 - 90, rc.height - 60, 180, 40);
    return;
  }

  const col1 = rc.width * 0.22;
  const col2 = rc.width * 0.6;
  const top = 120;
  const gap = 28;
  flightLines.forEach((line, i) => drawText(rc, line, col1, top + i * gap, {
    align: "left", size: 13, font: THEME.fonts.mono, color: THEME.colors.textPrimary
  }));
  stationLines.forEach((line, i) => drawText(rc, line, col2, top + i * gap, {
    align: "left", size: 13, font: THEME.fonts.mono, color: THEME.colors.textPrimary
  }));

  drawText(rc, "TOUCH INTERFACE: ON-SCREEN ADAPTIVE CONTROLS AVAILABLE IN FLIGHT",
    rc.width / 2, top + Math.max(flightLines.length, stationLines.length) * gap + 24, {
      align: "center", color: THEME.colors.accentTeal, size: 12, font: THEME.fonts.accent
    });

  drawButton(rc, "back", "RETURN TO MISSION CONTROL [Esc]", rc.width / 2 - 180, rc.height - 96, 360, 44);
}
