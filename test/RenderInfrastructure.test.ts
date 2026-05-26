import { describe, expect, it } from "vitest";

import { createButtonZoneCollector } from "../src/game/render/ButtonZones";
import { drawButton, drawText, wrapText } from "../src/game/render/CanvasPrimitives";
import { createPanelChrome, drawHeaderActions, drawPanelHeader, drawPrimaryButton, rowTextY } from "../src/game/render/PanelChrome";
import { createRenderContext, updateRenderContext, type RenderContext } from "../src/game/render/RenderContext";
import { getCompactTouchControlRects, isModalPanelMode } from "../src/game/render/RendererLayout";
import { createRenderTrace, recordDrawnText, type RenderTrace } from "../src/game/render/Traces";

function createStubContext(trace = createRenderTrace()): { ctx: CanvasRenderingContext2D; trace: RenderTrace } {
  const ctx = {
    font: "",
    textAlign: "left" as CanvasTextAlign,
    textBaseline: "middle" as CanvasTextBaseline,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt" as CanvasLineCap,
    lineJoin: "miter" as CanvasLineJoin,
    shadowBlur: 0,
    shadowColor: "",
    globalAlpha: 1,
    beginPath() {},
    roundRect() {},
    fill() {},
    stroke() {},
    fillRect() {},
    moveTo() {},
    lineTo() {},
    save() {},
    restore() {},
    fillText(text: string, x: number, y: number) {
      recordDrawnText(trace, {
        text,
        x,
        y,
        font: ctx.font,
        align: ctx.textAlign,
        color: String(ctx.fillStyle)
      });
    },
    measureText(text: string) {
      return { width: text.length * 6 } as TextMetrics;
    }
  } as unknown as CanvasRenderingContext2D;
  return { ctx, trace };
}

function createContext(): { renderContext: RenderContext; trace: RenderTrace } {
  const collector = createButtonZoneCollector();
  const { ctx, trace } = createStubContext();
  const renderContext = createRenderContext(ctx, collector);
  updateRenderContext(renderContext, {
    width: 390,
    height: 844,
    narrow: true,
    signalGlassUi: false,
    reducedMotion: false,
    currentMousePosition: null
  });
  return { renderContext, trace };
}

describe("render context and button-zone collectors", () => {
  it("keeps render state outside Renderer and resets collected zones", () => {
    const { renderContext } = createContext();

    renderContext.buttonZones.add({ id: "one", label: "ONE", x: 1, y: 2, width: 3, height: 4 });
    expect(renderContext.buttonZones.zones).toEqual([
      { id: "one", label: "ONE", x: 1, y: 2, width: 3, height: 4 }
    ]);

    updateRenderContext(renderContext, {
      width: 1280,
      height: 800,
      narrow: false,
      signalGlassUi: true,
      reducedMotion: true,
      currentMousePosition: { x: 20, y: 30 }
    });
    expect(renderContext.width).toBe(1280);
    expect(renderContext.signalGlassUi).toBe(true);
    expect(renderContext.currentMousePosition).toEqual({ x: 20, y: 30 });

    renderContext.buttonZones.reset();
    expect(renderContext.buttonZones.zones).toEqual([]);
  });
});

describe("canvas primitives", () => {
  it("draws text and buttons while preserving zone ids and geometry", () => {
    const { renderContext, trace } = createContext();

    drawText(renderContext, "LABEL", 12, 24, { align: "center", size: 11 });
    drawButton(renderContext, "action", "ACTION", 10, 20, 100, 32);

    expect(trace.texts.map((entry) => entry.text)).toEqual(["LABEL", "ACTION"]);
    expect(renderContext.buttonZones.zones).toEqual([
      { id: "action", label: "ACTION", x: 10, y: 20, width: 100, height: 32 }
    ]);
  });

  it("wraps text without changing word order", () => {
    const { ctx } = createStubContext();

    expect(wrapText(ctx, "ALPHA BETA GAMMA", 42)).toEqual(["ALPHA", "BETA", "GAMMA"]);
  });
});

describe("panel chrome infrastructure", () => {
  it("draws shared panel headers and action zones through the render context", () => {
    const { renderContext, trace } = createContext();
    const chrome = createPanelChrome(renderContext, 8, 12, 374, 808);

    expect(rowTextY(chrome.titleRow)).toBe(chrome.titleRow.y + chrome.titleRow.height / 2 + 4);

    drawPanelHeader(renderContext, chrome, "TITLE", "SUBTITLE", "CONTEXT");
    expect(trace.texts.map((entry) => entry.text)).toEqual(["TITLE", "SUBTITLE", "CONTEXT"]);

    drawHeaderActions(renderContext, chrome, [
      { id: "help", label: "HELP", width: 66 },
      { id: "close", label: "CLOSE", width: 66 }
    ]);
    drawPrimaryButton(renderContext, "primary", "PRIMARY", 24, 700, 120, 34);

    expect(renderContext.buttonZones.zones.map((zone) => zone.id)).toEqual(["close", "help", "primary"]);
  });
});

describe("renderer layout seam", () => {
  it("exports compact touch geometry and modal classification without Renderer", () => {
    const rects = getCompactTouchControlRects(390, 844, true);

    expect(rects.map((rect) => rect.id)).toEqual([
      "touch-map",
      "touch-dock",
      "touch-trade",
      "touch-menu",
      "touch-up",
      "touch-left",
      "touch-right",
      "touch-down",
      "touch-throttle-up",
      "touch-throttle-down",
      "touch-fire"
    ]);
    expect(isModalPanelMode("trade")).toBe(true);
    expect(isModalPanelMode("flight")).toBe(false);
  });
});
