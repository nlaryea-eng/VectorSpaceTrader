# Agent Instructions: Vector Space Trader

This repository contains **Vector Space Trader**, a browser-based vector space-trading and combat game built with TypeScript and Canvas.

Current Release: **v0.4.1-beta — Trade Route Economy**

## Core Mandates & Safety

1.  **Compliance Hardening:** This is a **clean-room implementation**.
    *   **DO NOT** use source code, assets, ship designs, universe names, text, audio, or data tables from any protected third-party space-trading franchise or source-code archive.
    *   **DO NOT** fetch, inspect, clone, copy, reference, imitate, or derive from external space-trading IP.
    *   **DO NOT** use trademarked or homage terms; keep project-original labels such as "BAL" and "Periphery".
    *   Maintain the original procedural generation seeds and logic unless specifically asked to change the universe.
    *   Run the strict compliance scan before every commit. Run the same strict compliance scan used by `.github/workflows/ci.yml`. Do not duplicate the prohibited-term pattern in this file; the workflow is the source of truth.
2.  **Persistence Integrity:**
    *   Save data is stored in `LocalStorage` and is versioned (see `src/game/SaveGame.ts` and `src/game/types.ts`).
    *   Any changes to `PlayerState`, `EconomyState`, or `SaveData` structures **MUST** include validation/migration logic to prevent breaking existing saves.
3.  **Minimalism & Performance:**
    *   The game uses a minimalist wireframe aesthetic rendered via Canvas API.
    *   Avoid adding heavy external dependencies.
    *   Prefer procedural solutions (Web Audio, generated wireframes) over static assets.

## Repository Structure

-   `src/main.ts`: Application entry point.
-   `src/game/`: Core game logic.
    -   Core/state: `Game.ts`, `types.ts`, `SaveGame.ts`, `TransientState.ts`.
    -   Presentation / Signal Glass: `Renderer.ts`, `Theme.ts`, `Layout.ts`, `FeatureFlags.ts`, `SignalGlassScreens.ts`, `UiHost.ts`, `HelpContent.ts`, `Onboarding.ts`, `AudioFeedback.ts`.
    -   Gameplay helpers: `Trading.ts`, `Economy.ts`, `Universe.ts`, `WorldClasses.ts`, `StationServices.ts`, `MapSearch.ts`, `Combat.ts`, `Physics.ts`, `Ships.ts`, `Equipment.ts`.
    -   Mission/rank/progression: `Missions.ts`, `MissionGenerator.ts`, `MissionIds.ts`, `MissionRouting.ts`, `RunStats.ts`, `Rank.ts`, `Reputation.ts`.
    -   Audio/input: `Audio.ts`, `Input.ts`, `InputRouter.ts`.
-   `test/`: Vitest unit tests.
-   `scripts/`: Automation and smoke tests.

## Development Workflow

### Scripts
-   `npm run dev`: Start Vite development server.
-   `npm run build`: Production build (TSC + Vite).
-   `npm test`: Run Vitest suite.
-   `npm run type-check`: Run TypeScript compiler check.
-   `npm run smoke`: Run CI-gated static smoke tests.
-   `npm run test:browser`: Run local/release-candidate browser smoke tests.

### Coding Conventions
-   **TypeScript:** Use strict typing. Avoid `any`.
-   **Functional Logic:** Much of the game logic is implemented as pure functions or stateless modules that the `Game` class orchestrates. Keep it that way.
-   **Vector Math:** Use the `vec3` helper and physics utilities in `src/game/Physics.ts`.
-   **Input:** The game supports both keyboard and touch controls via `Input.ts` and `InputRouter.ts`.

## Git Workflow Mandates

* **Explicit Staging Only:** Never use `git add .`. Stage files individually or with `git add -u`.
* **Verification Before Commit:** Every commit **MUST** pass:
    1. `npm run type-check`
    2. `npm test`
    3. `npm run build`
    4. `npm run smoke`
    5. Strict compliance grep (see Core Mandates).
* **Release-Candidate Browser Check:** Run `npm run test:browser` locally for public demo or release-candidate verification; it is not a PR CI gate.
* **Focused Changes:** Avoid broad rewrites. Preserve gameplay stability, save compatibility, and existing features (Map Search, Pilot Manual, etc.).

## Strategic Guidance

-   **Adding New Features:**
    *   Define new types in `types.ts`.
    *   Implement logic in a new or existing module in `src/game/`.
    *   Integrate into the `Game` class loop and `Renderer` class.
    *   **Always** add corresponding tests in `test/`.
-   **Modifying UI:**
    *   The cockpit and menus are drawn directly to the canvas in `Renderer.ts`.
    *   Maintain the 390×844 mobile viewport usability, even if primarily desktop-first.
    *   Future maintenance note: if a dedicated renderer split sprint is approved, candidates include HUD chrome, Signal Glass panels, map overlay, and modal screen renderers. Do not do that refactor during unrelated changes.
-   **Bug Fixes:**
    *   Reproduce the bug with a Vitest case before fixing.
    *   Be mindful of how changes affect the deterministic nature of the universe or economy.

## Sprint Reporting Policy

Every substantial sprint or non-trivial commit **must** be accompanied by a
short markdown report committed to the tracked `docs/reports/` folder. This is
how the project keeps a durable trail of *what changed and why* that future
agents and reviewers can read without a local working copy.

`assessment/` is gitignored and is reserved for private review/audit
artifacts; it **must not** be used for sprint reports. If `docs/reports/` does
not yet exist, create it with a placeholder `docs/reports/README.md` (see that
file for the landing-page reference) before writing the first report.

### File naming

Reports are named predictably and sortably:

```
docs/reports/YYYY-MM-DD-short-sprint-name_NNN.md
```

- `YYYY-MM-DD` — date the sprint or commit landed.
- `short-sprint-name` — kebab-case label (e.g. `public-demo-feel`).
- `_NNN` — zero-padded ordinal to disambiguate multiple reports per day.

### Required content

Each report must include, at minimum:

- Sprint name
- Date
- Branch
- Commit hash(es)
- Objective
- Files changed
- Summary of implementation
- Tests / verification run (exact commands and outcomes)
- Compliance scan result
- Save compatibility notes
- Known limitations
- Follow-up recommendations

### Reporting prohibitions

Reports **must not**:

- Store private chain-of-thought, scratchpad reasoning, or internal monologue.
- Include secrets, API tokens, or credentials.
- Include prohibited external-IP terms.
- Duplicate the compliance regex — the workflow at `.github/workflows/ci.yml`
  is the single source of truth.
- Claim that any check (type-check, tests, build, smoke, compliance, browser
  smoke) passed unless that check was actually run and its output captured.

### Authoring & git rules

- Stage report files explicitly: `git add docs/reports/<file>.md`. **Never**
  use `git add .` — this rule applies to reports just as it applies to source
  changes.
- Do not back-fill sprint reports for prior work unless explicitly asked.
- Do not edit files under `assessment/` as part of a sprint-report flow.
- Do not weaken or paraphrase the compliance policy in a report; reference it.
