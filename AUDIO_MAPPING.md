# Neon Horizon Audio Mapping

## Audio Identity
A polished cinematic synthwave soundscape. Atmospheric, immersive, and low-fatigue.

## SFX Mapping
| Event | Trigger | Intended Volume | Behavior |
|-------|---------|-----------------|----------|
| `laser` | Player fires laser | 0.04 | Short sawtooth burst |
| `hit` | Projectile hits ship | 0.05 | Impact thud |
| `destroyed` | Ship is destroyed | 0.1 | Low-frequency rumble |
| `jump` | Hyperspace jump | 0.04 | Ascending sweep |
| `dock` | Station docking | 0.03 | Mechanical sequence |
| `ui` | Button click | 0.02 | High-frequency pluck |
| `warning` | Hazard alert | 0.04 | Pulsing square wave |
| `missionAccepted` | accepting contract | 0.04 | Major chord pluck |
| `missionComplete` | mission success | 0.04 | Arpeggiated sequence |

## Ambient Loops
| Mode | Trigger | Volume | Description |
|------|---------|--------|-------------|
| `docked` | At station | 0.04 | Low-pass synth drone |
| `flight` | In space | 0.03 | Cinematic engine hum |
| `combat` | Near enemies | 0.02 | Intense rhythmic pulse |

## Technical Implementation
- **Separate Volume Controls:** Music and SFX can be adjusted independently via the Settings menu.
- **Fade Transitions:** Ambient layers fade in and out over 1-2 seconds to prevent pops.
- **Asset Support:** `ModernAudio` class is ready for high-fidelity OGG/MP3 assets.
