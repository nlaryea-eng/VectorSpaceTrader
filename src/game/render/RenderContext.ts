import type { ButtonZoneCollector } from "./ButtonZones";

export interface RenderPointer {
  x: number;
  y: number;
}

export interface RenderContext {
  readonly ctx: CanvasRenderingContext2D;
  readonly buttonZones: ButtonZoneCollector;
  width: number;
  height: number;
  narrow: boolean;
  signalGlassUi: boolean;
  reducedMotion: boolean;
  currentMousePosition: RenderPointer | null;
}

export interface RenderContextUpdate {
  width: number;
  height: number;
  narrow: boolean;
  signalGlassUi: boolean;
  reducedMotion: boolean;
  currentMousePosition: RenderPointer | null;
}

export function createRenderContext(ctx: CanvasRenderingContext2D, buttonZones: ButtonZoneCollector): RenderContext {
  return {
    ctx,
    buttonZones,
    width: 1,
    height: 1,
    narrow: false,
    signalGlassUi: false,
    reducedMotion: false,
    currentMousePosition: null
  };
}

export function updateRenderContext(renderContext: RenderContext, update: RenderContextUpdate): void {
  renderContext.width = update.width;
  renderContext.height = update.height;
  renderContext.narrow = update.narrow;
  renderContext.signalGlassUi = update.signalGlassUi;
  renderContext.reducedMotion = update.reducedMotion;
  renderContext.currentMousePosition = update.currentMousePosition;
}
