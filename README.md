# Vector Space Trader

**Vector Space Trader** is an original browser-based vector space-trading and combat game.

Current Release: **v0.3.0-beta — Content Systems Sprint**

**Status:** This is a **desktop-first public demo beta**. It is not a v1 product, not an early access candidate, and is not yet mobile-certified.

It is a clean-room project built with TypeScript, Canvas, and procedural Web Audio. It does not use source code, assets, ship designs, universe names, text, audio, or data tables from any protected third-party source-code archive.

It is inspired by the broader tradition of classic vector space-trading and wireframe combat games, but it is not affiliated with, endorsed by, or derived from any protected third-party franchise or rights holder.

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run TypeScript type-check
npm run type-check

# Run unit tests
npm test

# Build production distribution
npm run build

# Run browser smoke tests
npm run smoke
# or
npm run test:browser
```

Open the local URL printed by Vite after `npm run dev`.

## Public Demo

After GitHub Pages is enabled for GitHub Actions, the public demo is published at:

https://nlaryea-eng.github.io/VectorSpaceTrader/

## Release Workflow

To maintain repository integrity and compliance:
- **No broad rewrites:** keep changes focused.
- **Explicit staging:** do not use `git add .`; stage files individually or with `git add -u`.
- **Verification:** run `npm run type-check`, `npm test`, `npm run build`, and `npm run smoke` before any commit.
- **Compliance:** run the strict compliance grep to ensure no banned terms are introduced.
- **Save Compatibility:** ensure `PlayerState` changes include migration logic.
- **Tagging:** beta releases are tagged semantically (e.g., `v0.3.0-beta`).

## Controls

- `ArrowUp` / `ArrowDown`: pitch
- `ArrowLeft` / `ArrowRight`: yaw
- `Q` / `E`: roll
- `W` / `S`: accelerate and decelerate
- `Space`: fire laser
- `M`: universe map
- `A` / `D`, `ArrowLeft` / `ArrowRight`, `Comma` / `Period`, or `[` / `]`: select map system
- `Enter`: jump to selected system on map, or resume from pause
- `D`: dock when near the station, or launch when docked
- `T`: trade screen when docked
- `E`: equipment bay when docked
- `Y`: shipyard when docked at a station with shipyard service
- `R`: mission board when docked
- `1`-`8`: buy one unit of the listed commodity on the trade screen
- `Shift` + `1`-`8`: sell one unit of the listed commodity on the trade screen
- `F`, `+`, `=`, or numpad `+`: buy 0.5 fuel on the trade screen
- `1`-`8`: buy visible equipment on the equipment screen
- `N` / `P`: next or previous equipment page
- `1`-`6`: compare ships in the shipyard
- `Enter`: buy selected ship in the shipyard
- `1`-`8`: accept a visible mission on the mission board
- `G`: toggle phosphor glow
- `U`: mute or unmute procedural audio
- `Escape`: pause, return, or menu

Touch controls are drawn directly on the canvas for pitch, yaw, throttle, fire, map, dock/launch, trade, and menu actions. Note that while functional, touch layout is not yet certified for all mobile devices.

## Major Systems

- **Flight & Combat:** First-person vector flight with starfield, HUD, station beacons, wireframe enemies, lasers, shields, and energy management.
- **Docking:** Animated docking corridor transitions and deterministic station service profiles.
- **Trading & Economy:** Original commodity set with a dynamic economy featuring drift, supply/demand shifts, and price history.
- **Universe Map:** Deterministic original universe with 128 systems, discovery state, and searchable/filterable map controls.
- **Shipyard:** Fleet progression with distinct ship classes, comparison tools, and equipment preservation.
- **Equipment Bay:** Upgrade catalog across weapons, cargo, fuel, shields, and specialized tools.
- **Procedural Missions:** Diverse contract types (courier, medical, salvage, etc.) with deadlines, reputation effects, and legal risks.
- **Pilot Manual:** Integrated contextual help content for all major systems.
- **Persistence:** LocalStorage save/resume with versioned validation and migration safety.
- **Aesthetics:** Minimalist wireframe rendering with optional phosphor glow and procedural Web Audio.
- **Compliance:** Verified clean-room implementation with no external IP references.

## Shipyard And Progression

Stations with shipyard service show a hull comparison screen. Select a hull with `1`-`6` or by clicking it, then press `Enter` or the buy button. Purchases deduct BAL, keep installed equipment, preserve hull and shield ratios, clamp fuel to the new tank, and block if the current cargo plus mission cargo does not fit.

## Map Search And Filters

The map includes a small search field for system names. Canvas filter buttons cycle hazard, economy, discovery, and station-service filters. Matching systems are highlighted while current, selected, nearby, and matching systems keep labels readable at the expanded map scale.

## Station Services And Missions

All stations keep fuel and basic repair access, while other services vary by deterministic station profile. Mission boards show type, destination, reward, cargo requirement, deadline, risk, reputation effect, legal effect, and required equipment where applicable.

## Recent Changes

### v0.3.0-beta — Content Systems Sprint
- **Compliance hardening:** Resolved economy labels and currency markers.
- **Universe Rotation:** Refreshed procedural seed.
- **Fleet Expansion:** Added player hulls and specialized equipment.
- **Mission Variety:** Expanded procedural contract types.
- **Browser Smoke:** Established viewport-specific QA safety net.

## Browser Smoke

Run `npm run smoke` (or `npm run test:browser`) before a public demo pass. It launches the built app locally, verifies the first playable flow, checks the real save/reload path, and exercises a 390×844 mobile viewport for clipped touch controls and docked-hint overlap.

## Known Limitations

- Docking uses a range check and animation, but not a full manual alignment simulation.
- Enemy AI has distinct behaviors, but encounters are still single-contact MVP fights.
- The station screens use compact keyboard/touch shortcuts and row clicks rather than full windowed UI controls.
- The cockpit remains minimalist and does not yet include scanner modes, comms, or detailed ship status pages.

## Roadmap

- Add trading clarity (profit/loss visibility).
- Expand fleet into data-driven classes.
- Add richer multi-contact encounters and wing behavior.
- Add stricter manual docking alignment and landing guidance.
- Add equipment resale and trade route history.
- Add audio volume controls and accessibility settings.
- Add more detailed map filtering and route plotting.
