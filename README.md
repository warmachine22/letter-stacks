# Word Stacks (MVP)

Grid-based word puzzle where you select any tiles to form words. Top letters are removed on submit, new letters spawn on a timer, and you lose if any stack reaches a chosen ceiling.

This repo is a static, multi-file web app (HTML/CSS/JS). No build step is required.

## Run locally (no server required)

- Double-click `index.html` to open in your browser.
- From the landing page, click Start Game to configure settings and play.
- If you prefer a local server (optional), you can use any static server (e.g. `python -m http.server` from this directory) and open `http://localhost:8000`.

Notes:
- Dictionary validation uses `https://dictionaryapi.dev/` and works over `file://`.
- If your browser blocks cross-origin requests on `file://` (uncommon on modern Chrome/Edge/Firefox), use a local server as above.

## Deploy (free static hosting)

Any static host will work (no server-side code).

- GitHub Pages
  - Place this project at the repo root (with `index.html` at root).
  - Enable Pages from the `main` branch (root). No build needed.
- Netlify
  - Drag and drop the folder in the Netlify UI, or connect the repo. Build command: none; Publish directory: root (`/`).
- Vercel
  - Import the repo, select “Other” framework. Output directory: `/`. No build.

## Project structure

```
index.html
game.html
styles/
  base.css
  landing.css
  game.css
js/
  main.js       # Landing interactions / dev toggle
  game.js       # Game runtime (state, timers, validation)
  grid.js       # Grid rendering & layout sizing
  bag.js        # Scrabble letter bag & helpers
  tempo.js      # Difficulty presets & tempo rules
  api.js        # Dictionary API wrapper with cache
  ui.js         # Toasts, modal, settings dialog, helpers
```

## Key features

- Responsive board always fits screen (mobile-first).
- Difficulty presets, grid size, and lose threshold configurable via settings modal.
- Tempo rules: shorter words speed spawns; longer words slow them.
- Dictionary validation via dictionaryapi.dev with in-memory cache.
- Centered toast notifications and post-game modal.
- Clean, keyboard-friendly controls (Enter = submit, Escape = clear).

## Settings persistence

Settings are saved in `localStorage` under the key `ws.settings` and restored on next load. The landing page link uses `game.html?showSettings=1` to prompt for settings before the first run.

## Accessibility and performance

- Accessible buttons and ARIA labels on key UI elements.
- Lightweight, framework-free; all code split into small, focused modules.

## Local development tips

- Edit files directly; a browser refresh reflects changes immediately.
- If using a local server, prefer a static server that serves this directory root (so `index.html` is at `/`).

## License

MVP for testing and internal evaluation.
