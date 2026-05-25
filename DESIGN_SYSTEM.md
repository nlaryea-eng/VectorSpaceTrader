# Vector Space Trader Design System (2026 Edition)

Current UI note: `docs/design/SIGNAL_GLASS.md` is the source of truth for the active Signal Glass presentation system. This document is retained as background design guidance and must not introduce font downloads or bundled font assets.

## Visual Identity
The visual identity of Vector Space Trader combines a deep dark-mode foundation with high-contrast vector accents, glassy overlays, and compact cockpit readability.

### Color Tokens
- **Background Deep:** `#020408` (Primary background)
- **Background Surface:** `#0a0e14` (Panels and cards)
- **Background Glass:** `rgba(10, 14, 20, 0.7)` (Translucent overlays)
- **Accent Pink:** `#ff007f` (Secondary accent, enemies, danger)
- **Accent Teal:** `#00f2ff` (Primary accent, friendly systems, interactive)
- **Accent Amber:** `#ffaa00` (Tertiary accent, warnings, station)
- **Accent Violet:** `#8a2be2` (Atmospheric, stars)
- **Text Primary:** `#f0f4f8` (High readability)
- **Text Secondary:** `#94a3b8` (Supporting info)
- **Text Dim:** `#64748b` (Tertiary info)

### Typography
- **Primary UI:** System UI stack only, tuned for compact cockpit readability.
- **Accent UI:** Geometric/grotesk style direction is descriptive only and must resolve through local or system fallback fonts.
- **Monospace:** System monospace stack only for telemetry, prices, and technical values.
- **Font loading policy:** No remote font imports and no bundled font files.
- **Numerals:** Use tabular numerals for telemetry and prices where supported.

### Component Styles
- **Buttons:** Rounded corners (4px), glass effect, neon borders.
- **Panels:** Frosted glass effect, subtle glow borders, 8px corner radius.
- **HUD:** Streamlined side panels, group vitals vs status, modern progress bars.

## UX Improvements
- **HUD:** Reduced clutter, better visual hierarchy for critical information.
- **Mobile:** Adaptive on-screen controls that respond to screen size.
- **Micro-interactions:** Subtle glows, smooth transitions, tactile feedback.
