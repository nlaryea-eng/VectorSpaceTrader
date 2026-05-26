# Sprint Report — Renderer Containment 2 A3

**Sprint name:** Renderer Containment 2 A3
**Date:** 2026-05-25
**Branch:** `sprint/renderer-containment-1`
**Commit hash(es):** Story commit containing this report, subject
`[phase-2a][A3] Extract contextual overlays`

---

## Objective

Extract the contextual overlay renderers for the Pilot Manual, onboarding hint,
and tutorial banner from `Renderer.ts` while preserving dispatcher ownership and
visual parity.

---

## Files changed

- `src/game/render/overlays/HelpScreen.ts` — new `renderHelp` function.
- `src/game/render/overlays/OnboardingHint.ts` — new
  `renderOnboardingHint` function with explicit `hint` parameter.
- `src/game/render/overlays/TutorialBanner.ts` — new
  `renderTutorialBanner` function.
- `src/game/Renderer.ts` — dispatcher calls extracted overlay functions and
  removes the old private overlay methods.
- `docs/reports/2026-05-25-renderer-containment-2-a3_001.md` — this report.

---

## Summary of implementation

The three overlays were mechanically lifted into `src/game/render/overlays/`.
Drawing calls now use `RenderContext`, existing canvas primitives, existing
panel helpers, and `addButtonZone(rc.buttonZones, ...)`.

`renderOnboardingHint` receives `hint` as an explicit third parameter. Help
search remains driven by `state.helpSearchQuery` and `state.helpPageIndex`; no
state shape changed.

`Renderer.ts` still owns station screens, map rendering, HUD rendering,
flight/world rendering, canvas lifecycle, and render dispatch. No barrels, map
projector, status-chip helper, new classes, public renderer exports, or `any`
casts were added.

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
dist/assets/index-D3cj9wvA.js   205.59 kB | gzip: 62.04 kB
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
rg -n "this\\." src/game/render/overlays src/game/render/screens
no output
```

```
find src/game/render -name index.ts -o -name MapProjector.ts -o -name StatusChips.ts
no output
```

---

## Visual QA

Targeted CDP screenshots were captured at desktop 1440x900 and mobile 390x844
for:

- Help main page.
- Help page navigation.
- Help search with the manual search input.
- Tutorial banner in flight mode.
- Onboarding hint in flight mode.
- Trade and map panel modes with existing onboarding suppression unchanged.

The same screenshot script was run against the A2 baseline by temporarily
reversing only the A3 `Renderer.ts` extraction patch.

Byte-identical baseline matches:

```
desktop-help-main.png identical
desktop-help-page2.png identical
desktop-help-search.png identical
desktop-trade-panel-mode.png identical
desktop-map-panel-mode.png identical
mobile-help-main.png identical
mobile-help-page2.png identical
mobile-help-search.png identical
mobile-trade-panel-mode.png identical
mobile-map-panel-mode.png identical
```

Flight tutorial/onboarding screenshots differed at the byte level because the
flight background animates between runs; visual inspection confirmed the banner
and hint positions match the A2 baseline at both viewport sizes.

Trade and map onboarding hints are not rendered by the existing panel-mode
dispatcher. This behavior was preserved exactly; screenshots for those modes
were byte-identical to the baseline.

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

- This story does not extract station screens, map rendering, HUD rendering, or
  flight/world rendering.
- Trade/map onboarding remains suppressed by existing panel-mode logic.

---

## Follow-up recommendations

Run the Phase 2A gate before considering Phase 2B station extraction.
