# NEON RUSH 3D

Premium endless runner (React + Vite + React Three Fiber + Zustand).

## Run

```bash
cd ~/Desktop/neon-rush-3d
npm install
npm run dev
```

Open the printed URL (Vite is bound to `127.0.0.1`). Prefer Chrome/Safari with WebGL enabled.

Production build:

```bash
npm run build
npm run preview
```

## Controls

| Action | Desktop | Touch |
| --- | --- | --- |
| Start / restart | Enter / Space / R (game over) | Start / Run again button |
| Lane left / right | ← → or A D | Swipe L/R or on-screen arrows |
| Jump | Space / ↑ / W | Swipe up |
| Slide | ↓ / S | Swipe down |
| Pause | Esc / P | Pause button |
| Mute SFX | M | Speaker button |

Audio unlocks after the first user gesture (Start / key / tap).

## Gameplay systems

- **Speed**: base `14`, ramp `0.016` per distance unit, cap `34` (`CONFIG.speed` in `src/game/config.js`).
- **Biomes** (every `100` meters): Neon City → Desert Highway → Snow City → Jungle Ruins → Sky Metropolis → repeat. Fog, lighting, road, and scenery blend over ~3s. Banner announces each world.
- **Traffic**: oncoming cars, taxis, buses, trucks, police vehicles (pooled).
- **Trains**: oncoming trains with warning banner; occasional rideable same-direction trains with rooftop coins.
- **Magnet** (12s): pulls nearby coins (radius `3.4`).
- **Jetpack** (8s): rise to aerial lane, ignore ground obstacles, aerial coin trails; soft landing clears nearby walls.
- **Shield**: absorbs one eligible hit (charge-based).
- **Score multiplier** (15s): `×2` distance/score contribution.
- **Hoverboard** (10s): absorbs one collision while active.
- **Chase**: police officer + dog pursuit with tension states `far` → `approaching` → `close` → caught (game over). Stumbles raise tension; clean running recovers it.

Stacking: timed powers run in parallel; shield/hoverboard are charges that consume on hit (hoverboard preferred after shield is gone). Jetpack disables jump/slide while flying. All timers use **game time** (paused / tab-capped delta).

## Tunables

Edit `src/game/config.js`:

- `speed.*`, `biome.distanceStep`, `biome.blendSeconds`
- `magnet`, `jetpack`, `multiplier`, `hoverboard`, `chase`
- `spawn.seed`, pool sizes, `maxDelta`, `hudSync`

Biome palettes: `BIOME_META` in the same file.

## Dev testing (development build only)

On-screen **DEV** panel during a run, or keyboard:

| Key | Effect |
| --- | --- |
| `1`–`5` | Grant magnet / jetpack / shield / multiplier / hoverboard |
| `]` / `[` | Next / previous biome |

DEV panel also: **+100m**, **Spawn Car**, **Spawn Train**, **+Speed**, **Reset Diff**.

Not available in production builds (`import.meta.env.DEV`).

## Mobile / iPad notes

- Safe-area padding on HUD; touch controls on coarse pointers / narrow viewports.
- DPR capped for mobile in `App.jsx`; particle/scenery density should stay light.
- If the canvas is blank, enable hardware acceleration / WebGL or try Safari; the app shows a WebGL fallback card when context creation fails.

## Architecture

- Simulation: `src/game/world.js` (delta-capped `step`)
- Render: `Scene.jsx`, `Track.jsx`, `Runner.jsx`, `Chase.jsx`, `Powerups.jsx`
- UI store: `store.js` + `Hud.jsx` (selectors; sync ~10 Hz)
- Input: `useInput.js`

## Manual check list

1. Start → countdown → run; pause / resume / menu / restart reset speed, biome, powers, chase.
2. Survive past 750 / 1500 / 2250 / 3000 for biome banners and visible world changes.
3. Collect each power-up; verify HUD timers, magnet pull, flight + landing, shield/board absorption, score ×2.
4. Stumble near pursuers until “close”; confirm catch only when tension is high.
5. Mute with M; confirm SFX stop.
6. `npm run build` succeeds.

Device testing on iPhone/iPad is not claimed unless performed on that hardware.
