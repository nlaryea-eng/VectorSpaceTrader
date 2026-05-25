# Sprint Report — First-Flight Onboarding

**Sprint name:** First-Flight Onboarding
**Date:** 2026-05-25
**Branch:** `sprint/first-flight-onboarding`
**Commit hashes:**

| Phase | Hash | Subject |
|-------|------|---------|
| B/C | `f2aab45` | feat(tutorial): add first-flight onboarding |

---

## Objective

Add a save-compatible first-flight tutorial that guides a fresh pilot through
launch, station orientation, docking, market entry, buying, map use, jumping,
and selling cargo. Also clarify overloaded controls in the Pilot Manual without
changing input behavior.

---

## Files changed

- `src/game/Tutorial.ts` — new pure tutorial stage machine, hints, ordered
  reducer, and station-orientation progress helper.
- `src/game/types.ts`, `src/game/SaveGame.ts` — additive optional
  `meta.tutorialStage` persistence and idempotent legacy defaulting.
- `src/game/Game.ts` — tutorial advancement from existing launch, dock, market,
  buy, map, jump, and sell paths; render-state suppression of generic hints.
- `src/game/Renderer.ts` — compact Signal Glass tutorial banner and layout
  helper.
- `src/game/HelpContent.ts` — Controls by mode manual copy for `R`, `D`, and
  `E`.
- `test/Tutorial.test.ts`, `test/SaveGame.test.ts`, `test/RendererLayout.test.ts`,
  `test/SignalGlassPanelRefinement.test.ts`, `test/Help.test.ts` — reducer,
  migration, layout, suppression, and manual-copy coverage.

---

## Summary of implementation

`Tutorial.ts` owns the tutorial contract as pure data and functions. The
sequence is ordered-only; out-of-order events do not skip stages, and
completion is sticky. The station-orientation stage advances from existing
flight state when the station is meaningfully ahead or when safe flight
movement progress is detected, so it cannot trap the player indefinitely.

Save compatibility stays on `version: 1`. `tutorialStage` is optional and lives
in the existing `Meta` block. Missing tutorial state defaults to `complete`
only when cargo, cargo cost basis, or migrated `runStats.totalBalEarned`
shows prior progress. Current BALANCE alone is not used as completion evidence.

`Game.ts` derives tutorial events from existing successful gameplay paths only.
Generic onboarding is suppressed by render-state selection while tutorial text
is active; existing onboarding state and dismissal semantics are left intact.

The renderer draws a compact Signal Glass banner for active tutorial guidance.
Renderer growth was kept bounded; no renderer split or new assets were added.

The Pilot Manual now has a Controls by mode page clarifying mode-specific
meanings for `R`, `D`, and `E`.

---

## Tests / verification run

Initial required git checks before branching:

```
git branch --show-current
main

git status --short
(no output)

git log --oneline --decorate --max-count=12
e2198b3 (HEAD -> main, origin/main, origin/HEAD) Merge pull request #3 from nlaryea-eng/sprint/public-demo-feel
...

git diff --stat
(no output)
```

Branch creation:

```
git switch -c sprint/first-flight-onboarding
Switched to a new branch 'sprint/first-flight-onboarding'
```

Verification:

```
npm run type-check
> tsc --noEmit
exit 0
```

```
npm test
Test Files  52 passed (52)
Tests       534 passed (534)
Duration    2.20s
exit 0
```

```
npm run build
vite v6.4.2 building for production...
✓ 39 modules transformed.
dist/assets/index-GxCLdaXl.js   206.35 kB │ gzip: 61.44 kB
✓ built in 215ms
exit 0
```

```
npm run smoke
[smoke] STATIC: index.html branding, favicon, viewport, entry point — OK
[smoke] STATIC: dist bundle index-GxCLdaXl.js present (201.5 KB)
[smoke] STATIC: source branding + help-text scan — OK
[smoke] Static smoke passed. (Run with --browser to add live CDP browser smoke.)
exit 0
```

```
npm run test:browser
[smoke] STATIC: index.html branding, favicon, viewport, entry point — OK
[smoke] STATIC: dist bundle index-GxCLdaXl.js present (201.5 KB)
[smoke] STATIC: source branding + help-text scan — OK
[smoke] Building production bundle…
✓ built in 204ms
[smoke] Checking map search functionality...
[smoke] BROWSER: launch, docked hub, trade, missions, equipment, shipyard, manual search, settings/audio, map, save/reload, and 390x844 layout checks — OK
exit 0
```

```
git diff --check
exit 0
```

```
git diff --cached --check
exit 0

git diff --cached --stat
11 files changed, 462 insertions(+), 18 deletions(-)
```

---

## Compliance scan result

Canonical compliance command from `.github/workflows/ci.yml` was run before the
implementation commit.

Result:

```
Compliance check passed
```

No compliance pattern matches appeared in new source, tests, or this report.

---

## Save compatibility notes

- No save version bump.
- `tutorialStage` is an additive optional field under `meta`.
- Missing tutorial state is defaulted idempotently.
- Legacy trade progress defaults to `complete` only from cargo, cargo cost
  basis, or explicit earned BAL run stats.
- Current BALANCE alone does not complete the tutorial.
- Migration preserves player balance, cargo, cargo cost basis, missions, ships,
  equipment, economy state, and run stats.

---

## Manual / browser QA

- Fresh save desktop: `npm run test:browser` verified launch, docking, market,
  buying, map access, save/reload, and playable continuation. The pure reducer
  tests verify the full ordered sequence through final cargo sale. A human
  manual desktop playthrough through every tutorial stage was not performed.
- Fresh save at 390x844: browser smoke passed the mobile viewport layout
  checks. `test/RendererLayout.test.ts` verifies the tutorial banner stays
  above the message log and clear of the station marker at 390x844. A human
  visual readability pass was not performed.
- Legacy save with trade history: `test/SaveGame.test.ts` verifies legacy cargo
  and cargo-cost-basis saves default tutorial state to `complete`.
- An additional ad hoc CDP script was attempted for a full scripted tutorial
  playthrough, but Chrome did not expose a DevTools endpoint in that launch path;
  no pass is claimed from that attempt.

---

## Known limitations

- Bounded multi-contact combat deferred.
- Mobile verification/public demo badging still requires manual review.
- Code-level key rebinding deferred.
- Partial-equipment wire-up deferred.
- System body rotation deferred.
- Human manual tutorial playthrough and visual readability sign-off are still
  recommended before public-demo badging.

---

## Follow-up recommendations

Next sprint should be bounded multi-contact combat.
