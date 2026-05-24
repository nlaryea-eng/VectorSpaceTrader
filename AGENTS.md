# Agent Instructions: Vector Space Trader

This repository contains **Vector Space Trader**, a browser-based vector space-trading and combat game built with TypeScript and Canvas.

## Core Mandates & Safety

1.  **Compliance Hardening:** This is a **clean-room implementation**.
    *   **DO NOT** use source code, assets, ship designs, universe names, text, audio, or data tables from any protected third-party space-trading franchise or source-code archive.
    *   **DO NOT** use trademarked terms; keep project-original labels such as "BAL" and "Periphery".
    *   Maintain the original procedural generation seeds and logic unless specifically asked to change the universe.
2.  **Persistence Integrity:**
    *   Save data is stored in `LocalStorage` and is versioned (see `src/game/SaveGame.ts` and `src/game/types.ts`).
    *   Any changes to `PlayerState`, `EconomyState`, or `SaveData` structures must include validation to prevent breaking existing saves.
3.  **Minimalism & Performance:**
    *   The game uses a minimalist wireframe aesthetic rendered via Canvas API.
    *   Avoid adding heavy external dependencies.
    *   Prefer procedural solutions (Web Audio, generated wireframes) over static assets.

## Repository Structure

-   `src/main.ts`: Application entry point.
-   `src/game/`: Core game logic.
    -   `Game.ts`: The central orchestrator/state manager.
    -   `Renderer.ts`: Canvas rendering logic (wireframes, HUD, effects).
    -   `Audio.ts`: Procedural Web Audio implementation.
    -   `types.ts`: Domain models and type definitions.
    -   `Universe.ts` / `Economy.ts`: Procedural generation and simulation.
    -   `Physics.ts`: Vector math and movement.
-   `test/`: Vitest unit tests.
-   `index.html` / `styles.css`: Web host and global styles.

## Development Workflow

### Scripts
-   `npm run dev`: Start Vite development server.
-   `npm run build`: Production build (TSC + Vite).
-   `npm test`: Run Vitest suite.
-   `npm run type-check`: Run TypeScript compiler check.

### Coding Conventions
-   **TypeScript:** Use strict typing. Avoid `any`.
-   **Functional Logic:** Much of the game logic (Combat, Economy, Trading, etc.) is implemented as pure functions or stateless modules that the `Game` class orchestrates. Keep it that way.
-   **Vector Math:** Use the `vec3` helper and physics utilities in `src/game/Physics.ts`.
-   **Input:** The game supports both keyboard and touch controls via `Input.ts` and `InputRouter.ts`.

## Strategic Guidance

-   **Adding New Features:**
    *   Define new types in `types.ts`.
    *   Implement logic in a new or existing module in `src/game/`.
    *   Integrate into the `Game` class loop and `Renderer` class.
    *   **Always** add a corresponding test in `test/`.
-   **Modifying UI:**
    *   The cockpit and menus are drawn directly to the canvas in `Renderer.ts`.
    *   Menu navigation is often handled by specific `GameMode` states.
-   **Bug Fixes:**
    *   Reproduce the bug with a Vitest case if possible.
    *   Be mindful of how changes affect the deterministic nature of the universe or economy.

## Known Limitations
-   Manual docking alignment is currently simplified (range-based).
-   Combat is limited to single-contact encounters.
-   UI is primarily keyboard/touch shortcut driven.

## Git Etiquette for AI Agents

* Start every task by checking:
    * `git status --short`
    * `git branch --show-current`
    * recent commits with `git log --oneline --decorate --max-count=5`
* Never assume the working tree is clean.
* Never overwrite or discard user changes.
* Never run destructive commands unless explicitly requested by the user, including:
    * `git reset --hard`
    * `git clean -fd`
    * `git checkout -- .`
    * `git restore .`
    * force-pushing
    * rebasing shared branches
* Before editing, identify whether files are already modified by the user.
* Keep changes focused to the requested task.
* Review diffs before final reporting:
    * `git diff --stat`
    * `git diff -- <files changed>`
* Run required verification before committing or reporting:
    * `npm test`
    * `npm run build`
    * `npm run type-check` if present
    * compliance grep
* Commit only when explicitly asked, or when the user’s task clearly requests setting up a baseline commit.
* Use clear, conventional commit messages when committing, for example:
    * `chore: establish project baseline`
    * `fix: persist run stats in saves`
    * `docs: add git workflow guidance`
* Keep each commit logically scoped.
* Do not include generated files such as `dist/` or dependencies such as `node_modules/`.
* Do not commit secrets or local environment files.
* If the repo has no baseline commit and the user asks to establish one, create a first commit containing the current intended project state after verification passes.
* If verification fails, do not commit unless the user explicitly instructs otherwise; report the failure clearly.

### Baseline repo setup
* If the repo is empty and all files are untracked, first verify the project:
    * `npm test`
    * `npm run build`
    * `npm run type-check` if present
    * compliance grep
* Then stage appropriate tracked files:
    * source, tests, docs, package files, lockfile, config, CI workflow, `.gitignore`, `AGENTS.md`
* Do not stage ignored/generated files.
* Create the baseline commit only after verification passes.
