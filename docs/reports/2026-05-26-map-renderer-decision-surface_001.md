# Sprint Report: Map Renderer Extraction and Decision Surface

Date: 2026-05-26

Branch: main

Commit hash(es): Not committed in this working tree. Base HEAD: b554908.

## Objective

Complete a two-phase sprint:

1. Extract map rendering and map hit testing out of `Renderer.ts` with strict parity.
2. Upgrade the map into a clearer decision surface without changing game rules, save data, universe data, economy mechanics, mission generation, or jump validation.

## Files Changed

- `src/game/render/screens/MapScreen.ts`
- `src/game/Renderer.ts`
- `src/game/Game.ts`
- `test/MapScreen.test.ts`
- `scripts/smoke.mjs`
- `docs/reports/2026-05-26-map-renderer-decision-surface_001.md`

## Phase 1 Implementation

- Added `MapScreen.ts` as the dedicated map module following the existing `render/screens` containment pattern.
- Moved the map panel, system plotting, range ring, route line, detail panel, filter controls, and map button-zone emission out of `Renderer.ts`.
- Moved robust map-system hit testing into `hitTestMapSystem(...)`, preserving the existing hit-test rectangle math and tie-break path.
- Kept `Renderer.ts` as the facade/orchestrator: it now delegates map drawing through `renderMapScreen(this.renderContext, state)`.

## Phase 1 Parity Checklist Result

Verified unchanged by code review and gates:

- Map panel/header/footer structure, Help, Close Map, Jump, filter, CLASS, and CLR labels.
- System projection, route line geometry, route line dash behavior, range ring geometry, and plot clipping.
- Current, selected, discovered, reachable, matched, and filtered/dimmed system handling.
- Search state and filter state behavior, including CLASS persistence and CLR reset.
- Desktop filter chips and compact 390x844 filter-sheet behavior.
- Map hit-zone ids and robust tap/click target re-evaluation.
- Debug/smoke state surfaces and map search DOM visibility behavior.
- Jump/range validation and game rules.

## Phase 2 Implementation

- Added reachable/fuel-blocked visual emphasis using existing jump range and fuel checks.
- Added a compact route preview with route validity, reason, and fuel-after-arrival readout.
- Added destination service chips derived from existing station service data.
- Added mission destination markers and route emphasis derived from active and board mission destinations.
- Added local trade hints derived from existing local market signal data.
- Added high-hazard markers derived from existing system hazard levels.
- Added hover focus ring/label for map systems.
- Added footer legend and active-filter summary polish, including compact behavior.

Public copy changes were limited to the new decision-surface labels: `ROUTE PREVIEW`, `DESTINATION SERVICES`, `LOCAL TRADE`, `MISSION DEST`, legend/filter status, and hover focus text.

## Tests / Verification Run

Phase 1 gate:

- `npm run type-check` - passed.
- `npm test` - passed: 53 files, 539 tests.
- `npm run build` - passed: Vite production build completed.
- `npm run smoke` - passed: static smoke completed.
- `npm run test:browser` - passed: browser smoke completed, including map search/filter/CLASS and 390x844 checks.
- `git diff --check` - passed.
- Canonical compliance scan from `.github/workflows/ci.yml` - passed.

Phase 2 final gate after screenshot overlap fix:

- `npm run type-check` - passed.
- `npm test` - passed: 54 files, 542 tests.
- `npm run build` - passed: Vite production build completed.
- `npm run smoke` - passed, including the new map decision-surface affordance scan.
- `npm run test:browser` - passed: browser smoke completed, including desktop and 390x844 map screenshots.
- `git diff --check` - passed.
- Canonical compliance scan from `.github/workflows/ci.yml` - passed.

Screenshot check:

- Reviewed `assessment/screenshots/smoke-desktop-map.png` and `assessment/screenshots/smoke-mobile-map.png`.
- Fixed a desktop overlap between destination services and local trade text.
- Fixed compact map title collision with Help / Close actions by using the existing header width override.

## Compliance Scan Result

Clean-room compliance preserved. The canonical CI compliance scan passed. This report references the workflow as the source of truth and does not duplicate its prohibited-term pattern.

## Save Compatibility Notes

No save schema changes. `PlayerState`, `EconomyState`, and `SaveData` were not changed. No migration was needed.

## Gameplay / Data Compatibility Notes

- Jump validation, route validation, mission generation, universe generation, economy mechanics, combat, ships, equipment, and station data were not changed.
- The new map signals are read-only presentation derived from existing state.
- Local trade hints use current local market signals only; no destination market generation or optimizer was added.

## Known Limitations

- No autopilot, route planner, or trade optimizer was added.
- Hover focus is pointer-driven; touch users still use selected-system detail after tapping.
- The route preview remains single-destination and uses existing validation only.
- Browser screenshots are local assessment artifacts and are not part of this tracked report.

## Follow-Up Recommendations

- Add a focused rendered-map visual regression harness if future map UI work continues.
- Consider a later dedicated pass for the transient DOM map search input placement, which still sits above the canvas layer by design.
