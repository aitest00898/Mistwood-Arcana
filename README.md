# 霧林秘典 · Mistwood Arcana

A portrait-first, original Canvas roguelike survivor game reconstructed from the supplied visual reference. It uses Vite + TypeScript and does not depend on a game engine or external proprietary art.

## Run

```bash
cd "/Users/joe/Ai DEV/Game Dev/Mistwood-Arcana"
npm install
npm start
```

Then open `http://localhost:5173/` in a browser. On a compatible mobile browser, use the share menu's “Add to Home Screen” action to install the PWA. Do not double-click `index.html`; the TypeScript modules and service worker need the Vite local server.

To verify the project without starting a server:

```bash
npm run check
```

For a production bundle:

```bash
npm run build
npm run preview
```

Keyboard controls: WASD / arrow keys to move, `1`–`3` to choose upgrade cards, `R` to restart after defeat. On mobile, touch-drag anywhere on the game surface to move; a short tap is reserved for UI selection. Add `?debug=1` to expose a small verification helper: `L` opens an upgrade, `H` heals, `E` spawns a test wave, `X` spawns all enemy species, `U` equips an 8-attack mixed stress loadout, `I` equips the first 8 attacks at rank 5, and `K` shows the defeat flow.

The gameplay background includes an original generated painterly forest atmosphere asset at `public/assets/forest-atmosphere.png`; all characters, enemies, icons, VFX, UI, SFX, and ambient music are drawn or synthesized locally. The PWA shell is defined by `public/manifest.webmanifest` and `public/sw.js`.

The current combat expansion is documented in [`docs/combat-expansion.md`](docs/combat-expansion.md). It includes 15 data-driven attacks in addition to the starting lightning orb, a maximum of 8 equipped attacks, adaptive visible-viewport upgrade cards, bounded WebAudio buses, and high-resolution selection art separate from 16-direction gameplay atlases.

## Performance verification

The normal game path keeps all gameplay, animation, particles, and electrical VFX enabled. An opt-in profiler is available for repeatable measurements:

```text
?debug=1&perf=stress
```

This creates a fixed stress scene with 78 live enemies, 5 lightning orbs, 7-link chains, particles, flashes, and floating damage text. The profiler output is only shown when `perf` is present. For an A/B comparison against the previous per-frame world and lightning paths, use:

```text
?debug=1&perf=stress&legacyWorld=1&legacyLightning=1
```

The full three-run baseline and optimized results are recorded in [`docs/performance-baseline.md`](docs/performance-baseline.md). The optimized world path pre-renders static terrain layers, reuses seeded static geometry, culls off-camera details, reuses orbital positions within a frame, and caches only the existing 22ms-tick main lightning path. The branch lightning keeps its original per-frame motion.
