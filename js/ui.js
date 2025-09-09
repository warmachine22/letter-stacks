/**
 * UI helpers: toast, modal, formatting
 * Exports:
 * - showToast(msg: string, ms?: number)
 * - fmtTime(ms: number) -> string "m:ss"
 * - showEndModal({ result, reason, score, elapsedMs, onPlayAgain, onHome })
 */

export function showToast(msg, ms = 1700){
  let el = document.getElementById("toast");
  if (!el){
    el = document.createElement("div");
    el.id = "toast";
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  window.clearTimeout(showToast._t);
  showToast._t = window.setTimeout(()=> el.classList.remove("show"), ms);
}

export function fmtTime(ms){
  const s = Math.max(0, Math.ceil(ms/1000));
  const m = Math.floor(s/60); const r = s%60;
  return `${m}:${String(r).padStart(2,'0')}`;
}

/**
 * Create and show end-of-game modal
 * Params:
 *  - result: "win" | "lose" | "time"
 *  - reason: string message
 *  - score: number
 *  - elapsedMs: number
 *  - onPlayAgain: () => void
 *  - onHome: () => void
 */
export function showEndModal({ result, reason, onPlayAgain, onHome, score, elapsedMs } = {}){
  // Clean any existing
  document.querySelectorAll(".modal-overlay").forEach(n => n.remove());

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const card = document.createElement("div");
  card.className = "modal-card";

  const h2 = document.createElement("h2");
  if (result === "win") h2.textContent = "🎉 You cleared the board!";
  else h2.textContent = "💀 Game Over";
  card.appendChild(h2);

  const body = document.createElement("div");
  body.className = "modal-body";
  const p1 = document.createElement("p");
  p1.textContent = reason || (result === "win" ? "Excellent!" : "Try again.");
  body.appendChild(p1);

  // Optionally include score/time if provided (not used in MVP)
  if (typeof score !== "undefined" || typeof elapsedMs !== "undefined"){
    const p2 = document.createElement("p");
    const parts = [];
    if (typeof score !== "undefined") parts.push(`<strong>Score:</strong> ${score}`);
    if (typeof elapsedMs !== "undefined") parts.push(`<strong>Time:</strong> ${fmtTime(elapsedMs)}`);
    p2.innerHTML = parts.join(" &nbsp;&nbsp; ");
    body.appendChild(p2);
  }
  card.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const again = document.createElement("button");
  again.className = "primary";
  again.textContent = "Play Again";
  again.addEventListener("click", ()=>{
    overlay.remove();
    if (typeof onPlayAgain === "function") onPlayAgain();
  });

  const home = document.createElement("button");
  home.textContent = "Back to Home";
  home.addEventListener("click", ()=>{
    overlay.remove();
    if (typeof onHome === "function") onHome();
    else window.location.href = "index.html";
  });

  actions.appendChild(home);
  actions.appendChild(again);
  card.appendChild(actions);

  overlay.addEventListener("click", (e)=>{
    if (e.target === overlay) overlay.remove();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Focus the primary button for accessibility
  setTimeout(()=> again.focus(), 0);
}

/**
 * Settings modal
 * initial: { difficulty: string, gridSize: number, threshold: "off"|"5"|"7"|"9" }
 * onSave: (settings) => void
 */
export function showSettingsModal({ initial, onSave }){
  document.querySelectorAll(".modal-overlay").forEach(n => n.remove());

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const card = document.createElement("div");
  card.className = "modal-card";

  const h2 = document.createElement("h2");
  h2.textContent = "Settings";
  card.appendChild(h2);

  const body = document.createElement("div");
  body.className = "modal-body";

  const row = (labelText, inputEl) => {
    const wrap = document.createElement("div");
    wrap.style.display = "grid";
    wrap.style.gridTemplateColumns = "1fr auto";
    wrap.style.gap = "10px";
    wrap.style.alignItems = "center";
    wrap.style.margin = "10px 0";
    const label = document.createElement("label");
    label.textContent = labelText;
    label.style.fontWeight = "600";
    wrap.appendChild(label);
    wrap.appendChild(inputEl);
    return wrap;
  };

  // Difficulty
  const diff = document.createElement("select");
  diff.className = "select";
  ["Easy","Medium","Hard","Insane"].forEach(v=>{
    const o = document.createElement("option"); o.value=v; o.textContent=v;
    if (initial?.difficulty === v) o.selected = true;
    diff.appendChild(o);
  });

  // Grid size
  const grid = document.createElement("select");
  grid.className = "select";
  for (let n=4;n<=10;n++){
    const o = document.createElement("option"); o.value=String(n); o.textContent=String(n);
    if (initial?.gridSize === n) o.selected = true;
    grid.appendChild(o);
  }

  // Threshold
  const thr = document.createElement("select");
  thr.className = "select";
  [["off","Off"],["5","5"],["7","7"],["9","9"]].forEach(([v,l])=>{
    const o = document.createElement("option"); o.value=v; o.textContent=l;
    if (String(initial?.threshold ?? "off") === v) o.selected = true;
    thr.appendChild(o);
  });

  body.appendChild(row("Difficulty", diff));
  body.appendChild(row("Grid Size", grid));
  body.appendChild(row("Lose at stack", thr));
  card.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "modal-actions";

  const cancel = document.createElement("button");
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", ()=> overlay.remove());

  const save = document.createElement("button");
  save.className = "primary";
  save.textContent = "Save & Apply";
  save.addEventListener("click", ()=>{
    const settings = {
      difficulty: diff.value,
      gridSize: parseInt(grid.value, 10),
      threshold: thr.value
    };
    overlay.remove();
    if (typeof onSave === "function") onSave(settings);
  });

  actions.appendChild(cancel);
  actions.appendChild(save);
  card.appendChild(actions);

  overlay.addEventListener("click", (e)=>{
    if (e.target === overlay) overlay.remove();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  setTimeout(()=> save.focus(), 0);
}

/**
 * Simple menu modal for compact header (Home / Reset / Settings)
 * onHome?: () => void
 * onReset?: () => void
 * onSettings?: () => void
 */
export function showMenuModal({ onHome, onReset, onSettings } = {}){
  // Clean any existing
  document.querySelectorAll(".modal-overlay").forEach(n => n.remove());

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const card = document.createElement("div");
  card.className = "modal-card";

  const h2 = document.createElement("h2");
  h2.textContent = "Menu";
  card.appendChild(h2);

  const body = document.createElement("div");
  body.className = "modal-body";
  body.style.display = "grid";
  body.style.gap = "10px";

  const btn = (label, cls, handler) => {
    const b = document.createElement("button");
    if (cls) b.className = cls;
    b.textContent = label;
    b.addEventListener("click", ()=>{
      overlay.remove();
      if (typeof handler === "function") handler();
    });
    return b;
  };

  body.appendChild(btn("Settings", "primary", onSettings));
  body.appendChild(btn("Reset Run", "", onReset));
  body.appendChild(btn("Home", "", onHome));

  card.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const cancel = document.createElement("button");
  cancel.textContent = "Close";
  cancel.addEventListener("click", ()=> overlay.remove());
  actions.appendChild(cancel);
  card.appendChild(actions);

  overlay.addEventListener("click", (e)=>{
    if (e.target === overlay) overlay.remove();
  });

  overlay.appendChild(card);
  document.body.appendChild(overlay);

  setTimeout(()=> body.querySelector("button")?.focus(), 0);
}
