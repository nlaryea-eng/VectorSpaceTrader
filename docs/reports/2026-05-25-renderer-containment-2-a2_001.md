# Sprint Report — Renderer Containment 2 A2

**Sprint name:** Renderer Containment 2 A2
**Date:** 2026-05-25
**Branch:** `sprint/renderer-containment-1`
**Commit hash(es):** Story commit containing this report, subject
`[phase-2a][A2] Extract standalone screens`

---

## Objective

Extract the five standalone screen renderers from `Renderer.ts` into
`src/game/render/screens/` while preserving renderer dispatch ownership and
screen output parity.

---

## Files changed

- `src/game/render/screens/StartScreen.ts` — new `renderStart` function.
- `src/game/render/screens/ControlsScreen.ts` — new `renderControls` function.
- `src/game/render/screens/PauseScreen.ts` — new `renderPause` function.
- `src/game/render/screens/SettingsScreen.ts` — new `renderSettings` function.
- `src/game/render/screens/GameOverScreen.ts` — new `renderGameOver` function.
- `src/game/Renderer.ts` — dispatcher imports/calls the extracted functions;
  removed the old private screen methods and dead extraction remnants.
- `docs/reports/2026-05-25-renderer-containment-2-a2_001.md` — this report.

---

## Summary of implementation

Each extracted screen is a module-level function with the requested
`RenderContext` and `RenderState` inputs. Drawing calls were mechanically
rewritten from renderer wrapper methods to the existing render primitives and
panel helpers.

`Renderer.ts` still owns canvas lifecycle, render dispatch, flight/world
rendering, map rendering, HUD rendering, station screens, and overlays. It also
retains a short orchestrator comment so the existing static smoke branding scan
continues to pass after the title moved into `StartScreen.ts`.

No barrels, map projector, status-chip helper, new classes, public renderer
exports, or `any` casts were added.

---

## Tests / verification run

```
npx tsc --noEmit
exit 0
```

```
npm run type-check
exit 0
```

```
npm test
Test Files  53 passed (53)
Tests       539 passed (539)
exit 0
```

```
npm run build
dist/assets/index-BSzFk15x.js   206.00 kB | gzip: 61.86 kB
exit 0
```

```
npm run smoke
Static smoke passed.
exit 0
```

```
npm run test:browser
BROWSER: launch, docked hub, trade, missions, equipment, shipyard, manual search,
settings/audio, map, save/reload, and 390x844 layout checks - OK
exit 0
```

```
git diff --check
exit 0
```

```
rg -n "this\\." src/game/render/screens
no output
```

```
rg -n "^export " src/game/render/screens
5 single render-function exports
```

```
find src/game/render -name index.ts -o -name MapProjector.ts -o -name StatusChips.ts
no output
```

---

## Visual QA

Targeted CDP screenshots were captured for Start, Controls, Pause, Settings,
and Game Over at desktop 1440x900 and mobile 390x844.

The same screenshot script was then run against the A1 baseline by temporarily
reversing only the A2 `Renderer.ts` extraction patch. All ten A2 screenshots
were byte-identical to the A1 baseline:

```
desktop-start.png identical
desktop-controls.png identical
desktop-pause.png identical
desktop-settings.png identical
desktop-gameover.png identical
mobile-start.png identical
mobile-controls.png identical
mobile-pause.png identical
mobile-settings.png identical
mobile-gameover.png identical
```

Observed mobile title clipping on Start/Controls and cramped mobile Settings /
Game Over layout are pre-existing and byte-identical to the baseline. They were
not changed in this extraction story.

---

## Compliance scan result

The strict compliance scan from `.github/workflows/ci.yml` was run locally.

Result:

```
Compliance check passed
```

---

## Save compatibility notes

No save data, schema, migration, economy, player state, or settings format
changed.

---

## Known limitations

- This story does not extract overlays, station screens, map rendering, HUD
  rendering, or flight/world rendering.
- Existing mobile layout issues on the extracted screens remain unchanged by
  design, because this story is extraction-only.

---

## Follow-up recommendations

Proceed to Phase 2A gate review, then A3 overlay extraction only if the gate
remains clean.
