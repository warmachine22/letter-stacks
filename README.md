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

Choose a Level (1–26). Each level sets a base cadence and spawn quantity:

- Levels 1–6: 1 tile every 10→5s (higher levels are faster)
- Levels 7–12: 2 tiles every 10→5s
- Levels 13–18: 3 tiles every 10→5s
- Level 19: 3 tiles every 4s
- Level 20: 4 tiles every 10s
- Levels 21–24: 4 tiles every 8→5s
- Level 25: 5 tiles every 6s
- Level 26 (Extreme): 6 tiles every 6s (fixed tempo)

Targeting:
- Levels 7–25: when 2+ tiles drop, 1 targets the tallest stack (random among ties); the rest are random anywhere.
- Level 26 (Extreme): of the 6 targets each cycle, 2 go to the tallest stack(s); the remaining 4 are random anywhere.

Tempo behavior:
- Tempo is fixed per level. Submitting words does not change the timer, and the game does not accelerate when idle.

Extreme level (26):
- Fixed tempo: 6 tiles every 6s.
- Targeting mechanic: of the 6 targets each cycle, 2 go to the tallest stack(s) on the board (random among ties); the remaining 4 are random anywhere.

## Letter selection and balance

- Baseline bag: Letters come from a Scrabble‑style mix (vowels and consonants) with shuffled bags. When the bag empties, it refills automatically (so you never “run out”).
- Decide at the moment: Each letter is decided right when it appears (timer spawn or Drop), not earlier. This avoids “pre‑batched” streaks.
- Gentle balancing: If the visible top layer of tiles has too many vowels (≈35% or more), the game prefers to spawn a consonant. If it’s very consonant‑heavy (≈25% or fewer vowels), it prefers a vowel. It scans a small slice of the bag for a good match; if none is found quickly, it just uses the next natural draw. This keeps play fair and prevents getting “stuck.”
- Preserves variety: Rare letters still show up; nothing is hard‑blocked. This is a slight nudge, not a rewrite of the distribution.

### Vowel meter (debug/insight)

- The header (top‑left) shows “V: NN%”, the percentage of visible vowels (top letters only). This helps you see balance in real time while playing.

## Scoreboard (local)

Your completion time is saved locally per level (no backend). Open ☰ Menu → Scoreboard to:
- Filter by level
- Share using your device’s share sheet when available
- Fall back to clipboard copy and mailto links when needed

Data is stored in `localStorage` under `ws.scores`.

## Settings

- Board: fixed 5×6 (5 across, 6 down)
- Level: 1–26 (Extreme optional)
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
  game.js       # State, timers, level mapping, next-targets, submissions (fixed tempo per level)
  grid.js       # Rendering, responsive sizing, on-tile spawn clocks & fill
  bag.js        # Scrabble-like letter bag + shuffle/returns
  tempo.js      # legacy (unused)
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
- If you don’t see recent changes (new UI or behavior), do a hard reload (Ctrl+F5 / Cmd+Shift+R). You can also use DevTools → Application → Service Workers → Update/Unregister then reload.
- Note: Service Workers are not active under `file://` URLs; use a local server.

## License

MVP for testing and internal evaluation.
