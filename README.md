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

Keyboard controls: WASD / arrow keys to move, `1`–`3` to choose upgrade cards, `R` to restart after defeat. Add `?debug=1` to expose a small verification helper: `L` opens an upgrade, `H` heals, `E` spawns a test wave, and `K` shows the defeat flow.

The gameplay background includes an original generated painterly forest atmosphere asset at `public/assets/forest-atmosphere.png`; all characters, enemies, icons, VFX, UI, SFX, and ambient music are drawn or synthesized locally. The PWA shell is defined by `public/manifest.webmanifest` and `public/sw.js`.
