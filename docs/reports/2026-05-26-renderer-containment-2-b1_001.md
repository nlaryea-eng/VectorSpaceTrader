# Sprint Report — Renderer Containment 2 B1

**Sprint name:** Renderer Containment 2 B1
**Date:** 2026-05-26
**Branch:** `sprint/renderer-containment-1`
**Commit hash(es):** Story commit containing this report, subject
`[phase-2b][B1] Extract station screens`

---

## Objective

Extract the five station screen renderers from `Renderer.ts` into flat
function-style modules while preserving the renderer dispatcher and visual
parity.

---

## Files changed

- `src/game/render/screens/station/DockedScreen.ts` — new `renderDocked`
  function.
- `src/game/render/screens/station/TradeScreen.ts` — new `renderTrade`
  function.
- `src/game/render/screens/station/EquipmentScreen.ts` — new
  `renderEquipment` function.
- `src/game/render/screens/station/ShipyardScreen.ts` — new
  `renderShipyard` function.
- `src/game/render/screens/station/MissionsScreen.ts` — new `renderMissions`
  function.
- `src/game/Renderer.ts` — dispatcher calls extracted station functions and
  removes the old private station methods.
- `docs/reports/2026-05-26-renderer-containment-2-b1_001.md` — this report.

---

## Summary of implementation

The station screens were mechanically lifted into
`src/game/render/screens/station/`. Drawing calls now use `RenderContext`,
existing panel helpers, existing canvas primitives, and
`addButtonZone(rc.buttonZones, ...)`.

Screen-local helpers stayed local to the extracted modules. No shared helper
file was introduced. `StatusChips.ts` was not created because the extraction did
not surface a real shared chip call site.

`Renderer.ts` still owns canvas lifecycle, render dispatch, map rendering, HUD
rendering, flight/world rendering, and the remaining non-station renderer
clusters. No barrels, map projector, new classes, public renderer exports, or
`any` casts were added.

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
dist/assets/index-LgrMkIx5.js   203.33 kB | gzip: 61.79 kB
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
rg -n "this\\." src/game/render/screens/station
no output
```

```
rg -n "^export " src/game/render/screens/station
exactly five render function exports
```

```
find src/game/render -name index.ts -o -name MapProjector.ts -o -name StatusChips.ts
no output
```

```
git diff -- src/game/Game.ts src/main.ts
no output
```

---

## Visual QA

Targeted CDP screenshots were captured at desktop 1440x900 and mobile 390x844
for:

- Docked station hub.
- Trade screen.
- Equipment screen with damaged hull to verify the repair progress bar.
- Shipyard screen.
- Missions screen with an active mission banner.

The same screenshot script was run against the Phase 2A baseline by temporarily
reversing only the B1 `Renderer.ts` extraction patch.

Byte-identical baseline matches:

```
desktop-trade.png identical
desktop-shipyard.png identical
desktop-missions-active.png identical
mobile-docked.png identical
mobile-trade.png identical
mobile-equipment-damaged.png identical
mobile-shipyard.png identical
mobile-missions-active.png identical
```

Desktop docked and desktop equipment screenshots differed at the byte level
because the animated background advanced between runs; visual inspection
confirmed station panel content, text placement, button zones, and progress bar
rendering matched the Phase 2A baseline.

The station QA script also asserted representative button hit zones for each
station screen at both viewport sizes.

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

- This story does not extract map rendering, HUD rendering, or flight/world
  rendering.
- B2 was skipped because no `StatusChips.ts` call site was needed.

---

## Follow-up recommendations

Treat the B3 station visual QA as complete for the five extracted station
screens. Continue to leave map, HUD, and flight/world rendering under
`Renderer.ts` until their own scoped sprint.
