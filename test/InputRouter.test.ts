import { describe, expect, it } from "vitest";
import { normalizeMapAction, normalizeMarketAction } from "../src/game/InputRouter";

describe("InputRouter", () => {
  it("normalizes fuel purchase shortcuts across keyboard layouts", () => {
    expect(normalizeMarketAction({ code: "Equal", key: "+" })).toEqual({ type: "buyFuel" });
    expect(normalizeMarketAction({ code: "KeyX", key: "+" })).toEqual({ type: "buyFuel" });
    expect(normalizeMarketAction({ code: "NumpadAdd", key: "+" })).toEqual({ type: "buyFuel" });
    expect(normalizeMarketAction({ code: "KeyF", key: "f" })).toEqual({ type: "buyFuel" });
  });

  it("normalizes commodity buy and sell actions", () => {
    expect(normalizeMarketAction({ code: "Digit3", key: "3" })).toEqual({ type: "buyCommodity", index: 2 });
    expect(normalizeMarketAction({ code: "Digit3", key: "3", shiftKey: true })).toEqual({
      type: "sellCommodity",
      index: 2
    });
  });

  it("normalizes map navigation alternatives", () => {
    expect(normalizeMapAction({ code: "KeyA", key: "a" })).toBe("previous");
    expect(normalizeMapAction({ code: "ArrowLeft", key: "ArrowLeft" })).toBe("previous");
    expect(normalizeMapAction({ code: "Comma", key: "," })).toBe("previous");
    expect(normalizeMapAction({ code: "BracketLeft", key: "[" })).toBe("previous");
    expect(normalizeMapAction({ code: "KeyD", key: "d" })).toBe("next");
    expect(normalizeMapAction({ code: "ArrowRight", key: "ArrowRight" })).toBe("next");
    expect(normalizeMapAction({ code: "Period", key: "." })).toBe("next");
    expect(normalizeMapAction({ code: "BracketRight", key: "]" })).toBe("next");
    expect(normalizeMapAction({ code: "Enter", key: "Enter" })).toBe("jump");
    expect(normalizeMapAction({ code: "Escape", key: "Escape" })).toBe("return");
  });
});
