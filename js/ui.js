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
    wrap.className = "form-row";
    const label = document.createElement("label");
    label.textContent = labelText;
    label.style.fontWeight = "600";
    wrap.appendChild(label);
    wrap.appendChild(inputEl);
    return wrap;
  };

  // Level grid (5×4) selector replacing dropdown
  const selLevel = parseInt(initial?.level, 10) || 1;
  let selectedLevel = selLevel;

  // Helper to map level -> qty, secs
  const levelInfo = (lvl) => {
    let qty = 1, secs = 10;
    if (lvl >= 1 && lvl <= 6) { qty = 1; secs = 11 - lvl; }
    else if (lvl >= 7 && lvl <= 12) { qty = 2; secs = 10 - (lvl - 7); }
    else if (lvl >= 13 && lvl <= 18) { qty = 3; secs = 10 - (lvl - 13); }
    else if (lvl === 19) { qty = 3; secs = 4; }
    else if (lvl === 20) { qty = 4; secs = 10; }
    return { qty, secs };
  };

  // Label
  const levelLabel = document.createElement("div");
  levelLabel.textContent = "Select your level";
  levelLabel.style.fontWeight = "600";
  levelLabel.style.margin = "8px 0 4px 0";
  body.appendChild(levelLabel);

  // Grid container
  const levelGrid = document.createElement("div");
  levelGrid.style.display = "grid";
  levelGrid.style.gridTemplateColumns = "repeat(5, 1fr)";
  levelGrid.style.gap = "8px";
  levelGrid.setAttribute("role", "grid");
  levelGrid.setAttribute("aria-label", "Select your level");
  body.appendChild(levelGrid);

  // Rule line under the grid
  const ruleLine = document.createElement("div");
  ruleLine.style.margin = "6px 0 12px";
  ruleLine.style.color = "var(--muted)";
  ruleLine.style.fontSize = "14px";
  body.appendChild(ruleLine);

  const setSelected = (lvl) => {
    selectedLevel = Math.max(1, Math.min(20, lvl|0));
    // Update highlight states
    levelGrid.querySelectorAll("button[data-lvl]").forEach(btn => {
      const on = parseInt(btn.dataset.lvl, 10) === selectedLevel;
      btn.setAttribute("aria-pressed", on ? "true" : "false");
      if (on) {
        btn.style.background = "var(--accent)";
        btn.style.color = "#0b0d12";
        btn.style.borderColor = "#3ed1a1";
      } else {
        btn.style.background = "var(--panel)";
        btn.style.color = "var(--text)";
        btn.style.borderColor = "#222733";
      }
    });
    const { qty, secs } = levelInfo(selectedLevel);
    const qtyTxt = qty === 1 ? "1 tile" : `${qty} tiles`;
    ruleLine.textContent = `Level ${selectedLevel}: ${qtyTxt} every ${secs} sec`;
  };

  // Render buttons 1..20
  for (let lvl = 1; lvl <= 20; lvl++) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(lvl);
    b.dataset.lvl = String(lvl);
    b.setAttribute("aria-pressed", "false");
    b.style.minHeight = "36px";
    b.style.padding = "10px 8px";
    b.style.borderRadius = "10px";
    b.style.border = "1px solid #222733";
    b.style.fontWeight = "800";
    b.style.fontSize = "clamp(14px, 3.4vw, 16px)";
    b.style.cursor = "pointer";
    b.style.background = "var(--panel)";
    b.style.color = "var(--text)";
    b.addEventListener("click", () => setSelected(lvl));
    b.addEventListener("keydown", (ev) => {
      const key = ev.key;
      if (!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(key)) return;
      ev.preventDefault();
      const idx = selectedLevel - 1;
      const cols = 5;
      let ni = idx;
      if (key === "ArrowLeft") ni = (idx + 20 - 1) % 20;
      if (key === "ArrowRight") ni = (idx + 1) % 20;
      if (key === "ArrowUp") ni = (idx + 20 - cols) % 20;
      if (key === "ArrowDown") ni = (idx + cols) % 20;
      if (key === "Home") ni = 0;
      if (key === "End") ni = 19;
      setSelected(ni + 1);
      const toFocus = levelGrid.querySelector(`button[data-lvl="${ni+1}"]`);
      toFocus?.focus();
    });
    levelGrid.appendChild(b);
  }
  // Initialize selection and rule line
  setSelected(selectedLevel);


  // Threshold (5 through 10)
  const thr = document.createElement("select");
  thr.className = "select";
  for (let n=5;n<=10;n++){
    const v = String(n);
    const o = document.createElement("option"); o.value=v; o.textContent=v;
    if (String(initial?.threshold ?? "7") === v) o.selected = true;
    thr.appendChild(o);
  }



  // Threshold (lose condition)
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
      level: selectedLevel || 1,
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
export function showMenuModal({ onHome, onReset, onSettings, onScoreboard } = {}){
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
  body.appendChild(btn("Scoreboard", "", onScoreboard));
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

/**
 * Scoreboard modal
 * - Lists local scores with optional level filter
 * - Provides share options via Web Share API (if available) or mailto/WhatsApp/SMS fallback
 */
export function showScoreboardModal({ getScores } = {}){
  // Clean any existing
  document.querySelectorAll(".modal-overlay").forEach(n => n.remove());

  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");

  const card = document.createElement("div");
  card.className = "modal-card";

  const h2 = document.createElement("h2");
  h2.textContent = "Scoreboard";
  card.appendChild(h2);

  const body = document.createElement("div");
  body.className = "modal-body";

  // Filter row
  const filterWrap = document.createElement("div");
  filterWrap.className = "form-row";
  const filterLabel = document.createElement("label");
  filterLabel.textContent = "Filter by level";
  filterLabel.style.fontWeight = "600";
  const sel = document.createElement("select");
  sel.className = "select";
  const optAll = document.createElement("option"); optAll.value = ""; optAll.textContent = "All Levels";
  sel.appendChild(optAll);
  for (let i=1;i<=20;i++){
    const o = document.createElement("option");
    o.value = String(i);
    o.textContent = `Level ${i}`;
    sel.appendChild(o);
  }
  filterWrap.appendChild(filterLabel);
  filterWrap.appendChild(sel);
  body.appendChild(filterWrap);

  // List container
  const list = document.createElement("div");
  list.style.display = "grid";
  list.style.gap = "8px";
  body.appendChild(list);

  const scores = (typeof getScores === "function" ? getScores() : []);
  const render = () => {
    const filter = sel.value.trim();
    list.innerHTML = "";
    const filtered = scores
      .filter(s => !filter || String(s.level) === filter)
      .sort((a,b)=> (b.at||0) - (a.at||0));
    if (filtered.length === 0){
      const empty = document.createElement("div");
      empty.textContent = "No scores yet.";
      empty.style.opacity = ".8";
      list.appendChild(empty);
      return;
    }
    filtered.forEach(s=>{
      const row = document.createElement("div");
      row.style.display = "grid";
      row.style.gridTemplateColumns = "1fr auto";
      row.style.alignItems = "center";
      row.style.gap = "8px";
      row.style.border = "1px solid #222733";
      row.style.background = "var(--panel)";
      row.style.borderRadius = "10px";
      row.style.padding = "8px 10px";

      const left = document.createElement("div");
      const mins = Math.floor(Math.max(0, Math.round((s.elapsedMs||0)/1000)) / 60);
      const secs = Math.floor(Math.max(0, Math.round((s.elapsedMs||0)/1000)) % 60);
      const timeTxt = `${mins}:${String(secs).padStart(2,'0')}`;
      const when = s.at ? new Date(s.at).toLocaleString() : "";
      left.textContent = `Level ${s.level} — ${timeTxt}  ${when ? `• ${when}` : ""}`;

      const share = document.createElement("button");
      share.textContent = "Share";
      share.className = "button";
      share.style.minHeight = "36px";
      share.addEventListener("click", async ()=>{
        const shareText = `I completed Letter Stacks Level ${s.level} in ${timeTxt}!`;
        try{
          if (navigator.share){
            await navigator.share({ title: "Letter Stacks", text: shareText, url: location.href });
          } else if (navigator.clipboard && navigator.clipboard.writeText){
            await navigator.clipboard.writeText(`${shareText} ${location.href}`);
            showToast("Copied share text to clipboard");
          } else {
            // Fallback: open mailto
            const mail = `mailto:?subject=Letter%20Stacks&body=${encodeURIComponent(shareText)}%0A${encodeURIComponent(location.href)}`;
            window.location.href = mail;
          }
        }catch(e){
          // Silent fail or show toast
          showToast("Share canceled");
        }
      });

      row.appendChild(left);
      row.appendChild(share);
      list.appendChild(row);
    });
  };

  sel.addEventListener("change", render);
  render();

  card.appendChild(body);

  const actions = document.createElement("div");
  actions.className = "modal-actions";
  const close = document.createElement("button");
  close.textContent = "Close";
  close.addEventListener("click", ()=> overlay.remove());
  actions.appendChild(close);
  card.appendChild(actions);

  overlay.addEventListener("click", (e)=>{ if (e.target === overlay) overlay.remove(); });
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}
