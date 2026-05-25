#!/usr/bin/env node
/**
 * Zero-dependency smoke runner for Vector Space Trader.
 *
 * Modes:
 *
 *   node scripts/smoke.mjs                   (default — STATIC smoke)
 *     - Reads `index.html` from disk.
 *     - Asserts: branding, no legacy alternate title text, icon link present,
 *       main entry script referenced, viewport meta exists.
 *     - Walks the production build in `dist/` if present and asserts the JS
 *       bundle is non-trivial.
 *     - Always works in any environment with no network or browser deps.
 *
 *   node scripts/smoke.mjs --browser         (BROWSER smoke; opt-in)
 *     - Builds (or set --skip-build / --dev), spawns vite, then connects
 *       headless Chrome via raw CDP (Node 22 built-in WebSocket — no deps).
 *     - Smokes: launch, new game, dock, station market, fuel shortcut path,
 *       map navigation keys, real save/reload continuation, and 390x844
 *       mobile viewport layout guards.
 *     - Saves screenshots to assessment/screenshots/.
 *     - Fails if no Chromium/Chrome binary is found.
 *
 * Wire-in:
 *   "smoke": "node scripts/smoke.mjs"
 *   "test:browser": "node scripts/smoke.mjs --browser"
 */

import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { request as httpRequest } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(__filename), "..");
const SCREENSHOTS_DIR = join(ROOT, "assessment", "screenshots");
const APP_SAVE_KEY = "vector-space-trader:v1";

const browserMode = process.argv.includes("--browser");
const useDev = process.argv.includes("--dev");
const skipBuild = process.argv.includes("--skip-build");

main().catch((err) => {
  console.error("\n[smoke] FAILED:", err && err.stack ? err.stack : err);
  process.exit(1);
});

async function main() {
  staticSmoke();
  if (browserMode) {
    await browserSmoke();
  } else {
    log("Static smoke passed. (Run with --browser to add live CDP browser smoke.)");
  }
}

function log(...args) { console.log("[smoke]", ...args); }

// --------------------------------------------------------------- STATIC --

function staticSmoke() {
  const indexHtml = readFileSync(join(ROOT, "index.html"), "utf8");
  assert(/Vector Space Trader/.test(indexHtml), "index.html missing 'Vector Space Trader' branding");
  assert(!/NEON\s+HORIZON|NEXT\s+HORIZON|PREMIER\s+SPACE\s+TRADING|EON\s+HORIZON/i.test(indexHtml),
    "Legacy branding regression found in index.html");
  assert(/<link\s+[^>]*rel=["']icon["']/i.test(indexHtml), "Missing <link rel='icon'> — favicon 404 will recur");
  assert(/<meta\s+name=["']viewport["']/i.test(indexHtml), "Missing viewport meta tag");
  assert(/src=["']\/src\/main\.ts["']/.test(indexHtml), "index.html does not reference /src/main.ts");
  log("STATIC: index.html branding, favicon, viewport, entry point — OK");

  // Production dist may or may not exist locally; if it does, walk it and
  // assert the main JS bundle is plausible.
  const distDir = join(ROOT, "dist");
  if (existsSync(distDir)) {
    const assetsDir = join(distDir, "assets");
    if (existsSync(assetsDir)) {
      const files = readdirSync(assetsDir);
      const jsFile = files.find((f) => f.endsWith(".js"));
      if (jsFile) {
        const size = statSync(join(assetsDir, jsFile)).size;
        assert(size > 1000, `Built JS bundle ${jsFile} is suspiciously small (${size} bytes)`);
        log(`STATIC: dist bundle ${jsFile} present (${(size/1024).toFixed(1)} KB)`);
      }
    }
  }

  // Source-level branding scan — protects against the regression that
  // motivated the assessment.
  const renderer = readFileSync(join(ROOT, "src", "game", "Renderer.ts"), "utf8");
  assert(/Vector Space Trader/.test(renderer), "Renderer.ts missing Vector Space Trader title");
  assert(!/NEON\s+HORIZON|NEXT\s+HORIZON|PREMIER\s+SPACE\s+TRADING|EON\s+HORIZON/i.test(renderer),
    "Legacy branding regression found in Renderer.ts");

  // Help-text accuracy: the always-on flight HUD must no longer hard-code
  // [T] Trade — it has to be derived from getModeShortcuts().
  assert(!/\[M\]\s*Map\s+\[D\]\s*Dock\s+\[T\]\s*Trade\s+\[Space\]\s*Fire/.test(renderer),
    "Renderer.ts still hard-codes generic flight HUD shortcut string — must be mode-derived");
  log("STATIC: source branding + help-text scan — OK");
}

function assert(cond, message) {
  if (!cond) throw new Error("Assertion failed: " + message);
}

function fetchText(url) {
  return new Promise((resolveFetch, rejectFetch) => {
    const req = httpRequest(url, { method: "GET" }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c) => { body += c; });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          rejectFetch(new Error(`GET ${url} → ${res.statusCode}`));
        } else {
          resolveFetch(body);
        }
      });
    });
    req.on("error", rejectFetch);
    req.end();
  });
}

async function waitForServer(child, baseUrl, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await fetchText(baseUrl + "/");
      return baseUrl;
    } catch {
      // not ready
    }
    if (child.exitCode !== null) throw new Error("vite exited early");
    await sleep(250);
  }
  throw new Error(`vite did not respond at ${baseUrl} within ${timeoutMs}ms`);
}

// -------------------------------------------------------- Chromium discovery

function findChrome() {
  if (process.env.CHROME && existsSync(process.env.CHROME)) return process.env.CHROME;
  const candidates = process.platform === "darwin"
    ? [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"
      ]
    : process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
        ]
      : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];

  for (const candidate of candidates) {
    if (candidate.includes("/") || candidate.includes("\\")) {
      if (existsSync(candidate)) return candidate;
    } else {
      const which = spawnSync("which", [candidate]);
      if (which.status === 0 && which.stdout.toString().trim()) {
        return which.stdout.toString().trim();
      }
    }
  }
  return null;
}

// -------------------------------------------------------------- BROWSER --

async function browserSmoke() {
  if (!skipBuild && !useDev) {
    log("Building production bundle…");
    const build = spawnSync("npx", ["vite", "build"], { cwd: ROOT, stdio: "inherit" });
    if (build.status !== 0) throw new Error("vite build failed");
  } else if (useDev) {
    log("Running against dev server (vite dev) per --dev.");
  } else {
    log("Skipping build (per --skip-build).");
  }

  const chromePath = findChrome();
  if (!chromePath) {
    throw new Error("Browser smoke requires Chrome/Chromium. Set CHROME=/path/to/browser if auto-discovery fails.");
  }

  const port = useDev ? "4174" : "4173";
  const args = useDev
    ? ["vite", "--port", port, "--strictPort", "--host", "127.0.0.1"]
    : ["vite", "preview", "--port", port, "--strictPort", "--host", "127.0.0.1"];
  const preview = spawn("npx", args, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  preview.stderr.on("data", (chunk) => process.stderr.write(`[vite] ${chunk}`));

  const baseUrl = await waitForServer(preview, `http://127.0.0.1:${port}`, 15_000);

  const userDataDir = join(tmpdir(), `vst-smoke-${Date.now()}`);
  mkdirSync(userDataDir, { recursive: true });
  const proc = spawn(chromePath, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--user-data-dir=${userDataDir}`,
    "--remote-debugging-port=0",
    "--window-size=1280,800",
    "about:blank"
  ], { stdio: ["ignore", "pipe", "pipe"] });

  const wsEndpoint = await new Promise((resolveEndpoint, rejectEndpoint) => {
    let buf = "";
    const timeout = setTimeout(() => rejectEndpoint(new Error("Timed out waiting for DevTools endpoint")), 15_000);
    proc.stderr.on("data", (chunk) => {
      buf += chunk.toString();
      const m = buf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) { clearTimeout(timeout); resolveEndpoint(m[1]); }
    });
    proc.on("exit", (code) => rejectEndpoint(new Error(`Chrome exited early (${code})`)));
  });

  try {
    mkdirSync(SCREENSHOTS_DIR, { recursive: true });
    const browser = await connectBrowser(wsEndpoint);

    const smokeUrl = withSmokeParam(baseUrl);

    const desktop = await browser.openTarget(smokeUrl);
    await desktop.setViewport(1280, 800);
    await desktop.navigate(smokeUrl);
    await desktop.waitForLoad();
    await desktop.eval("localStorage.clear()");
    await desktop.navigate(smokeUrl);
    await desktop.waitForLoad();
    await sleep(500);
    await assertPageReady(desktop, "desktop-start");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-start.png"), await desktop.screenshot());
    await assertButton(desktop, "new");

    await desktop.key("Slash"); await sleep(300);
    await assertMode(desktop, "help");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-help-main.png"), await desktop.screenshot());
    await desktop.key("Escape"); await sleep(300);
    await assertMode(desktop, "start");

    await desktop.key("Digit1"); await sleep(400);
    await assertMode(desktop, "flight");
    await assertRealSaveExists(desktop);
    await assertCanvasNonBlank(desktop, "desktop-flight");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-flight.png"), await desktop.screenshot());

    await desktop.key("Enter"); await sleep(150);
    await desktop.key("KeyD"); await sleep(1800);
    await assertMode(desktop, "docked");
    await assertButton(desktop, "touch-trade");
    await assertButton(desktop, "touch-missions");
    await assertButton(desktop, "touch-equipment");
    await assertButton(desktop, "touch-shipyard");
    await assertButton(desktop, "help");
    assert(!(await snapshot(desktop)).buttons.some((button) => button.id === "touch-repair"), "Standalone Repair tile should not render on Station Hub");

    await desktop.key("KeyT"); await sleep(300);
    await assertMode(desktop, "trade");
    await assertButton(desktop, "trade-row-0");
    await assertButton(desktop, "help");
    await desktop.key("KeyF");
    await sleep(200);
    assert((await snapshot(desktop)).message.length > 0, "Market fuel shortcut did not reach a handled result");

    await desktop.key("Escape"); await sleep(200);
    await assertMode(desktop, "docked");
    await desktop.key("KeyR"); await sleep(300);
    await assertMode(desktop, "missions");
    await assertButton(desktop, "mission-row-0");
    await assertButton(desktop, "help");

    await desktop.key("Escape"); await sleep(200);
    await assertMode(desktop, "docked");
    await desktop.key("KeyE"); await sleep(300);
    await assertMode(desktop, "equipment");
    await assertButton(desktop, "equip-category-cycle");
    await assertButton(desktop, "help");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-equipment.png"), await desktop.screenshot());

    await desktop.key("Escape"); await sleep(200);
    await assertMode(desktop, "docked");
    await desktop.key("KeyY"); await sleep(300);
    await assertMode(desktop, "shipyard");
    await assertButton(desktop, "ship-buy");
    await assertButton(desktop, "help");

    await desktop.key("Escape"); await sleep(200);
    await desktop.key("KeyM"); await sleep(300);
    await assertMode(desktop, "map");
    await assertButton(desktop, "help");
    await assertButton(desktop, "map-back");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-map.png"), await desktop.screenshot());
    // Blur auto-focused search input so keyboard navigation works
    await desktop.eval("document.querySelector('.map-search-input').blur()");
    await sleep(100);
    const beforeMap = (await snapshot(desktop)).selectedSystemId;
    await desktop.key("KeyD"); await sleep(150);
    const afterMap = (await snapshot(desktop)).selectedSystemId;
    assert(afterMap !== beforeMap, "Map selection key did not change selected system");

    await assertButton(desktop, "map-filter-systemClass");
    await desktop.eval("window.__VST_DEBUG__?.game['cycleMapFilter']('map-filter-systemClass')");
    await sleep(200);
    const stateWithClass = await snapshot(desktop);
    assert(stateWithClass.mapFilters.systemClass !== "all", "CLASS filter did not cycle from all");

    // Map search regression tests
    log("Checking map search functionality...");
    const inputHidden = await desktop.eval("document.querySelector('.map-search-input').hidden");
    assert(inputHidden === false, "Map search input should be visible in map mode");

    await desktop.eval("const input = document.querySelector('.map-search-input'); input.focus(); input.value = 'Ara'; input.dispatchEvent(new Event('input'))");
    await sleep(200);
    const stateWithSearch = await snapshot(desktop);
    assert(stateWithSearch.mapFilters.query === 'Ara', "Map search input did not update filters");
    assert(stateWithSearch.mapFilters.systemClass === stateWithClass.mapFilters.systemClass, "CLASS filter changed unexpectedly during search");

    // Test that Slash in input doesn't open help
    await desktop.key("Slash"); await sleep(200);
    await assertMode(desktop, "map");
    assert((await snapshot(desktop)).mapFilters.query === 'Ara', "Map search query should remain after Slash type (if handled correctly)");

    // Test Help preservation
    await desktop.eval("document.activeElement.blur()");
    await sleep(100);
    await desktop.key("Slash"); await sleep(300);
    await assertMode(desktop, "help");
    const inputHiddenInHelp = await desktop.eval("document.querySelector('.map-search-input').hidden");
    assert(inputHiddenInHelp === true, "Map search input should be hidden in help mode");
    const manualInputVisible = await desktop.eval("document.querySelector('.manual-search-input').hidden === false");
    assert(manualInputVisible, "Manual search input should be visible in help mode");
    await desktop.eval("const input = document.querySelector('.manual-search-input'); input.focus(); input.value = 'fuel'; input.dispatchEvent(new Event('input'))");
    await sleep(200);
    await assertMode(desktop, "help");

    await desktop.key("Escape"); await sleep(300);
    await assertMode(desktop, "map");
    const inputVisibleAgain = await desktop.eval("document.querySelector('.map-search-input').hidden");
    assert(inputVisibleAgain === false, "Map search input should be visible again after help");
    const queryPreserved = await desktop.eval("document.querySelector('.map-search-input').value");
    assert(queryPreserved === 'Ara', "Map search query should be preserved after help");
    assert((await snapshot(desktop)).mapFilters.systemClass === stateWithClass.mapFilters.systemClass, "CLASS filter should be preserved after help");

    await desktop.eval("window.__VST_DEBUG__?.game['cycleMapFilter']('map-filter-clear')");
    await sleep(200);
    const stateAfterClear = await snapshot(desktop);
    assert(stateAfterClear.mapFilters.systemClass === "all", "CLR did not reset CLASS filter");
    assert(stateAfterClear.mapFilters.query === "", "CLR did not reset map search query");

    await desktop.key("KeyA"); await sleep(150);

    await desktop.navigate(smokeUrl);
    await desktop.waitForLoad();
    await sleep(500);
    await assertRealSaveExists(desktop);
    await assertButton(desktop, "continue");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-reload.png"), await desktop.screenshot());
    await desktop.key("Digit2"); await sleep(400);
    assert(["flight", "docked"].includes((await snapshot(desktop)).mode), "Continue did not restore a playable state");

    await desktop.key("Escape"); await sleep(300);
    await assertMode(desktop, "paused");
    await assertButton(desktop, "pause-settings");
    await clickButton(desktop, "pause-settings");
    await sleep(300);
    await assertMode(desktop, "settings");
    await assertButton(desktop, "settings-sfx-up");
    await assertButton(desktop, "help");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-settings.png"), await desktop.screenshot());
    await clickButton(desktop, "settings-sfx-up");
    await sleep(150);
    await desktop.key("Escape"); await sleep(300);
    await assertMode(desktop, "paused");
    await desktop.key("Slash"); await sleep(300);
    await assertMode(desktop, "help");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-desktop-help-pause.png"), await desktop.screenshot());
    await desktop.key("Escape"); await sleep(300);
    await assertMode(desktop, "paused");
    await desktop.key("Enter"); await sleep(300);

    await desktop.close();

    const mobile = await browser.openTarget(smokeUrl);
    await mobile.setViewport(390, 844, true);
    await mobile.navigate(smokeUrl);
    await mobile.waitForLoad();
    await mobile.eval("localStorage.clear()");
    await mobile.navigate(smokeUrl);
    await mobile.waitForLoad();
    await sleep(500);
    await mobile.key("Digit1"); await sleep(500);
    await assertMode(mobile, "flight");
    await assertTouchControlsInBounds(mobile, 390, 844);
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-mobile-flight.png"), await mobile.screenshot());

    await mobile.key("Enter"); await sleep(150);
    await mobile.key("KeyD"); await sleep(1800);
    await assertMode(mobile, "docked");
    await assertDockedHintDoesNotOverlapActions(mobile);
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-mobile-docked.png"), await mobile.screenshot());
    await mobile.key("KeyT"); await sleep(300);
    await assertMode(mobile, "trade");
    await assertButton(mobile, "trade-row-0");
    await mobile.key("Escape"); await sleep(200);
    await mobile.key("KeyM"); await sleep(300);
    await assertMode(mobile, "map");
    const mobileMapSearchVisible = await mobile.eval("document.querySelector('.map-search-input').hidden === false");
    assert(mobileMapSearchVisible, "Mobile map search input should be visible in map mode");
    writeFileSync(join(SCREENSHOTS_DIR, "smoke-mobile-map.png"), await mobile.screenshot());

    await mobile.close();
    await browser.close();
    log("BROWSER: launch, docked hub, trade, missions, equipment, shipyard, manual search, settings/audio, map, save/reload, and 390x844 layout checks — OK");
  } finally {
    try { proc.kill("SIGTERM"); } catch { /* ignore */ }
    try { preview.kill("SIGTERM"); } catch { /* ignore */ }
  }
}

function withSmokeParam(url) {
  const parsed = new URL(url);
  parsed.searchParams.set("smoke", "1");
  return parsed.toString();
}

async function assertPageReady(tab, label) {
  const identity = await tab.eval("({ title: document.title, hasCanvas: Boolean(document.querySelector('canvas')), hasDebug: Boolean(window.__VST_DEBUG__) })");
  assert(identity.title === "Vector Space Trader", `${label}: unexpected title ${identity.title}`);
  assert(identity.hasCanvas, `${label}: canvas missing`);
  assert(identity.hasDebug, `${label}: smoke debug hook missing`);
  await assertCanvasNonBlank(tab, label);
}

async function assertCanvasNonBlank(tab, label) {
  const sample = await tab.eval(`(() => {
    const canvas = document.querySelector("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let lit = 0;
    for (let i = 0; i < data.length; i += 64) {
      if (data[i] > 8 || data[i + 1] > 8 || data[i + 2] > 8) lit++;
    }
    return { lit, w, h };
  })()`);
  assert(sample.w > 0 && sample.h > 0, `${label}: canvas has invalid dimensions`);
  assert(sample.lit > 20, `${label}: canvas appears blank`);
}

async function snapshot(tab) {
  const state = await tab.eval("window.__VST_DEBUG__?.game.getDebugSnapshot()");
  assert(state, "Smoke debug snapshot unavailable");
  return state;
}

async function assertMode(tab, mode) {
  const state = await snapshot(tab);
  assert(state.mode === mode, `Expected mode ${mode}, got ${state.mode}`);
}

async function assertButton(tab, id) {
  const state = await snapshot(tab);
  assert(Boolean(state.buttons.find((button) => button.id === id)), `Missing button zone ${id} in mode ${state.mode}`);
}

async function clickButton(tab, id) {
  const state = await snapshot(tab);
  const button = state.buttons.find((candidate) => candidate.id === id);
  assert(button, `Missing button zone ${id} in mode ${state.mode}`);
  await tab.click(button.x + button.width / 2, button.y + button.height / 2);
}

async function assertRealSaveExists(tab) {
  const saved = await tab.eval(`Boolean(localStorage.getItem(${JSON.stringify(APP_SAVE_KEY)}))`);
  assert(saved, "Real app save was not created");
}

async function assertTouchControlsInBounds(tab, width, height) {
  const state = await snapshot(tab);
  const required = [
    "touch-map",
    "touch-dock",
    "touch-menu",
    "touch-up",
    "touch-down",
    "touch-left",
    "touch-right",
    "touch-throttle-up",
    "touch-throttle-down",
    "touch-fire"
  ];
  for (const id of required) {
    const rect = state.buttons.find((button) => button.id === id);
    assert(rect, `Missing mobile control ${id}`);
    assert(rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= width && rect.y + rect.height <= height,
      `Mobile control ${id} out of bounds: ${JSON.stringify(rect)}`);
  }
}

async function assertDockedHintDoesNotOverlapActions(tab) {
  const state = await snapshot(tab);
  const hint = state.buttons.find((button) => button.id === "hint-dismiss");
  if (!hint) return;
  const actionIds = ["touch-trade", "touch-equipment", "touch-shipyard", "touch-missions", "touch-dock"];
  for (const id of actionIds) {
    const action = state.buttons.find((button) => button.id === id);
    assert(action, `Missing docked action ${id}`);
    assert(!rectsOverlap(hint, action), `Docked hint overlaps ${id}: ${JSON.stringify({ hint, action })}`);
  }
  assert(hint.y > 120, `Docked hint overlaps top status area: ${JSON.stringify(hint)}`);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

// -------------------- Minimal CDP client over Node 22 built-in WebSocket ----

async function connectBrowser(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", () => res(undefined), { once: true });
    ws.addEventListener("error", (e) => rej(e), { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id != null && pending.has(msg.id)) {
      const { resolve: r, reject: j } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? j(new Error(msg.error.message)) : r(msg.result);
    }
  });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const requestId = ++id;
    pending.set(requestId, { resolve: res, reject: rej });
    ws.send(JSON.stringify({ id: requestId, method, params, sessionId }));
  });

  return {
    async openTarget(url) {
      const { targetId } = await send("Target.createTarget", { url });
      const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
      const target = makeTarget(send, sessionId);
      await target.send("Page.enable");
      await target.send("Runtime.enable");
      await target.send("Network.enable");
      return target;
    },
    async close() { try { ws.close(); } catch { /* ignore */ } }
  };
}

function makeTarget(send, sessionId) {
  return {
    send: (method, params) => send(method, params, sessionId),
    async setViewport(width, height, mobile = false) {
      await send("Emulation.setDeviceMetricsOverride", {
        width, height, deviceScaleFactor: 1, mobile,
        screenWidth: width, screenHeight: height
      }, sessionId);
    },
    async navigate(url) { await send("Page.navigate", { url }, sessionId); },
    async waitForLoad() {
      const deadline = Date.now() + 10_000;
      while (Date.now() < deadline) {
        const r = await send("Runtime.evaluate", { expression: "document.readyState" }, sessionId);
        if (r.result?.value === "complete") return;
        await sleep(100);
      }
    },
    async key(code) {
      await send("Input.dispatchKeyEvent", { type: "keyDown", code, key: codeToKey(code) }, sessionId);
      await send("Input.dispatchKeyEvent", { type: "keyUp", code, key: codeToKey(code) }, sessionId);
    },
    async click(x, y) {
      await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, button: "none" }, sessionId);
      await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1 }, sessionId);
      await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1 }, sessionId);
    },
    async screenshot() {
      const r = await send("Page.captureScreenshot", { format: "png" }, sessionId);
      return Buffer.from(r.data, "base64");
    },
    async eval(expression) {
      const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
      return r.result?.value;
    },
    async close() { try { await send("Page.close", undefined, sessionId); } catch { /* ignore */ } }
  };
}

function codeToKey(code) {
  if (code.startsWith("Key")) return code.slice(3).toLowerCase();
  if (code.startsWith("Digit")) return code.slice(5);
  if (code === "Equal") return "=";
  if (code === "Period") return ".";
  if (code === "Comma") return ",";
  if (code === "NumpadAdd") return "+";
  if (code === "Escape") return "Escape";
  if (code === "Space") return " ";
  if (code === "Enter") return "Enter";
  if (code === "Slash") return "/";
  if (code === "ArrowLeft") return "ArrowLeft";
  if (code === "ArrowRight") return "ArrowRight";
  return code;
}
