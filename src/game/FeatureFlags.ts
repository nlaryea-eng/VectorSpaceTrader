import { SIGNAL_GLASS_STORAGE_PREFIX } from "./Theme";

export const SIGNAL_GLASS_UI = true;
export const SIGNAL_GLASS_UI_STORAGE_KEY = `${SIGNAL_GLASS_STORAGE_PREFIX}.enabled`;

export function isSignalGlassUiEnabled(): boolean {
  if (!SIGNAL_GLASS_UI) return false;
  if (typeof window === "undefined") return SIGNAL_GLASS_UI;

  const params = new URLSearchParams(window.location?.search ?? "");
  const queryFlag = params.get("signalGlass");
  if (queryFlag === "0" || queryFlag === "false") return false;
  if (queryFlag === "1" || queryFlag === "true") return true;

  try {
    const stored = window.localStorage?.getItem(SIGNAL_GLASS_UI_STORAGE_KEY);
    if (stored === "0" || stored === "false") return false;
    if (stored === "1" || stored === "true") return true;
  } catch {
    return SIGNAL_GLASS_UI;
  }

  return SIGNAL_GLASS_UI;
}
