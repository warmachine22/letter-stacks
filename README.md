# Letter Stacks

A fast word‑stacking puzzle. Select any tiles (no adjacency rule) to form words. Submitting removes the top letter from each selected stack; new letters spawn on a timer (or on‑demand via “Drop”). You can optionally lose if any stack reaches a chosen height.

This is a static HTML/CSS/JS project; no build step required.

## Run locally

- Double‑click `index.html` (or serve the directory with a static server such as `python -m http.server`).
- From the landing page, click “Start Game” to configure settings.

Notes:
- Dictionary validation uses https://dictionaryapi.dev/.
- If your browser blocks cross‑origin requests under `file://`, use a local static server.

## Live deploy (static hosting)

Any static host will work (no server‑side code).

- GitHub Pages
  - Ensure this project lives at the repo root (with `index.html` at root).
  - Enable Pages from the `main` branch (root). No build needed.
- Netlify
  - Drag-and-drop the folder, or connect the repo. Build: none. Publish: `/`.
- Vercel
  - Import the repo, framework “Other”. Output directory: `/`. No build.

## Project structure

```
index.html
game.html
styles/
  base.css
  landing.css
  game.css
js/
  main.js       # Landing interactions
  game.js       # State, timers, next-targets, submissions
  grid.js       # Rendering, sizing, warn/fill visuals
  bag.js        # Scrabble-letter bag + shuffle/returns
  tempo.js      # Difficulty presets & tempo rules
  api.js        # Dictionary API wrapper with cache
  ui.js         # Toasts, modals (settings/menu/end), helpers
```

## Core mechanics

- Select any tiles (no adjacency constraint). Minimum word length: 3.
- Submit:
  - Removes the top letter from each selected stack.
  - Returns the removed letters to the bag (see Bag & Randomness).
  - Recomputes tempo (spawn interval/quantity) based on word length + difficulty (see below).
- Spawning:
  - Next targets are preselected and now blink (yellow‑dashed outline) for the entire countdown.
  - Spawn prioritizes empty tiles first (random among empties). If insufficient, remaining letters are placed randomly anywhere.
- Manual Drop (▼):
  - Click to instantly drop exactly one letter, using the next‑target randomness.
  - Resets the spawn timer as if a spawn occurred.
  - Remaining next targets keep blinking; repeated clicks can drop more, one per click.
- Win/Lose:
  - Win: when the board is fully cleared. Loop‑level guard prevents race conditions.
  - Lose (optional): if any stack reaches the chosen threshold.

## Bag & randomness

- Scrabble‑like distribution (no blanks). The bag is scaled to grid size and fully shuffled (Fisher–Yates).
- When the bag empties, it refills with a freshly shuffled distribution.
- Used letters are returned to random positions and diffused by extra swaps to avoid near‑term repetition.

## Difficulty & tempo

Difficulty presets (base cadence and spawn quantity):

- Easy:   1 letter every 10s
- Medium: 1 letter every 7s
- Hard:   2 letters every 5s
- Insane: 3 letters every 4s

After each valid submission, tempo updates from word length:

- 3 letters: speeds up (interval = base × 0.6, floor 3s). On Insane, spawn quantity can increase by +1 (max 4).
- 4 letters: neutral (interval = base).
- 5+ letters: slows down (interval = base × 2, cap 12s).

## Settings

- Difficulty: Easy, Medium, Hard, Insane. (ⓘ panel explains cadence and tempo rules.)
- Grid Size: 4–10.
- Lose at Stack: Off, 5, 6, 7, 8, 9, 10. (If Off, Fill‑mode visual is disabled.)
- Stack Display:
  - Default: small top‑right number, warn/danger backgrounds at threshold percentages.
  - Fill: bottom‑up fill bar proportional to (stack / threshold).
    - Green 0–50%, Orange >50–70%, Red >70% (urgent).

Settings persist in `localStorage` as `ws.settings`.

## Controls

- Click/tap tiles to toggle selection.
- Enter: Submit word
- Escape: Clear selection
- ▼ Drop: Instantly spawn exactly one letter and reset timer
- ☰ Menu: Settings / Reset / Home

## Accessibility & UX

- 44px minimum tap targets on modal/menu buttons and selects.
- Readable font sizes via `clamp()` on mobile.
- Tiles prewarn with a visible dashed outline for the entire countdown.

## User Guide

See `guide.html` (User Guide) for a player‑friendly overview. A “Beta” notice appears there; testing and feedback are encouraged.

## Changelog (high‑level)

- c5ba76f — Feature: manual Drop button (instant single‑tile spawn); respects randomness; resets timer; keeps targets blinking.
- 3efe647 — UX: next spawn targets blink for the entire countdown to prevent surprise swaps.
- ec54ea5 — Copy: win message suggests trying a higher difficulty.
- 93bd663 — Settings UX: thresholds 5–10; Difficulty info panel; Stack Display (Default/Fill) with fill bar + colors; persistence wiring.
- a0222d5 — Gameplay UX: warn/danger tied to threshold; blank‑first spawns; stronger bag randomness; loop‑level win check; user guide updates.
- e0dba0c — Mobile UI: smaller top‑right number; larger modal/menu/select font sizes; 44px tap targets; spacing via `.form-row`.
- b047189 — Initial commit.

## Local development tips

- Edit files directly; refresh the browser.
- Use a static server if your browser restricts XHR from `file://`.

## License

MVP for testing and internal evaluation.
