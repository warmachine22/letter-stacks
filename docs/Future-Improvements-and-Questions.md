# Future Improvements & Questions

Status
- Branding: standardized to “Letter Stacks” across user-visible UI (page title, headers). Keep this as the canonical name in all future copy/design.
- Dictionary: Local offline dictionary with strict validation (no fallback). The Service Worker pre-caches data/words.json for offline play.

Overview
This document outlines product decisions and enhancements in plain language. For each item you&#39;ll find:
- What this is: a simple description of the feature/issue.
- Why it matters: how it impacts players or product goals.
- Options: viable paths forward.
- Recommendation: a clear path to move ahead.
- Effort: rough engineering effort (Low / Medium / High).

---

## Open questions (needs product decision)

### 1) How should difficulty and pace adapt after each word?
- What this is: After you submit a word, the game changes how quickly new letters appear (the timer) and how many letters appear at once. Short words make the game speed up; longer words slow it down. There&#39;s a special rule: when the game is already dropping many letters per cycle (3 or more), a short word can increase that number by +1 (up to 4).
- Why it matters: This directly controls how intense the game feels. It impacts fairness, predictability, and how "spiky" difficulty feels across levels.
- Options:
  - a) Tie the special “+1 letter” rule only to the hardest levels (Level 19+), keeping earlier levels steadier.
  - b) Keep current behavior: whenever 3+ letters are already dropping, a short word can push it to +1 (max 4), at any level.
  - c) Turn off the “+1 letter” rule for a steadier experience overall.
  - d) Regardless of the rule, show a small on-screen note the first time quantity changes so players understand why the pace shifted.
- Recommendation: a) Limit "+1 letter" to Level 19+; and d) add a short note the first time it triggers, reducing surprise.
- Effort: Low for rule adjustment; Low–Medium to add the explanatory note.

---

### 2) Scoreboard management options
- What this is: The game stores your completion time per level and supports filtering and sharing; there&#39;s currently no delete or "clear all".
- Why it matters: Players may want to reset their history, remove specific runs, or focus on personal bests.
- Options:
  - a) Add a "Clear All Scores" button.
  - b) Allow deleting a single entry.
  - c) Show "Best Time per Level" with an optional "See All Runs" detail view.
  - d) Export/Import scores for moving to another device.
- Recommendation: a) "Clear All" + c) "Best Time per Level" for immediate clarity; consider b) per-entry delete later if requested.
- Effort: Low (a, c); Medium (d).

---

### 3) What link should the Share button use?
- What this is: When players share achievements, the game shares a URL.
- Why it matters: A stable, simple link improves sharing and avoids confusion. Marketing may want to track share-driven visits.
- Options:
  - a) Always share the home page (index.html).
  - b) Use a dedicated "/share" page to highlight achievements and track visits.
  - c) Keep the current link but add a small tracking code (e.g., "?shared=1") to measure shares.
- Recommendation: a) Use the home page now; consider c) adding a simple tracking code later.
- Effort: Low.

---

### 4) Word validation strictness (online dictionary vs. fallback)
- What this is: Words are checked against an online dictionary. If the internet is down or slow, the game (by default) accepts any word so you can keep playing.
- Why it matters: Balances reliability (works offline / spotty internet) with fairness (only real words are allowed). For competitive play, strict checking is preferred.
- Options:
  - a) Add a menu setting: "Require dictionary check" (On/Off). Off = more reliable; On = stricter.
  - b) Keep allowing any word when the dictionary fails, but show a small on-screen note when this fallback occurs.
  - c) Bundle a small offline word list to validate common words even without internet.
- Recommendation: a) Add the setting; default Off for beta, On for official releases. Consider c) later if strict offline play becomes a priority.
- Effort: Low (a, b); Medium (c).

---

### 5) Lose condition timing (immediate vs. grace period)
- What this is: You lose immediately if any stack reaches the chosen limit (e.g., 7 tiles), whether from auto-spawn or pressing "Drop".
- Why it matters: Immediate loss is fair but can feel abrupt if a spawn lands while the player is mid-action.
- Options:
  - a) Keep immediate loss (current).
  - b) Add a short "grace" window (e.g., 0.5s) after a spawn to allow quick reactions.
  - c) Only check for loss right after the player submits (softer, but less intense).
- Recommendation: Keep a) immediate loss as default; consider b) a short grace option in Settings for accessibility.
- Effort: Low.

---

### 6) Accessibility (a11y) enhancements
- What this is: Ensure modals, buttons, and keyboard navigation work smoothly for everyone, including screen reader users.
- Why it matters: Inclusion and ease-of-use; helps keyboard-only users and improves overall polish.
- Options:
  - a) Ensure all core buttons have accessible labels and clear descriptions (Drop, Submit, Menu).
  - b) Trap keyboard focus inside modals; allow Esc to close.
  - c) Provide a high-contrast theme; ensure text size and contrast meet readability guidelines.
- Recommendation: Implement a) and b) now; consider c) as part of themes below.
- Effort: Low.

---

### 7) Device targets and small screens
- What this is: The game runs on phones and desktops; very small screens can make tiles hard to read or tap.
- Why it matters: Comfort, fewer mis-taps, and good performance broaden audience and satisfaction.
- Options:
  - a) Enforce a minimum tile size (e.g., 32px) and adjust layout accordingly.
  - b) Reduce visual effects on very small screens to keep performance smooth.
  - c) Lower animation frequency when the tab is hidden or on very slow devices to save battery.
- Recommendation: Do a) and c) now; consider b) if performance issues appear on low-end devices.
- Effort: Low.

---

## Potential improvements

### 1) In‑game tutorial / first‑run tips
- Purpose: Faster onboarding without reading a manual.
- Idea: A short, dismissible overlay: "Select any tiles, 3+ letters" and "Drop spawns one letter instantly." Show once on first run.
- Player value: Reduces confusion; boosts confidence early.
- Effort: Low–Medium (UI copy, a small overlay, one-time logic).

---

### 2) Pause button and visible run timer
- Purpose: Clarity and control; players can take a break and see progress.
- Idea: Add "Pause" in the menu; freeze spawns and the timer. Show elapsed time in the header or near the board.
- Player value: Feels fair and professional; supports casual play and interruptions.
- Effort: Low–Medium.

---

### 3) Offline/cached dictionary subset
- Purpose: Reliability and speed when internet is poor or blocked.
- Idea: Bundle a small local word list (common words). Check it first; fall back to online service if needed.
- Player value: Fewer interruptions; more consistent validation.
- Effort: Medium (wordlist curation, storage considerations).

---

### 4) Enhanced spawn preview and countdown clarity
- Purpose: Help players plan better.
- Idea: In addition to per-tile overlays, show "Next: 2 tiles in 3.4s" near the Drop button; add subtle emphasis as the timer nears zero.
- Player value: Fewer surprises; better strategic choices.
- Effort: Low–Medium.

---

### 5) Visual themes, including high‑contrast mode
- Purpose: Personalization and accessibility.
- Idea: Add "Theme: Default / High Contrast / Dark+" in Settings; save choice locally.
- Player value: Comfort and readability for different users and environments.
- Effort: Low (CSS variables and theme toggle).

---

### 6) Scoreboard enhancements (best‑of and housekeeping)
- Purpose: Clearer personal progress and data control.
- Idea: Show "Best time per level" at a glance; add a "Clear All" button; optionally export/import scores.
- Player value: Motivation; ownership of saved data.
- Effort: Low (best-of, clear all); Medium (export/import).

---

### 7) Performance polish (as needed)
- Purpose: Keep the game smooth, especially on older phones.
- Idea: Only re-render tiles that actually change (instead of rebuilding the whole grid); throttle animations when off-screen.
- Player value: Smoother play and better battery life.
- Effort: Medium (targeted optimization and testing).

---

## Notes
- Internal developer keys (e.g., localStorage keys using "wordStacks") are not player-facing; they can remain as-is unless you prefer internal renaming for consistency. Renaming internal keys may disrupt previously saved settings for existing players.
