# Public Demo Manual QA Checklist

Use this checklist for public demo release-candidate testing. Mark each item only after it has actually been tested on the named browser or device.

## Session Details

- Build or commit tested:
- Tester:
- Date:
- Desktop browser and version:
- Mobile device/browser and version:
- Notes:

## Core Flow

- [ ] First launch shows the start screen and starts a new game without console errors.
- [ ] Onboarding appears for a new run and can be dismissed cleanly.
- [ ] Continue/load is available only when a valid save exists.
- [ ] Save/load continuity preserves system, discovered systems, selected ship, balance, cargo, fuel, hull, equipment, missions, reputation, legal risk, and settings after page reload.

## Flight And Navigation

- [ ] Keyboard flight controls respond correctly: pitch, yaw, roll, throttle, fire, map, dock/launch, pause, mute, and phosphor glow.
- [ ] Touch flight controls respond correctly on a mobile-sized viewport or device.
- [ ] Docking works only when in range and transitions to the station state without control leakage.
- [ ] Universe map click-select chooses a reachable target without selecting the wrong system.
- [ ] Universe map keyboard navigation cycles systems with arrows, A/D, comma/period, and bracket keys.
- [ ] Universe map search filters by typed system name without leaving the input visible outside map mode.
- [ ] Universe map filters by hazard, economy, discovery state, and station service without breaking click or keyboard selection.
- [ ] Jump travel consumes fuel, updates the current system, and rejects jumps beyond fuel or range limits.
- [ ] Jump travel marks the destination discovered and preserves previous discoveries after reload.

## Station Services

- [ ] Market buys and sells one unit with number keys and shifted number keys.
- [ ] Market bulk buy/sell controls respect cargo capacity, available stock, owned cargo, and balance.
- [ ] Fuel purchase works from the market and respects fuel capacity and balance.
- [ ] Station dock screen clearly shows available and unavailable market, equipment, shipyard, and mission services.
- [ ] Equipment purchase works for available upgrades and blocks duplicate, unaffordable, or unstocked purchases.
- [ ] Equipment paging works by click/touch and `N` / `P`.
- [ ] Hull repair works from the equipment bay and handles full, partial, unaffordable, discounted, and already-full repair states.
- [ ] Shipyard is available at starter station and other shipyard stations.
- [ ] Shipyard compares current and selected hull stats, blocks cargo overflow, blocks unaffordable purchases, and preserves installed equipment.

## Missions

- [ ] Mission board lists missions with cargo, destination, risk, reward, and deadline details.
- [ ] Expanded mission types appear with short systemic text and required-equipment/reputation labels where applicable.
- [ ] Accepting a cargo mission reserves or loads the required cargo correctly.
- [ ] Mission cargo affects cargo capacity as expected.
- [ ] Delivering before the deadline pays the reward and updates reputation/legal-risk outcomes.
- [ ] Missing or failing a deadline produces the expected mission outcome without save corruption.

## Combat And Failure

- [ ] Enemy encounter spawns and can be damaged by laser fire.
- [ ] Enemy behavior remains responsive while the player moves, turns, and changes speed.
- [ ] Player shield and hull damage are visible and persist correctly.
- [ ] Enemy destruction grants the expected outcome and an enemy can respawn for a later encounter.
- [ ] Player death shows the death screen with run stats and cause of death.
- [ ] Restart from death creates a new playable run without stale combat, cargo, mission, or input state.

## Audio

- [ ] First user interaction unlocks audio where required by the browser.
- [ ] Mute/unmute works and persists or resets according to the current save/settings behavior.
- [ ] Procedural audio events play for launch, docking, jump, UI selection, trade, repair, laser, hit, warning, and destruction where applicable.

## Browser Smoke Tests

- [ ] `npm run test:browser` passed locally with Chrome/Chromium.
- [ ] Chrome desktop: launch, flight, dock, market, map, jump, combat, reload save.
- [ ] Firefox desktop: launch, flight, dock, market, map, jump, combat, reload save.
- [ ] Safari desktop: launch, flight, dock, market, map, jump, combat, reload save.
- [ ] Mobile Safari: touch launch, flight, dock, market, map, jump, combat, reload save.
- [ ] Mobile Chrome: touch launch, flight, dock, market, map, jump, combat, reload save.

## Release Sign-Off

- [ ] No source/test/playable compliance grep violations.
- [ ] `npm ci` passed.
- [ ] `npm run type-check` passed.
- [ ] `npm test` passed.
- [ ] `npm run build` passed.
- [ ] `npm run test:browser` passed.
- [ ] Any manual QA failures are documented with reproduction steps before release.
