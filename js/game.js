/**
 * Word Stacks — Streamlined MVP
 * - Settings via modal (gear button)
 * - No scoring, no run-left timer
 * - Header shows Next Spawn only; Home/Reset live in header
 * - Start from landing opens with settings modal (?showSettings=1)
 */

import { checkWord } from "./api.js";
import { buildBag, drawLetter, returnLettersBack } from "./bag.js";
import { tempoForWordLen } from "./tempo.js";
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
    // Defaults: Level 1 and threshold 7
    if (!raw) return { level: 1, threshold: "7" };
    const obj = JSON.parse(raw);

    // Threshold: coerce to 5–10
    let thr = String(obj.threshold ?? "7");
    const tn = parseInt(thr, 10);
    if (!Number.isFinite(tn) || tn < 5 || tn > 10) thr = "7";

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
    // Clamp within 1–20
    if (lvl < 1) lvl = 1; if (lvl > 20) lvl = 20;

    return {
      level: lvl,
      threshold: thr
    };
  }catch{
    return { level: 1, threshold:"7" };
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

/**
 * Map level (1–20) to base interval (ms) and spawn quantity.
 * Levels:
 *  1–6:  1 tile every 10..5s
 *  7–12: 2 tiles every 10..5s
 * 13–18: 3 tiles every 10..5s
 * 19:    3 tiles every 4s
 * 20:    4 tiles every 10s
 */
function presetForLevel(level){
  let qty = 1, secs = 10;
  if (level >= 1 && level <= 6) { qty = 1; secs = 11 - level; }             // 10..5
  else if (level >= 7 && level <= 12) { qty = 2; secs = 10 - (level - 7); } // 10..5
  else if (level >= 13 && level <= 18) { qty = 3; secs = 10 - (level - 13);} // 10..5
  else if (level === 19) { qty = 3; secs = 4; }
  else if (level === 20) { qty = 4; secs = 10; }
  // Guardrails
  secs = Math.max(1, Math.min(60, secs));
  return { baseInterval: secs * 1000, spawnQty: qty };
}

let { baseInterval, spawnQty } = presetForLevel(settings.level || 1);
let spawnInterval = baseInterval;
let spawnCountdown = spawnInterval;
let spawnQtyCurrent = spawnQty;

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

  // Collect empty tiles (length === 0) and all indices
  const empties = [];
  const all = [];
  for (let i=0;i<total;i++){
    all.push(i);
    if (gridStacks[i].length === 0) empties.push(i);
  }

  // Fisher–Yates shuffle helper
  const shuffle = (arr) => {
    for (let i = arr.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

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

  nextTargets = picks.map(idx => ({ idx, letter: drawLetter(bag, GRID_ROWS, GRID_COLS) }));
}
function performSpawnTick(){
  if (!nextTargets.length) chooseNextSpawns();
  for (const t of nextTargets){
    gridStacks[t.idx].push(t.letter);
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

  gridStacks[t.idx].push(t.letter);

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

function applyTempoFromWordLen(len){
  // Preserve prior behavior: when "Insane", 3-letter words may increase qty by +1 (max 4).
  // We approximate by treating any base where spawnQtyCurrent >= 3 as "Insane".
  const presetName = (spawnQtyCurrent >= 3) ? "Insane" : "Medium";
  const { interval, qty } = tempoForWordLen(len, presetName);
  spawnInterval = interval;
  spawnQtyCurrent = qty;
  spawnCountdown = spawnInterval;
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

  // On win, compute elapsed and persist score, and show richer message
  if (type === "win"){
    const elapsedMs = Math.max(0, Math.round((performance.now() - runStartMs)));
    addScore({ level: settings.level || 1, elapsedMs, at: Date.now() });
    const mins = Math.floor(elapsedMs/1000/60);
    const secs = Math.floor((elapsedMs/1000) % 60);
    const timeTxt = `${mins}:${String(secs).padStart(2,'0')}`;
    reason = `Completed Level ${settings.level || 1} in ${timeTxt}. Added to your Scoreboard.`;
  }

  showEndModal({
    result: type === "win" ? "win" : "lose",
    reason,
    onPlayAgain: ()=> resetGame()
  });
}
function resetGame(){
  if (rafId) cancelAnimationFrame(rafId);
  gameOver = false;
  runStartMs = performance.now();

  bag = buildBag(GRID_ROWS, GRID_COLS);
  initGrid();
  selected.clear(); updateWordBar(); repaint(false);

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
    spawnCountdown = spawnInterval;
    chooseNextSpawns();
    // Re-render to display clocks on newly chosen targets
    repaint(false);
  }
  updateTimersUI();
}

/* ============================
 * Submit (with API validation)
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

  // Tempo changes according to difficulty & length
  applyTempoFromWordLen(len);
  showToast(`Next ${spawnQtyCurrent} in ${(spawnInterval/1000).toFixed(1)}s`);
  chooseNextSpawns();
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
      onScoreboard: ()=> showScoreboardModal({ getScores })
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
 * Boot
 * ============================
 */
function boot(){
  // Start a run with persisted/default settings
  resetGame();

  // If showSettings=1 is present, prompt immediately
  const params = new URLSearchParams(window.location.search);
  if (params.get("showSettings") === "1"){
    setTimeout(openSettings, 50);
  }
}
boot();
