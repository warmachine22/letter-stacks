# Letter Stacks

A fast, mobile‑friendly word‑stacking puzzle. Select any tiles (no adjacency rule) to form words. Submitting removes the top letter from each selected stack. New letters spawn on a timer (or instantly via Drop). The board is fixed to 5×6.

Tiles that will receive the next spawn show an on‑tile circular countdown clock (rotating hand with a trailing wedge). The Drop (▼) button also shows the countdown.

## Quick start

- Open `index.html` in a modern browser, or serve the folder with a static server (e.g. `python -m http.server`).
- Click “Start Game”, pick a Level and threshold, and play.

Notes:
- Word validation uses a local offline dictionary at `data/words.json` (cached by the Service Worker).
- If your browser restricts XHR under `file://` or you want the Service Worker to work, use a local static server.

## How to play

- Select letters: tap/click any tiles (no adjacency). Minimum word length is 3.
- Submit: removes the top letter from each selected stack and returns those letters to the bag.
- Spawning:
  - Next‑target tiles display a circular countdown clock for the entire countdown.
  - Press Drop (▼) to instantly spawn exactly one letter and reset the timer. Repeated clicks can drop more, one per click.
- Win: clear the entire board.
- Optional lose: if any stack reaches the chosen threshold (5–10).

## Levels and tempo

Choose a Level (1–20). Each level sets a base cadence and spawn quantity:

- Levels 1–6: 1 tile every 10→5s (higher levels are faster)
- Levels 7–12: 2 tiles every 10→5s
- Levels 13–18: 3 tiles every 10→5s
- Level 19: 3 tiles every 4s
- Level 20: 4 tiles every 10s

After each valid submission, the tempo adapts based on word length:

- 3 letters: speeds up (shorter interval, floor 3s)
- 4 letters: neutral (base interval)
- 5+ letters: slows down (longer interval, cap 12s)

## Scoreboard (local)

Your completion time is saved locally per level (no backend). Open ☰ Menu → Scoreboard to:
- Filter by level
- Share using your device’s share sheet when available
- Fall back to clipboard copy and mailto links when needed

Data is stored in `localStorage` under `ws.scores`.

## Settings

- Board: fixed 5×6 (5 across, 6 down)
- Level: 1–20
- Lose at Stack: 5–10
- Countdown also appears inside the Drop (▼) button

Settings persist in `localStorage` under `ws.settings`.

## Controls

- Click / tap tiles: toggle selection
- Enter: submit word
- Escape: clear selection
- ▼ Drop: instantly spawn one letter and reset timer
- ☰ Menu: Settings / Scoreboard / Reset / Home

## Project structure

```
index.html
game.html
guide.html
sw.js
data/
  words.json
styles/
  base.css
  landing.css
  game.css
js/
  main.js       # Landing interactions
  game.js       # State, timers, level mapping, next-targets, submissions
  grid.js       # Rendering, responsive sizing, on-tile spawn clocks & fill
  bag.js        # Scrabble-like letter bag + shuffle/returns
  tempo.js      # Level mapping & tempo rules (word-length-based adjustments)
  api.js        # Local dictionary loader (loads data/words.json; strict membership check)
  ui.js         # Toasts, modals (settings/menu/scoreboard/end), helpers
```

## Run locally / Deploy

- Local: double‑click `index.html` or run a static server.
- Any static host works (no build, no backend):
  - GitHub Pages: serve from repo root (no build).
  - Netlify/Vercel: framework “Other”, output `/`, no build step.

## Tech

- Static HTML/CSS/JS modules; no build step required
- Persists settings and scores via `localStorage`
- Dictionary validation via local offline dictionary (`data/words.json`). A Service Worker pre-caches all assets for offline play.

## Offline

- A Service Worker (sw.js) pre-caches the app shell and `data/words.json` on first load over HTTP(S).
- Test locally: run a static server (e.g., `python -m http.server 8000`), load the app once, then switch DevTools to "Offline" and reload.
- Note: Service Workers are not active under `file://` URLs; use a local server.

## License

MVP for testing and internal evaluation.
