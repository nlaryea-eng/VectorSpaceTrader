import { shouldPreventGameKey, type KeyLike } from "./InputRouter";

export class Input {
  private pressedCodes = new Set<string>();
  private pressedKeys = new Set<string>();
  private downEvents: KeyLike[] = [];
  private clickPoint: { x: number; y: number; shiftKey: boolean; ctrlKey: boolean; altKey: boolean } | null = null;
  private mousePosition: { x: number; y: number } | null = null;
  private readonly onKeyDown = (event: KeyboardEvent): void => {
    if (shouldPreventGameKey(event)) {
      event.preventDefault();
    }

    if (!this.isPressedEvent(event)) {
      this.downEvents.push({
        code: event.code,
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey
      });
    }

    if (event.code) this.pressedCodes.add(event.code);
    if (event.key) this.pressedKeys.add(event.key);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (shouldPreventGameKey(event)) {
      event.preventDefault();
    }

    if (event.code) this.pressedCodes.delete(event.code);
    if (event.key) this.pressedKeys.delete(event.key);
  };

  constructor(private readonly canvas: HTMLCanvasElement) {}

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    this.canvas.addEventListener("pointerdown", this.onPointerDown);
    this.canvas.addEventListener("pointermove", this.onPointerMove);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.canvas.removeEventListener("pointerdown", this.onPointerDown);
    this.canvas.removeEventListener("pointermove", this.onPointerMove);
  }

  isPressed(code: string): boolean {
    return this.pressedCodes.has(code);
  }

  isKeyPressed(key: string): boolean {
    return this.pressedKeys.has(key);
  }

  consume(code: string): boolean {
    const index = this.downEvents.findIndex((event) => event.code === code);
    if (index === -1) return false;
    this.downEvents.splice(index, 1);
    return true;
  }

  consumeAction<T>(normalize: (event: KeyLike) => T | null): T | null {
    const index = this.downEvents.findIndex((event) => normalize(event) !== null);
    if (index === -1) return null;

    const [event] = this.downEvents.splice(index, 1);
    return normalize(event);
  }

  consumeClick(): { x: number; y: number; shiftKey: boolean; ctrlKey: boolean; altKey: boolean } | null {
    const point = this.clickPoint;
    this.clickPoint = null;
    return point;
  }

  getMousePosition(): { x: number; y: number } | null {
    return this.mousePosition;
  }

  endFrame(): void {
    this.downEvents = [];
  }

  getFlightAxes(): { pitch: number; yaw: number; roll: number; throttle: number } {
    return {
      pitch: Number(this.isPressed("ArrowDown")) - Number(this.isPressed("ArrowUp")),
      yaw: Number(this.isPressed("ArrowRight")) - Number(this.isPressed("ArrowLeft")),
      roll: Number(this.isPressed("KeyE")) - Number(this.isPressed("KeyQ")),
      throttle: Number(this.isPressed("KeyW")) - Number(this.isPressed("KeyS"))
    };
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.clickPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      altKey: event.altKey
    };
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.mousePosition = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  private isPressedEvent(event: KeyboardEvent): boolean {
    return Boolean((event.code && this.pressedCodes.has(event.code)) || (event.key && this.pressedKeys.has(event.key)));
  }
}
