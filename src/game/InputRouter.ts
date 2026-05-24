export interface KeyLike {
  code?: string;
  key?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
}

export type MarketAction =
  | { type: "buyCommodity"; index: number }
  | { type: "sellCommodity"; index: number }
  | { type: "bulkBuyCommodity"; index: number }
  | { type: "bulkSellCommodity"; index: number }
  | { type: "buyFuel" };

export type MapAction = "previous" | "next" | "jump" | "return";

const DIGIT_CODES = new Map([
  ["Digit1", 0],
  ["Digit2", 1],
  ["Digit3", 2],
  ["Digit4", 3],
  ["Digit5", 4],
  ["Digit6", 5],
  ["Digit7", 6],
  ["Digit8", 7]
]);

export function normalizeMarketAction(event: KeyLike): MarketAction | null {
  const digitIndex = getDigitIndex(event);
  if (digitIndex !== null) {
    const isBulk = Boolean(event.ctrlKey || event.altKey);
    if (isBulk) {
      return event.shiftKey
        ? { type: "bulkSellCommodity", index: digitIndex }
        : { type: "bulkBuyCommodity", index: digitIndex };
    }
    return event.shiftKey ? { type: "sellCommodity", index: digitIndex } : { type: "buyCommodity", index: digitIndex };
  }

  if (matchesAny(event, ["Equal", "NumpadAdd", "KeyF"], ["+", "=", "f", "F"])) {
    return { type: "buyFuel" };
  }

  return null;
}

export function normalizeMapAction(event: KeyLike): MapAction | null {
  if (matchesAny(event, ["KeyA", "ArrowLeft", "Comma", "BracketLeft"], ["a", "A", "ArrowLeft", ",", "["])) {
    return "previous";
  }

  if (matchesAny(event, ["KeyD", "ArrowRight", "Period", "BracketRight"], ["d", "D", "ArrowRight", ".", "]"])) {
    return "next";
  }

  if (matchesAny(event, ["Enter"], ["Enter"])) {
    return "jump";
  }

  if (matchesAny(event, ["Escape"], ["Escape", "Esc"])) {
    return "return";
  }

  return null;
}

export function shouldPreventGameKey(event: KeyLike): boolean {
  if (normalizeMarketAction(event) || normalizeMapAction(event)) return true;

  return matchesAny(
    event,
    ["ArrowUp", "ArrowDown", "KeyQ", "KeyE", "KeyW", "KeyS", "KeyY", "KeyN", "KeyP", "Space", "KeyM", "KeyT", "KeyR", "KeyG", "KeyU", "Escape"],
    [" ", "Spacebar", "m", "M", "t", "T", "r", "R", "y", "Y", "n", "N", "p", "P", "g", "G", "u", "U", "q", "Q", "e", "E", "w", "W", "s", "S"]
  );
}

function getDigitIndex(event: KeyLike): number | null {
  if (event.code && DIGIT_CODES.has(event.code)) {
    return DIGIT_CODES.get(event.code) ?? null;
  }

  const key = event.key ?? "";
  if (/^[1-8]$/.test(key)) {
    return Number(key) - 1;
  }

  return null;
}

function matchesAny(event: KeyLike, codes: string[], keys: string[]): boolean {
  return Boolean((event.code && codes.includes(event.code)) || (event.key && keys.includes(event.key)));
}
