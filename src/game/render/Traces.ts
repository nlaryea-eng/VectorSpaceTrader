export interface DrawnTextTrace {
  text: string;
  x: number;
  y: number;
  font: string;
  align: CanvasTextAlign;
  color: string;
}

export interface ClipTrace {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderTrace {
  texts: DrawnTextTrace[];
  clips: ClipTrace[];
}

export function createRenderTrace(): RenderTrace {
  return { texts: [], clips: [] };
}

export function recordDrawnText(trace: RenderTrace, entry: DrawnTextTrace): void {
  trace.texts.push(entry);
}

export function recordClip(trace: RenderTrace, entry: ClipTrace): void {
  trace.clips.push(entry);
}
