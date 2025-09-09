/**
 * Word Stacks — Streamlined MVP
 * - Settings via modal (gear button)
 * - No scoring, no run-left timer
 * - Header shows Next Spawn only; Home/Reset live in header
 * - Start from landing opens with settings modal (?showSettings=1)
 */

import { checkWord } from "./api.js";
import { buildBag, drawLetter, returnLettersBack } from "./bag.js";
import { DIFFICULTY_PRESETS, tempoForWordLen } from "./tempo.js";
import { renderGrid, paintBlink, layoutBoard } from "./grid.js";
import { showToast, showEndModal, showSettingsModal, showMenuModal } from "./ui.js";

/* ============================
 * Settings (persisted)
 * ============================
 */
const SETTINGS_KEY = "ws.settings";
function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { difficulty:"Medium", gridSize:6, threshold:"off" };
    const obj = JSON.parse(raw);
    return {
      difficulty: obj.difficulty ?? "Medium",
      gridSize: Number(obj.gridSize ?? 6),
      threshold: String(obj.threshold ?? "off")
    };
  }catch{
    return { difficulty:"Medium", gridSize:6, threshold:"off" };
  }
}
function saveSettings(s){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

/* ============================
 * State
 * ============================
 */
let settings = loadSettings();           // { difficulty, gridSize, threshold }
let GRID_SIZE = settings.gridSize;
let difficulty = settings.difficulty;

let LOSE_ON_STACK_CEILING = settings.threshold !== "off";
let STACK_CEILING = settings.threshold === "off" ? 7 : parseInt(settings.threshold, 10);

let bag = [];
let gridStacks = [];                     // array<array<string>>
let selected = new Set();                // Set<number>

let spawnInterval = DIFFICULTY_PRESETS[difficulty].baseInterval;
let spawnCountdown = spawnInterval;
let spawnQtyCurrent = DIFFICULTY_PRESETS[difficulty].spawnQty;

let nextTargets = [];                    // [{ idx:number, letter:string }]
let blinkArmed = false;

let lastTick = performance.now();
let rafId = null;
let gameOver = false;

/* ============================
 * Elements
 * ============================
 */
const el = {
  grid: document.getElementById("grid"),
  spawnTimer: document.getElementById("spawnTimer"),
  submitBtn: document.getElementById("submitBtn"),
  clearBtn: document.getElementById("clearBtn"),
  menuBtn: document.getElementById("menuBtn"),
  currentWordHeader: document.getElementById("currentWordHeader"),
  submitSplit: document.getElementById("submitSplit"),
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
  if (el.currentWordHeader){
    el.currentWordHeader.textContent = word || "—";
  }
  fitWordHeader();
}
function updateTimersUI(){
  el.spawnTimer.textContent = (spawnCountdown/1000).toFixed(1) + "s";
}
function fitWordHeader(){
  const node = el.currentWordHeader;
  if (!node) return;
  node.style.fontSize = "";
  const parent = node.parentElement || node;
  let size = 18;
  const min = 12;
  node.style.whiteSpace = "nowrap";
  while (size > min && node.scrollWidth > parent.clientWidth - 24){
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
    gridSize: GRID_SIZE,
    blinkTargets: withBlink && blinkArmed && nextTargets.length ? nextTargets.map(t=>t.idx) : [],
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
  gridStacks = Array.from({length: GRID_SIZE*GRID_SIZE}, ()=> []);
  for (let i=0; i<GRID_SIZE*GRID_SIZE; i++){
    gridStacks[i].push(drawLetter(bag, GRID_SIZE));
  }
}
function chooseNextSpawns(){
  nextTargets = [];
  const taken = new Set();
  const qty = spawnQtyCurrent;
  for (let k=0; k<qty; k++){
    let idx; let guard=0;
    do{ idx = Math.floor(Math.random() * GRID_SIZE * GRID_SIZE); guard++; } while (taken.has(idx) && guard<200);
    taken.add(idx);
    nextTargets.push({ idx, letter: drawLetter(bag, GRID_SIZE) });
  }
}
function performSpawnTick(){
  if (!nextTargets.length) chooseNextSpawns();
  for (const t of nextTargets){
    gridStacks[t.idx].push(t.letter);
    if (LOSE_ON_STACK_CEILING && gridStacks[t.idx].length >= STACK_CEILING){
      endGame({ type:"lose", reason:`Stack hit ×${STACK_CEILING}` });
      return true; // ended
    }
  }
  nextTargets = [];
  blinkArmed = false;
  repaint(false);
  return false;
}
function applyTempoFromWordLen(len){
  const { interval, qty } = tempoForWordLen(len, difficulty);
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
  showEndModal({
    result: type === "win" ? "win" : "lose",
    reason,
    onPlayAgain: ()=> resetGame()
  });
}
function resetGame(){
  if (rafId) cancelAnimationFrame(rafId);
  gameOver = false;

  bag = buildBag(GRID_SIZE);
  initGrid();
  selected.clear(); updateWordBar(); repaint(false);

  const preset = DIFFICULTY_PRESETS[difficulty];
  spawnInterval = preset.baseInterval;
  spawnQtyCurrent = preset.spawnQty;
  spawnCountdown = spawnInterval;

  chooseNextSpawns();
  lastTick = performance.now();
  el.submitBtn.disabled = false; el.clearBtn.disabled = false;
  layout();
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

  spawnCountdown -= dt;

  // last-second pre-blink
  blinkArmed = spawnCountdown <= 1000;
  paintBlink(el.grid, blinkArmed ? nextTargets.map(t=>t.idx) : []);

  if (spawnCountdown <= 0){
    const ended = performSpawnTick();
    if (ended) return;
    spawnCountdown = spawnInterval;
    chooseNextSpawns();
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
    endGame({ type:"win", reason:"🎉 You cleared the board!" });
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
      difficulty,
      gridSize: GRID_SIZE,
      threshold: LOSE_ON_STACK_CEILING ? String(STACK_CEILING) : "off"
    },
    onSave: (s)=>{
      settings = {
        difficulty: s.difficulty,
        gridSize: s.gridSize,
        threshold: s.threshold
      };
      saveSettings(settings);

      // Apply
      difficulty = settings.difficulty;
      GRID_SIZE = settings.gridSize;
      LOSE_ON_STACK_CEILING = settings.threshold !== "off";
      STACK_CEILING = settings.threshold === "off" ? 7 : parseInt(settings.threshold, 10);

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
if (el.menuBtn){
  el.menuBtn.addEventListener("click", ()=>{
    showMenuModal({
      onHome: ()=> { window.location.href = "index.html"; },
      onReset: ()=> resetGame(),
      onSettings: ()=> openSettings()
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
