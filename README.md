# Vector Space Trader

Vector Space Trader is an original browser-based vector space-trading game.

It is a clean-room project built with TypeScript, Canvas, and procedural Web Audio. It does not use source code, assets, ship designs, universe names, text, audio, or data tables from Elite or any Elite-related source-code archive.

It is inspired by the broader tradition of classic 1980s space trading and wireframe combat games, but it is not affiliated with, endorsed by, or derived from Elite, Acornsoft, Bell & Braben, Frontier Developments, or any related rights holder.

## Install, Run, Test

```bash
npm install
npm run dev
npm run build
npm test
```

Open the local URL printed by Vite after `npm run dev`.

## Public Demo

After GitHub Pages is enabled for GitHub Actions, the public demo is published at:

https://nlaryea-eng.github.io/VectorSpaceTrader/

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

Touch controls are drawn directly on the canvas for pitch, yaw, throttle, fire, map, dock/launch, trade, and menu actions.

## Current MVP

- Start screen with new game, continue, and controls.
- First-person vector flight view with stars, HUD, station beacon, a wireframe enemy, laser fire, shield, and energy.
- Deterministic original universe map with 128 systems generated from a numeric seed.
- Discovery state for visited systems, with searchable and filterable map controls.
- Jump range and fuel checks.
- Docking and trading with original commodity set: Grain, Minerals, Computers, Medicine, Machinery, Luxuries, Fuel Cells, and Alloys.
- LocalStorage save/load with versioned validation.
- Original cockpit overlay with speed, shield, energy, balance (BAL), fuel, cargo, legal risk, and reputation panels.
- Optional phosphor glow rendering mode.
- Four original enemy ship classes with distinct wireframe geometry and combat behavior.
- Animated station docking corridor with original station geometry.
- Station service profiles that vary market depth, shipyard access, equipment stock, missions, survey work, salvage work, and repair pricing.
- Shipyard progression with six original player hulls: Mirelle, Vask Relay, Vannic Hold, Talem Range, Bront Ward, and Caldera Span.
- Equipment upgrades across weapons, cargo, fuel, shields, survey tools, repair tools, navigation, and salvage.
- Hull damage and station-side repair through the equipment bay.
- Original procedural missions across courier, fragile cargo, urgent dispatch, medical relief, survey, passenger, salvage, supply, restricted freight, and reputation-gated contracts.
- Mission deadlines, reserved mission cargo capacity, reputation changes, legal-risk changes, dynamic economy drift, supply/demand changes, and price history.
- Procedural Web Audio effects for lasers, hits, destruction, jumps, docking, trading, UI selection, and warnings.

## Shipyard And Progression

Stations with shipyard service show a hull comparison screen. Select a hull with `1`-`6` or by clicking it, then press `Enter` or the buy button. Purchases deduct BAL, keep installed equipment, preserve hull and shield ratios, clamp fuel to the new tank, and block if the current cargo plus mission cargo does not fit.

## Map Search And Filters

The map includes a small search field for system names. Canvas filter buttons cycle hazard, economy, discovery, and station-service filters. Matching systems are highlighted while current, selected, nearby, and matching systems keep labels readable at the expanded map scale.

## Station Services And Missions

All stations keep fuel and basic repair access, while other services vary by deterministic station profile. Mission boards show type, destination, reward, cargo requirement, deadline, risk, reputation effect, legal effect, and required equipment where applicable.

## Recent Changes

### Compliance hardening pass:
- Renamed “Frontier” economy type to “Periphery”.
- Rotated procedural universe seed.
- Replaced HUD “CR” label with “BAL”.
- Confirmed build and test suite pass.
- Maintained clean-room implementation with original code, procedural audio, and original wireframe assets.

## Known Limitations

- Docking uses a range check and animation, but not a full manual alignment simulation.
- Enemy AI has distinct behaviors, but encounters are still single-contact MVP fights.
- The station screens use compact keyboard/touch shortcuts and row clicks rather than full windowed UI controls.
- The cockpit remains minimalist and does not yet include scanner modes, comms, or detailed ship status pages.

## Roadmap

- Add richer multi-contact encounters and wing behavior.
- Add stricter manual docking alignment and landing guidance.
- Add equipment resale and trade route history.
- Add audio volume controls and accessibility settings.
- Add more detailed map filtering and route plotting.
