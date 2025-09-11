/**
 * Letter Stacks — Streamlined MVP
 * - Settings via modal (gear button)
 * - No scoring, no run-left timer
 * - Header shows Next Spawn only; Home/Reset live in header
 * - Start from landing opens with settings modal (?showSettings=1)
 */

import { checkWord, ensureDictionary } from "./api.js";
import { buildBag, drawLetter, returnLettersBack } from "./bag.js";
import { renderGrid, paintBlink, layoutBoard } from "./grid.js";
import { showToast, showEndModal, showSettingsModal, showMenuModal, showScoreboardModal } from "./ui.js";

/* ============================
 * Settings (persisted)
 * ============================
 */
const SETTINGS_KEY = "ws.settings";
function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    // Defaults: Level 1 and threshold 6
    if (!raw) return { level: 1, threshold: "6" };
    const obj = JSON.parse(raw);

    // Threshold: coerce to 5–10
    let thr = String(obj.threshold ?? "6");
    const tn = parseInt(thr, 10);
    if (!Number.isFinite(tn) || tn < 5 || tn > 10) thr = "6";

    // Level: prefer obj.level, else migrate from legacy difficulty, else default to 1
    let lvl = parseInt(obj.level, 10);
    if (!Number.isFinite(lvl)) {
      const d = String(obj.difficulty ?? "").toLowerCase();
      if (d === "easy") lvl = 1;               // 1×10s
      else if (d === "medium") lvl = 4;        // 1×7s
      else if (d === "hard") lvl = 12;         // 2×5s
      else if (d === "insane") lvl = 19;       // 3×4s
      else lvl = 1;
    }
    // Clamp within 1–25
    if (lvl < 1) lvl = 1; if (lvl > 25) lvl = 25;

    return {
      level: lvl,
      threshold: thr
    };
  }catch{
    return { level: 1, threshold:"6" };
  }
}
function saveSettings(s){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

// Scores (local) — minimal helpers
const SCORES_KEY = "ws.scores";
function getScores(){
  try{
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  }catch{
    return [];
  }
}
function addScore(score){
  const arr = getScores();
  arr.push(score);
  localStorage.setItem(SCORES_KEY, JSON.stringify(arr));
}

/* ============================
 * State
 * ============================
 */
let settings = loadSettings();           // { level, threshold }
const GRID_COLS = 5;
const GRID_ROWS = 6;

let STACK_CEILING = parseInt(settings.threshold, 10) || 7;

let bag = [];
let gridStacks = [];                     // array<array<string>>
let selected = new Set();                // Set<number>
let tallCooldown = new Map();            // Map<idx, remaining cycles> for tallest-pick cooldown

// Balanced letter-draw configuration (tunable)
const VOWEL_RATIO_MAX = 0.35; // if visible vowels ≥ 35%, prefer a consonant
const VOWEL_RATIO_MIN = 0.25; // if visible vowels ≤ 25%, prefer a vowel (board is consonant-heavy)
const SCAN_WINDOW     = 64;   // how many items from the bag top to scan for a desired type

function isVowel(ch){
  const c = (ch || "").toUpperCase();
  return c === "A" || c === "E" || c === "I" || c === "O" || c === "U";
}

/**
 * Count visible top-layer composition only (what players can actually see/play)
 */
function countVisibleTop(){
  let total = 0, vowels = 0;
  const totalTiles = GRID_ROWS * GRID_COLS;
  for (let i = 0; i < totalTiles; i++){
    const top = topLetterAt(i);
    if (!top) continue;
    total++;
    if (isVowel(top)) vowels++;
  }
  return { total, vowels };
}

function updateVowelMeter(){
  const meter = document.getElementById("vowelMeter");
  if (!meter) return;
  const { total, vowels } = countVisibleTop();
  const pct = total ? Math.round((vowels / total) * 100) : 0;
  meter.textContent = `V: ${pct}%`;
}

/**
 * Draw a letter right at spawn time with a gentle bias based on visible composition.
 * - Prefers consonant if visible vowels are high; prefers vowel if consonants are high.
 * - Scans a small window from the top of the bag; falls back to normal draw if none found.
 */
function drawLetterBalanced(){
  if (!bag.length){
    const refill = buildBag(GRID_ROWS, GRID_COLS);
    bag.push(...refill);
  }
  const { total, vowels } = countVisibleTop();
  const ratio = total > 0 ? (vowels / total) : 0;

  // Prefer consonant if visible vowels are high
  if (ratio >= VOWEL_RATIO_MAX){
    const start = Math.max(0, bag.length - SCAN_WINDOW);
    for (let i = bag.length - 1; i >= start; i--){
      const L = bag[i];
      if (!isVowel(L)){
        bag.splice(i, 1);
        return L;
      }
    }
  }
  // Prefer vowel if visible vowels are low (board is consonant-heavy)
  else if (ratio <= VOWEL_RATIO_MIN){
    const start = Math.max(0, bag.length - SCAN_WINDOW);
    for (let i = bag.length - 1; i >= start; i--){
      const L = bag[i];
      if (isVowel(L)){
        bag.splice(i, 1);
        return L;
      }
    }
  }
  // Default: normal last-in draw
  return bag.pop();
}

/**
 * Map level (1–25) to base interval (ms) and spawn quantity.
 * Levels:
 *  1–6:  1 tile every 10..5s
 *  7–12: 2 tiles every 10..5s
 * 13–18: 3 tiles every 10..5s
 * 19:    3 tiles every 4s
 * 20:    4 tiles every 10s
 * 21–24: 4 tiles every 8..5s
 * 25:    5 tiles every 6s
 */
function presetForLevel(level){
  let qty = 1, secs = 10;
  if (level >= 1 && level <= 6) { qty = 1; secs = 11 - level; }             // 10..5
  else if (level >= 7 && level <= 12) { qty = 2; secs = 10 - (level - 7); } // 10..5
  else if (level >= 13 && level <= 18) { qty = 3; secs = 10 - (level - 13);} // 10..5
  else if (level === 19) { qty = 3; secs = 4; }
  else if (level === 20) { qty = 4; secs = 10; }
  else if (level >= 21 && level <= 24) { qty = 4; secs = 29 - level; }      // 21:8, 22:7, 23:6, 24:5
  else if (level === 25) { qty = 5; secs = 6; }
  // Guardrails
  secs = Math.max(1, Math.min(60, secs));
  return { baseInterval: secs * 1000, spawnQty: qty };
}

const preset0 = presetForLevel(settings.level || 1);
let spawnInterval = preset0.baseInterval;
let spawnCountdown = spawnInterval;
let spawnQtyCurrent = preset0.spawnQty;


let nextTargets = [];                    // [{ idx:number, letter:string }]
let blinkArmed = false;

let lastTick = performance.now();
let rafId = null;
let gameOver = false;
let runStartMs = 0;

/* ============================
 * Elements
 * ============================
 */
const el = {
  grid: document.getElementById("grid"),
  dropTimer: document.getElementById("dropTimer"),
  submitBtn: document.getElementById("submitBtn"),
  clearBtn: document.getElementById("clearBtn"),
  dropBtn: document.getElementById("dropBtn"),
  menuBtn: document.getElementById("menuBtn"),
  currentWordHeader: document.getElementById("currentWordHeader"),
  submitSplit: document.getElementById("submitSplit"),
  brandHeader: document.getElementById("brandHeader"),
  levelBadge: document.getElementById("levelBadge"),
};

/* ============================
 * Helpers
 * ============================
 */
function topLetterAt(idx){
  const s = gridStacks[idx];
  return s && s.length ? s[s.length-1] : null;
}
function computeWord(){
  const tiles = [...selected];
  const letters = tiles.map(i => topLetterAt(i)).filter(Boolean);
  const word = letters.join("");
  return { word, len: letters.length, tiles };
}
function updateWordBar(){
  const { word } = computeWord();
  const hasWord = !!word;

  if (el.brandHeader){
    el.brandHeader.classList.toggle("hidden", hasWord);
  }
  if (el.currentWordHeader){
    el.currentWordHeader.classList.toggle("hidden", !hasWord);
    el.currentWordHeader.textContent = hasWord ? word : "";
  }
  if (hasWord){
    fitWordHeader();
  }
}
function updateTimersUI(){
  if (el.dropTimer){
    el.dropTimer.textContent = (spawnCountdown/1000).toFixed(1) + "s";
  }
  // Update spawn clock progress for all targeted tiles
  if (el.grid){
    const prog = Math.max(0, Math.min(1, 1 - (spawnCountdown / (spawnInterval || 1))));
    const deg = Math.round(prog * 360);
    el.grid.style.setProperty("--spawn-deg", `${deg}deg`);
  }
}
function fitWordHeader(){
  const node = el.currentWordHeader;
  if (!node) return;

  const parent = node.parentElement || node;

  // Determine base font size from an actual tile letter so it matches tiles
  let base = 0;
  const sample = el.grid ? el.grid.querySelector(".tile .letter") : null;
  if (sample){
    const cs = getComputedStyle(sample);
    base = parseFloat(cs.fontSize) || 0;
  }
  if (!base){
    // Fallback: derive from computed tile size if available
    const ts = getComputedStyle(document.documentElement).getPropertyValue("--tile-size-px");
    const tpx = parseFloat(ts) || 0;
    base = tpx ? Math.max(12, Math.round(tpx * 0.6)) : 28;
  }

  // Start with tile-sized font and generous spacing
  let size = Math.max(12, Math.round(base));
  node.style.whiteSpace = "nowrap";
  node.style.fontSize = size + "px";

  // Dynamic letter-spacing: start wider, reduce before shrinking font
  const paddingAllowance = 12; // pixels to account for pill inner padding
  let spacing = 0.10;          // em
  const minSpacing = 0.00;     // em
  const stepSpacing = 0.01;    // em

  node.style.letterSpacing = spacing.toFixed(2) + "em";

  const fits = () => node.scrollWidth <= (parent.clientWidth - paddingAllowance);

  // First, try reducing spacing until it fits or we hit min spacing
  while (!fits() && spacing > minSpacing){
    spacing = Math.max(minSpacing, parseFloat((spacing - stepSpacing).toFixed(2)));
    node.style.letterSpacing = spacing.toFixed(2) + "em";
  }

  // If still doesn't fit, shrink font size (keep the spacing we settled on)
  while (!fits() && size > 12){
    size -= 1;
    node.style.fontSize = size + "px";
  }
}
function layout(){
  layoutBoard(el.grid);
  const gridRect = el.grid.getBoundingClientRect();
  if (el.submitSplit){
    el.submitSplit.style.width = gridRect.width + "px";
    el.submitSplit.style.margin = "0 auto";
  }
  fitWordHeader();
}
function repaint(withBlink = true){
  renderGrid(el.grid, gridStacks, selected, {
    gridSize: GRID_COLS,
    threshold: STACK_CEILING,
    // Always pass current targets so spawn clocks render regardless of withBlink
    blinkTargets: nextTargets.length ? nextTargets.map(t=>t.idx) : [],
    onTileClick: (i)=>{
      if (gameOver) return;
      const L = topLetterAt(i);
      if (!L) return;
      if (selected.has(i)) selected.delete(i); else selected.add(i);
      updateWordBar();
      const node = el.grid.querySelector(`.tile[data-idx="${i}"]`);
      if (node) node.classList.toggle("selected");
    }
  });
  if (withBlink) {
    paintBlink(el.grid, blinkArmed ? nextTargets.map(t=>t.idx) : []);
  }
  updateVowelMeter();
}

/* ============================
 * Game Flow
 * ============================
 */
function initGrid(){
  const total = GRID_ROWS * GRID_COLS;
  gridStacks = Array.from({length: total}, ()=> []);
  for (let i=0; i<total; i++){
    gridStacks[i].push(drawLetter(bag, GRID_ROWS, GRID_COLS));
  }
}
function chooseNextSpawns(){
  nextTargets = [];
  const qty = spawnQtyCurrent;
  const total = GRID_ROWS * GRID_COLS;

  // Decrement tall-pick cooldowns at the start of each cycle
  if (tallCooldown.size){
    for (const [k, v] of tallCooldown){
      const nv = (v|0) - 1;
      if (nv <= 0) tallCooldown.delete(k);
      else tallCooldown.set(k, nv);
    }
  }

  // Fisher–Yates shuffle helper
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };


  // Default behavior for other levels:
  if (qty >= 2){
    // Levels 7–25: 1 targets tallest; remaining random anywhere (no empty priority), all unique
    const chosen = new Set();
    const picks = [];

    // 1) One targeted from tallest (respect 3-cycle cooldown)
    const heights = Array.from({ length: total }, (_, i) => ({ i, h: gridStacks[i].length }));
    const byHeightDesc = [...heights].sort((a,b) => b.h - a.h);
    const shuffleLocal = (arr) => { for (let k = arr.length - 1; k > 0; k--){ const j = Math.floor(Math.random() * (k + 1)); [arr[k], arr[j]] = [arr[j], arr[k]]; } return arr; };
    let t = 0;
    // First pass: skip indices on cooldown
    while (picks.length < 1 && t < byHeightDesc.length){
      const hVal = byHeightDesc[t].h;
      const group = byHeightDesc
        .filter(x => x.h === hVal && !chosen.has(x.i) && !tallCooldown.has(x.i))
        .map(x => x.i);
      shuffleLocal(group);
      while (picks.length < 1 && group.length){
        const idx = group.pop();
        if (!chosen.has(idx)){ chosen.add(idx); picks.push(idx); tallCooldown.set(idx, 3); }
      }
      while (t < byHeightDesc.length && byHeightDesc[t].h === hVal) t++;
    }
    // Fallback: allow choosing from tallest even if on cooldown to guarantee a pick
    if (picks.length < 1){
      t = 0;
      while (picks.length < 1 && t < byHeightDesc.length){
        const hVal = byHeightDesc[t].h;
        const group = byHeightDesc.filter(x => x.h === hVal && !chosen.has(x.i)).map(x => x.i);
        shuffleLocal(group);
        while (picks.length < 1 && group.length){
          const idx = group.pop();
          if (!chosen.has(idx)){ chosen.add(idx); picks.push(idx); /* already on cooldown */ }
        }
        while (t < byHeightDesc.length && byHeightDesc[t].h === hVal) t++;
      }
    }

    // 2) Remaining picks random anywhere
    const pool = [];
    for (let j = 0; j < total; j++){ if (!chosen.has(j)) pool.push(j); }
    shuffleLocal(pool);
    while (picks.length < qty && pool.length){
      const idx = pool.pop();
      if (!chosen.has(idx)){ chosen.add(idx); picks.push(idx); }
    }

    // 3) Final guard
    if (picks.length < qty){
      for (let j = 0; j < total && picks.length < qty; j++){
        if (!chosen.has(j)){ chosen.add(j); picks.push(j); }
      }
    }

    nextTargets = picks.map(idx => ({ idx }));
  } else {
    // Levels 1–6: Prioritize empty tiles first, then random anywhere
    const empties = [];
    const all = [];
    for (let i=0;i<total;i++){
      all.push(i);
      if (gridStacks[i].length === 0) empties.push(i);
    }

    const picks = [];
    shuffle(empties);
    // Prioritize empty tiles first
    while (picks.length < qty && empties.length){
      picks.push(empties.pop());
    }

    // Fill remaining from the rest of the board
    if (picks.length < qty){
      const rest = all.filter(i => !picks.includes(i));
      shuffle(rest);
      while (picks.length < qty && rest.length){
        picks.push(rest.pop());
      }
    }

    nextTargets = picks.map(idx => ({ idx }));
  }
}
function performSpawnTick(){
  if (!nextTargets.length) chooseNextSpawns();
  for (const t of nextTargets){
    const L = drawLetterBalanced();
    gridStacks[t.idx].push(L);
    if (gridStacks[t.idx].length >= STACK_CEILING){
      endGame({ type:"lose", reason:`Stack hit ×${STACK_CEILING}` });
      return true; // ended
    }
  }
  nextTargets = [];
  blinkArmed = false;
  repaint(false);
  return false;
}

/**
 * Manual single-tile drop (instant spawn of one nextTarget)
 * - If no targets exist, generate them (natural randomness)
 * - Drop exactly one letter and reset the countdown
 * - Respect lose-at-stack ceiling
 * - Keep remaining targets blinking; if none remain, they'll be chosen on next natural cycle
 */
function manualDrop(){
  if (gameOver) return;

  if (!nextTargets.length){
    chooseNextSpawns();
  }
  const t = nextTargets.shift();
  if (!t) return;

  {
    const L = drawLetterBalanced();
    gridStacks[t.idx].push(L);
  }

  if (gridStacks[t.idx].length >= STACK_CEILING){
    endGame({ type:"lose", reason:`Stack hit ×${STACK_CEILING}` });
    return;
  }

  // Reset the timer as if a spawn occurred
  spawnCountdown = spawnInterval;

  // Keep highlighting any remaining scheduled targets
  blinkArmed = nextTargets.length > 0;

  // If none remain, choose new targets immediately so the user still sees where the next spawn will go
  if (nextTargets.length === 0){
    chooseNextSpawns();
    blinkArmed = nextTargets.length > 0;
  }

  repaint(false);
  updateTimersUI();
}

function boardIsCleared(){
  return gridStacks.every(st => st.length === 0);
}
function clearSelection(){
  selected.clear();
  updateWordBar();
  repaint(false);
}
function endGame({ type="lose", reason="Run over." } = {}){
  if (gameOver) return;
  gameOver = true;
  if (rafId) cancelAnimationFrame(rafId);
  el.submitBtn.disabled = true;
  el.clearBtn.disabled = true;
  blinkArmed = false;
  paintBlink(el.grid, []);
  const elapsedMs = Math.max(0, Math.round((performance.now() - runStartMs)));
  const lvl = settings.level || 1;

  // Record score details
  if (type === "win"){
    addScore({ level: lvl, elapsedMs, at: Date.now(), threshold: STACK_CEILING, mode: "win" });
    const mins = Math.floor(elapsedMs/1000/60);
    const secs = Math.floor((elapsedMs/1000) % 60);
    const timeTxt = `${mins}:${String(secs).padStart(2,'0')}`;
    reason = `Completed Level ${lvl} in ${timeTxt}. Added to your Scoreboard.`;
  } else if (type === "lose") {
    // Survival mode scoring for any level
    addScore({ level: lvl, elapsedMs, at: Date.now(), threshold: STACK_CEILING, mode: "survival" });
  }

  showEndModal({
    result: type === "win" ? "win" : "lose",
    reason,
    onPlayAgain: ()=> resetGame(),
    onHome: ()=> { window.location.href = "index.html"; },
    level: lvl,
    threshold: STACK_CEILING,
    elapsedMs,
    mode: (type === "lose") ? "survival" : (type === "win" ? "win" : undefined)
  });
}
function resetGame(){
  if (rafId) cancelAnimationFrame(rafId);
  gameOver = false;
  runStartMs = performance.now();

  bag = buildBag(GRID_ROWS, GRID_COLS);
  initGrid();
  selected.clear(); updateWordBar(); repaint(false);
  tallCooldown.clear();

  const p = presetForLevel(settings.level || 1);
  spawnInterval = p.baseInterval;
  spawnQtyCurrent = p.spawnQty;
  spawnCountdown = spawnInterval;

  // Update the level badge text (top of the board)
  if (el.levelBadge){
    const secs = Math.round(p.baseInterval / 1000);
    const qtyTxt = p.spawnQty === 1 ? "tile" : "tiles";
    el.levelBadge.textContent = `Level ${settings.level} — ${p.spawnQty} ${qtyTxt} every ${secs} sec`;
  }

  chooseNextSpawns();
  // Re-render to show spawn clocks for new targets
  repaint(false);
  lastTick = performance.now();
  el.submitBtn.disabled = false; el.clearBtn.disabled = false;
  layout();
  updateTimersUI(); // initialize spawn clock hand
  loop();
}
function loop(now){
  rafId = requestAnimationFrame(loop);
  if (typeof now !== "number" || !Number.isFinite(now)) {
    now = performance.now();
  }
  let dt = now - lastTick;
  if (!Number.isFinite(dt) || dt < 0 || dt > 1000) dt = 16; // guard against NaN/large gaps
  lastTick = now;

  // Safety: if the board is cleared (e.g., timing edge cases), end as win.
  if (!gameOver && boardIsCleared()){
    endGame({ type:"win", reason:"🎉 You cleared the board! Try increasing the difficulty next time." });
    return;
  }

  spawnCountdown -= dt;

  // Show next spawn targets for the entire countdown
  blinkArmed = nextTargets.length > 0;
  paintBlink(el.grid, blinkArmed ? nextTargets.map(t=>t.idx) : []);

  if (spawnCountdown <= 0){
    const ended = performSpawnTick();
    if (ended) return;

    // Fixed tempo per level: recompute from current level
    const pLoop = presetForLevel(settings.level || 1);
    spawnInterval = pLoop.baseInterval;
    spawnQtyCurrent = pLoop.spawnQty;

    spawnCountdown = spawnInterval;
    chooseNextSpawns();
    // Re-render to display clocks on newly chosen targets
    repaint(false);
  }
  updateTimersUI();
}

/* ============================
 * Submit (with local dictionary validation)
 * ============================
 */
async function trySubmit(){
  if (gameOver) return;
  const { word, len, tiles } = computeWord();
  if (len < 3){ showToast("Use at least 3 letters"); return; }

  const labelBefore = el.submitBtn.textContent;
  el.submitBtn.disabled = true;
  el.submitBtn.textContent = "Checking…";

  const valid = await checkWord(word);

  el.submitBtn.textContent = labelBefore;
  el.submitBtn.disabled = false;

  if (!valid){
    showToast("Not in dictionary");
    return;
  }

  // VALID — apply submission
  const usedLetters = [];
  for (const idx of tiles){
    const stack = gridStacks[idx];
    if (stack.length){
      const L = stack.pop();
      if (L) usedLetters.push(L);
    }
  }
  returnLettersBack(bag, usedLetters);
  selected.clear(); updateWordBar(); repaint(false);

  // Win check
  if (boardIsCleared()){
    endGame({ type:"win", reason:"🎉 You cleared the board! Try increasing the difficulty next time." });
    return;
  }

}

/* ============================
 * Settings modal wiring
 * ============================
 */
function openSettings(){
  showSettingsModal({
    initial: {
      level: settings.level || 1,
      threshold: String(STACK_CEILING)
    },
    onSave: (s)=>{
      settings = {
        level: parseInt(s.level, 10) || 1,
        threshold: s.threshold
      };
      saveSettings(settings);

      // Apply
      STACK_CEILING = parseInt(settings.threshold, 10) || 7;

      resetGame();
      showToast("Settings applied");
    }
  });
}

/* ============================
 * Events
 * ============================
 */
el.submitBtn.addEventListener("click", trySubmit);
el.clearBtn.addEventListener("click", clearSelection);
if (el.dropBtn){
  el.dropBtn.addEventListener("click", manualDrop);
}
if (el.menuBtn){
  el.menuBtn.addEventListener("click", ()=>{
    showMenuModal({
      onHome: ()=> { window.location.href = "index.html"; },
      onReset: ()=> resetGame(),
      onSettings: ()=> openSettings(),
      onScoreboard: ()=> showScoreboardModal({ getScores, onHome: ()=> { window.location.href = "index.html"; } })
    });
  });
}

window.addEventListener("keydown", (ev)=>{
  if (gameOver) return;
  if (ev.key === "Enter") trySubmit();
  if (ev.key === "Escape") clearSelection();
});

window.addEventListener("resize", layout);
window.addEventListener("orientationchange", ()=> setTimeout(layout, 120));

/* ============================
 * Test harness (programmatic spawn-target audit)
 * ============================
 */
function runSpawnTest({ level = 25, cycles = 200 } = {}){
  // Pause the main loop
  if (rafId) { cancelAnimationFrame(rafId); rafId = null; }

  // Snapshot important state to restore later
  const prev = {
    level: settings.level,
    ceiling: STACK_CEILING
  };

  // Configure hardest level and a very high ceiling to avoid early loss
  settings.level = level;
  saveSettings(settings);
  STACK_CEILING = 999;

  // Reset minimal board state
  bag = buildBag(GRID_ROWS, GRID_COLS);
  initGrid();
  selected.clear();
  nextTargets = [];
  blinkArmed = false;
  tallCooldown.clear();

  const p0 = presetForLevel(settings.level || 1);
  spawnQtyCurrent = p0.spawnQty;
  spawnInterval = p0.baseInterval;

  const results = {
    level,
    cycles,
    tallestFallbacks: 0,          // times tallest pick selected while on cooldown (fallback branch)
    randomHitsOnCooldown: 0,      // times random picks hit indices on cooldown
    tallestGaps: {}               // per-index array of cycle gaps between tallest hits
  };
  const lastTallSeen = {};

  for (let c = 0; c < cycles; c++){
    // Schedule targets for this cycle
    chooseNextSpawns();
    const picks = nextTargets.map(t => t.idx);

    const tallestIdx = picks.length ? picks[0] : undefined;

    // If tallestIdx is still on cooldown now, it means the fallback branch selected it
    if (typeof tallestIdx === "number" && tallCooldown.has(tallestIdx)){
      results.tallestFallbacks++;
    }

    // Count random hits on cooldown (picks after the tallest slot)
    for (let k = 1; k < picks.length; k++){
      if (tallCooldown.has(picks[k])) results.randomHitsOnCooldown++;
    }

    // Track gaps between tallest hits per index
    if (typeof tallestIdx === "number"){
      const prevSeen = lastTallSeen[tallestIdx];
      if (typeof prevSeen === "number"){
        (results.tallestGaps[tallestIdx] ||= []).push(c - prevSeen);
      }
      lastTallSeen[tallestIdx] = c;
    }

    // Apply the spawn
    const ended = performSpawnTick();
    if (ended) break;

    // As in the main loop: reset per-cycle quantities from the current level
    const pp = presetForLevel(settings.level || 1);
    spawnInterval = pp.baseInterval;
    spawnQtyCurrent = pp.spawnQty;
  }

  // Compute quick summary
  const gapsAll = Object.values(results.tallestGaps).flat();
  const avgGap = gapsAll.length ? (gapsAll.reduce((a,b)=> a + b, 0) / gapsAll.length) : null;
  results.summary = {
    tallestFallbacks: results.tallestFallbacks,
    randomHitsOnCooldown: results.randomHitsOnCooldown,
    avgTallestGap: avgGap
  };

  // Restore previous settings and restart game/loop
  settings.level = prev.level;
  saveSettings(settings);
  STACK_CEILING = prev.ceiling;
  resetGame();

  return results;
}
window.runSpawnTest = runSpawnTest;

/* ============================
 * Boot
 * ============================
 */
async function boot(){
  try {
    await ensureDictionary();
  } catch {
    showToast("Dictionary unavailable. Connect once to download the word list.");
  }

  // Start a run with persisted/default settings
  resetGame();

  // If showSettings=1 is present, prompt immediately
  const params = new URLSearchParams(window.location.search);
  if (params.get("showSettings") === "1"){
    setTimeout(openSettings, 50);
  }
  // If scoreboard=1 is present, open Scoreboard modal (works from Home deep-link)
  if (params.get("scoreboard") === "1"){
    setTimeout(()=> showScoreboardModal({ getScores, onHome: ()=> { window.location.href = "index.html"; } }), 50);
  }

  // Optional: run automated spawn test (open game.html?autotest=1)
  if (params.get("autotest") === "1"){
    setTimeout(() => {
      try{
        const res = window.runSpawnTest ? window.runSpawnTest({ level: 25, cycles: 200 }) : null;
        console.log("SpawnTest Result:", res);
        showToast("Auto test complete. See console.");
      }catch(e){
        console.error("SpawnTest failed", e);
        showToast("Auto test failed");
      }
    }, 200);
  }
}
boot();
