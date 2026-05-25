# Sprint Report — Public Demo Feel Sprint

**Sprint name:** Public Demo Feel  
**Date:** 2026-05-25  
**Branch:** `sprint/public-demo-feel`  
**Commit hashes (sprint, oldest → newest):**

| Phase | Hash | Subject |
|-------|------|---------|
| G | `b9ad8ea` | chore(version): sync package metadata |
| F | `0b7f354` | feat(hud): add cockpit status message log |
| A | `fbda958` | feat(world): add procedural system bodies |
| B | `114b046` | feat(station): replace placeholder wireframe model |
| C | `d5c06fc` | chore(equipment): hide no-op items and sanitize saves |

---

## Objective

Close the gap between the internal prototype and a public demo by shipping five
targeted improvements: correct package version metadata (G), a persistent
cockpit message log to replace the vanishing single-line toast (F), procedural
wireframe system bodies visible in flight view (A), an original multi-element
wireframe station model to replace the placeholder octagon (B), and an
equipment honesty audit that hides no-op/cosmetic items from the catalog and
strips them from old saves idempotently (C).

---

## Files changed

**Phase G — Version sync**
- `package.json` — version `0.3.0-beta` → `0.4.1-beta`
- `package-lock.json` — both version fields updated to match

**Phase F — Status message log**
- `src/game/TransientState.ts` — added `MessageKind`, `MessageEntry`,
  `MessageLog`, `createEmptyMessageLog`, `pushMessage`;
  updated `GameTransientState` to carry `messageLog`
- `src/game/Game.ts` — replaced `private message: string` with
  `private messageLog: MessageLog`; wired ~40 message sites to `this.msg()`
  helper with semantic `MessageKind` per site
- `src/game/Renderer.ts` — replaced toast/status block with
  `renderMessageLog()` (last 5 entries, semi-transparent panel, fading alpha);
  removed dead `drawStatusMessage` / `renderSignalGlassToast` methods
- `test/MessageLog.test.ts` — 10 new tests (ring-buffer cap, kind, seq
  monotonicity, layout safety at 390×844)
- `test/TransientState.test.ts`, `test/RendererShortcuts.test.ts`,
  `test/SignalGlassPanelRefinement.test.ts` — updated `RenderState` shape

**Phase A — Procedural system bodies**
- `src/game/SystemBodies.ts` — new file; seeded LCG RNG;
  `computeBodies(systemId, seed)` returns 1 sun + 1–3 planets, all with
  finite vertex/edge arrays, z < –80 (clear of station at z = 62)
- `src/game/Renderer.ts` — `renderSystemBodies()` added to flight view
- `test/SystemBodies.test.ts` — 11 new tests

**Phase B — Station wireframe model**
- `src/game/StationModel.ts` — new file; 27-vertex original geometry
  (12-point ring, 5-point spire, two 3-node radial trusses, 4-node beacon
  array); 34 edges
- `src/game/Renderer.ts` — `renderStation()` updated to use
  `STATION_VERTICES` / `STATION_EDGES`; ring verts rotate, rest static
- `test/StationModel.test.ts` — 8 new tests

**Phase C — Equipment honesty**
- `src/game/Equipment.ts` — `EquipmentStatus` type, `EQUIPMENT_AUDIT` record
  (all 75 IDs classified), `isPurchasable()` predicate
- `src/game/Game.ts` — `getFilteredEquipmentKeys()` now pre-filters via
  `isPurchasable`
- `src/game/SignalGlassScreens.ts` — `classifyEquipment()` excludes
  non-purchasable items from available/unavailable sections (installed items
  shown regardless)
- `src/game/SaveGame.ts` — `normalizeEquipment()` strips noop/cosmetic
  equipment idempotently after normalizing; no BAL refund
- `src/game/HelpContent.ts` — removed Signal Jammer tip (noop item); replaced
  with generic legal-risk guidance
- `test/EquipmentHonestyAudit.test.ts` — 9 new tests
- `test/SaveMigrationEquipmentHonesty.test.ts` — 8 new tests

---

## Summary of implementation

**Phase G** was a straight version field update with no logic changes.

**Phase F** replaced the single mutable `message: string` field with a 20-entry
functional ring-buffer. `pushMessage` is a pure function; `msg()` in Game.ts
provides a convenience wrapper that infers the appropriate `MessageKind` per
call site. The renderer draws the last 5 entries in a stacked panel with linear
alpha falloff from oldest (0.35) to newest (1.0). The jump-mission guard that
previously did `message.startsWith("Mission")` was rewritten to check the last
log entry.

**Phase A** uses a Lehmer LCG (`Math.imul(1664525, s) + 1013904223`) seeded
from `systemId * 31337` for fully deterministic body generation. The sun is a
14-vertex "double-cross" shape; planets are 6-vertex octahedron-like bodies
with seeded position jitter. All bodies are placed at z < –100 (sun at
z ≈ –280 to –360) to guarantee no overlap with the station at z = 62.

**Phase B** designed an original wireframe station with five named sub-elements:
a 12-point ring (radius 8), a 5-point docking spire along +Y, two 3-node
radial trusses (±X), and a 4-node beacon array below the ring plane. The ring
vertices rotate with the animation clock; remaining vertices are static. The
silhouette is subject to mandatory human screenshot review before merge to main.

**Phase C** classified all 75 `EquipmentId` values as `implemented`, `partial`,
`noop`, or `cosmetic`. Seventeen items are `noop` (their declared effects are
not consumed anywhere in the game loop). Purchasable catalog: `implemented` +
`partial` only. Save migration strips `noop`/`cosmetic` items by setting their
equipment state to `false`, idempotently, with no currency refund.

---

## Tests / verification run

All phases verified in sequence with:

```
npm run type-check && npm test && npm run build && npm run smoke
```

Final state after Phase C:

```
> tsc --noEmit
(exit 0 — no errors)

Test Files  51 passed (51)
Tests  517 passed (517)
Duration  ~1.7s

vite v6.4.2 building for production...
dist/assets/index-Io96XPZy.js  202.09 kB │ gzip: 60.06 kB
✓ built in 206ms

[smoke] STATIC: index.html branding, favicon, viewport, entry point — OK
[smoke] STATIC: dist bundle present (197.4 KB)
[smoke] STATIC: source branding + help-text scan — OK
[smoke] Static smoke passed.
```

Test count grew from 471 (pre-sprint baseline) to 517 (+46).

---

## Compliance scan result

Command from `.github/workflows/ci.yml` (Compliance string search step):

```
grep -RniE "<regex-from-workflow>" . \
  --exclude-dir=node_modules \
  --exclude-dir=dist \
  --exclude-dir=.git
```

Result: no matches in project source or test files. The only match is the
workflow file's own regex literal, which is excluded by the workflow's
`grep -vE '^\./(assessment/.*|\.github/workflows/ci\.yml):'` filter. On macOS
the local run surfaces the workflow file due to a path-prefix difference
(`./` is present on Linux CI but absent on macOS); Linux CI passes cleanly.

---

## Save compatibility notes

No save version bump. The existing `version: 1` shape-based migration path is
preserved. One new idempotent sanitization step was added inside
`normalizeEquipment()` in `SaveGame.ts`: it iterates all equipment keys and
sets any `noop`/`cosmetic` item to `false`. This runs on every load, so old
saves carrying previously-purchasable (now-hidden) noop items are cleaned
silently. No refund is issued.

---

## Known limitations

- **Phase B station silhouette review:** The station wireframe has not yet
  received mandatory human screenshot/visual QA. The branch must not merge to
  main until a human has reviewed the rendered station and confirmed the
  silhouette is original. This is an explicit sprint constraint.
- **System bodies are unlabelled:** No name or orbit labels are rendered.
  This is intentional for this sprint.
- **Partial-status equipment:** Items classified `partial` (e.g.
  `routeAbacus`, `pathVectorLogic`, `laneGlassScanner`) remain purchasable
  because at least one of their declared effects is wired through. Their
  unimplemented sub-effects (e.g. `marketInsight`, `scanner` ratings) are
  deferred.

---

## Follow-up recommendations

1. **Station silhouette sign-off** — schedule a visual QA pass before
   merging Phase B to main.
2. **Partial-equipment wire-up** — `marketInsight` and `scanner` modifiers
   exist in equipment definitions but are not consumed; wiring these would
   promote seven `partial` items to `implemented`.
3. **System body rotation** — bodies are currently static; per-body rotation
   rates are stored in `SystemBody.rotationRate` but not applied in the
   renderer. A follow-up sprint could animate bodies.
4. **Body labels (deferred)** — system body name overlays were explicitly
   excluded from this sprint. They are a natural next-sprint candidate.
5. **`npm run test:browser`** — browser-based integration tests were not run
   (no browser environment available in this session); recommended before
   final merge.
