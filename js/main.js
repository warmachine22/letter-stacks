import { showScoreboardModal } from "./ui.js";

/**
 * Landing page interactions / lightweight config
 * - Ensures a sensible default for DEV allow-any-word fallback
 * - Provides simple helpers for toggling dev mode via console or URL params
 * - No heavy logic needed; game runs from game.js
 */

(function(){
  document.addEventListener("DOMContentLoaded", () => {
    // Ensure default dev fallback is ON for MVP unless explicitly set
    const key = "wordStacks.devAllowAnyWord";
    const existing = localStorage.getItem(key);
    if (existing === null) {
      localStorage.setItem(key, "true");
    }

    // URL override: ?dev=true|false to quickly toggle the fallback
    const params = new URLSearchParams(window.location.search);
    if (params.has("dev")) {
      const v = params.get("dev");
      if (v === "true" || v === "false") {
        localStorage.setItem(key, v);
        // surface a visible nudge the setting changed
        const tag = document.createElement("div");
        tag.className = "toast";
        tag.textContent = `Dev validation fallback: ${v.toUpperCase()}`;
        document.body.appendChild(tag);
        setTimeout(()=> tag.classList.add("show"), 0);
        setTimeout(()=> tag.classList.remove("show"), 1600);
      }
    }

    // Expose tiny helpers for debugging via console
    window.wordStacks = Object.freeze({
      get devAllowAnyWord(){
        return localStorage.getItem(key) === "true";
      },
      set devAllowAnyWord(v){
        localStorage.setItem(key, v ? "true" : "false");
      }
    });
  });
  // Also wire the Home Scoreboard button (opens modal from landing)
  document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("scoreBtnHome");
    if (btn) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const getScores = () => {
          try {
            const raw = localStorage.getItem("ws.scores");
            if (!raw) return [];
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
          } catch {
            return [];
          }
        };
        showScoreboardModal({
          getScores,
          onHome: () => { window.location.href = "index.html"; }
        });
      });
    }
  });
})();
