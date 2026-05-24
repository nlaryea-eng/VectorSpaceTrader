# Signal Glass

Signal Glass is the presentation system for Vector Space Trader. It is a clean-room visual direction based on dark laminated panels, fine signal traces, high-contrast telemetry text, and restrained procedural feedback.

## Scope

- Presentation layer only.
- No gameplay, save schema, economy, mission, route, combat, physics, ship stat, or equipment stat changes.
- Enabled by `SIGNAL_GLASS_UI`, with UI-local preferences namespaced under `vst.signalglass.v1.*`.
- Existing Canvas action handlers remain the only path for game-state mutation.

## Tokens

- Background: cool near-black.
- Surfaces: three dark panel tiers.
- Accent: signal cyan for focus and selection.
- Secondary accent: telemetry amber for opportunity and urgency.
- Status: success, warning, danger, info, neutral, always paired with text or glyph.
- Typography: system UI and system monospace stacks only. No external font downloads.
- Radius: 8px panels, 6px controls, 4px chips.
- Motion: 120-240ms where used, disabled under reduced-motion preference.

## Layers

1. Canvas game layer.
2. HUD layer.
3. Panel layer.
4. Manual layer.
5. Modal layer.
6. Touch controls layer.
7. Toast layer.

Only the topmost interactive layer should accept pointer/focus input. HUD and toast layers are read-only.

## QA Notes

- Verify 390x844 no-overlap for HUD, panels, and touch controls.
- Verify map search and manual search do not steal each other's input.
- Verify profit/loss, mission state, route validity, affordability, and cargo overflow use text as well as color.
- Verify `npm run test:browser` before release review.
- Run the canonical CI compliance scan before commit.
