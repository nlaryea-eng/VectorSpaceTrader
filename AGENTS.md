# Agent Instructions: Vector Space Trader

This repository contains **Vector Space Trader**, a browser-based vector space-trading and combat game built with TypeScript and Canvas.

Current Release: **v0.3.0-beta — Content Systems Sprint**

## Core Mandates & Safety

1.  **Compliance Hardening:** This is a **clean-room implementation**.
    *   **DO NOT** use source code, assets, ship designs, universe names, text, audio, or data tables from any protected third-party space-trading franchise or source-code archive.
    *   **DO NOT** fetch, inspect, clone, copy, reference, imitate, or derive from external space-trading IP.
    *   **DO NOT** use trademarked or homage terms; keep project-original labels such as "BAL" and "Periphery".
    *   Maintain the original procedural generation seeds and logic unless specifically asked to change the universe.
    *   Run the strict compliance scan before every commit: `grep -RniE "elite|cobra|jameson|lave|diso|leesti|zaonce|riedquat|tionisla|coriolis|galcop|thargoid|thargon|frontier|cyberpunk|tron|neon horizon|next horizon|premier space trading|credits" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git`.
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
    -   `Game.ts`: The central orchestrator/state manager.
    -   `Renderer.ts`: Canvas rendering logic (wireframes, HUD, effects).
    -   `Audio.ts`: Procedural Web Audio implementation.
    -   `types.ts`: Domain models and type definitions.
    -   `Universe.ts` / `Economy.ts`: Procedural generation and simulation.
    -   `Physics.ts`: Vector math and movement.
    -   `Ships.ts` / `Equipment.ts`: Data-driven catalogs.
-   `test/`: Vitest unit tests.
-   `scripts/`: Automation and smoke tests.

## Development Workflow

### Scripts
-   `npm run dev`: Start Vite development server.
-   `npm run build`: Production build (TSC + Vite).
-   `npm test`: Run Vitest suite.
-   `npm run type-check`: Run TypeScript compiler check.
-   `npm run smoke`: Run browser smoke tests.

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
-   **Bug Fixes:**
    *   Reproduce the bug with a Vitest case before fixing.
    *   Be mindful of how changes affect the deterministic nature of the universe or economy.
