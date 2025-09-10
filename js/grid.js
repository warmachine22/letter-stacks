/**
 * Grid rendering and layout helpers
 * Exports:
 * - renderGrid(gridEl, gridStacks, selectedSet, { gridSize, blinkTargets, onTileClick })
 * - paintBlink(gridEl, indices:number[])
 * - layoutBoard(gridEl) -> sizes to a square that fits viewport minus UI chrome
 */

function topLetter(stack){
  return stack && stack.length ? stack[stack.length - 1] : null;
}

export function renderGrid(gridEl, gridStacks, selectedSet, opts = {}){
  const { gridSize, blinkTargets = [], onTileClick, threshold } = opts;
  if (!gridEl) return;

  if (gridSize) {
    gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
    gridEl.dataset.cols = String(gridSize);
  }

  gridEl.innerHTML = "";
  const N = gridStacks.length;
  for (let i = 0; i < N; i++){
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.idx = String(i);

    if (selectedSet && selectedSet.has(i)) tile.classList.add("selected");

    const L = topLetter(gridStacks[i]);

    // Clear and rebuild content so we can layer fill/letter
    tile.textContent = "";

    const stackLen = gridStacks[i]?.length || 0;

    const useFill = (typeof threshold === "number" && Number.isFinite(threshold) && threshold > 0);

    if (useFill) {
      const pct = Math.max(0, Math.min(stackLen / threshold, 1));
      const bar = document.createElement("div");
      bar.className = "fillBar";
      bar.style.height = `${Math.round(pct * 100)}%`;
      tile.appendChild(bar);
    }

    // Spawn clock overlay if this tile is a scheduled target
    if (blinkTargets && Array.isArray(blinkTargets) && blinkTargets.includes(i)){
      const clock = document.createElement("div");
      clock.className = "spawnClock";
      tile.appendChild(clock);
    }

    const letterEl = document.createElement("span");
    letterEl.className = "letter";
    letterEl.textContent = L ?? "";
    tile.appendChild(letterEl);

    tile.addEventListener("click", ()=>{
      if (!L) return;
      if (typeof onTileClick === "function"){
        onTileClick(i, L);
      }
    });

    gridEl.appendChild(tile);
  }

  paintBlink(gridEl, blinkTargets);
}

export function paintBlink(gridEl, indices){
  // Legacy dashed-outline disabled; we keep this to clear any existing classes
  if (!gridEl) return;
  gridEl.querySelectorAll(".tile.blink").forEach(n => n.classList.remove("blink"));
  // No further action; spawn indicators are rendered as .spawnClock overlays
}

/**
 * Compute available size for the grid and set it to a square
 * - Looks at header, footer, and underBar heights in the current document
 */
export function layoutBoard(gridEl){
  if (!gridEl) return;
  const header = document.getElementById("hdr");
  const footer = document.querySelector("footer");
  const under = document.querySelector(".underBar");
  const middle = document.querySelector(".middle");

  // Available outer space (viewport minus chrome)
  const headerH = header ? header.getBoundingClientRect().height : 0;
  const footerH = footer ? footer.getBoundingClientRect().height : 0;
  const underH  = under ? (under.getBoundingClientRect().height + 8) : 0;
  const availHOuter = window.innerHeight - headerH - footerH - underH - 24;
  const availWOuter = middle ? middle.getBoundingClientRect().width : (gridEl.parentElement?.getBoundingClientRect().width || window.innerWidth);

  // Determine current columns and rows
  const cols = Math.max(1, parseInt(gridEl.dataset.cols || "5", 10));
  const tileCount = gridEl.querySelectorAll(".tile").length || cols * cols;
  const rows = Math.max(1, Math.ceil(tileCount / cols));

  // Account for container paddings, borders, and CSS grid gap
  const cs = getComputedStyle(gridEl);
  const gap = parseFloat(cs.gap) || 0;
  const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const padY = (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
  const borderX = (parseFloat(cs.borderLeftWidth) || 0) + (parseFloat(cs.borderRightWidth) || 0);
  const borderY = (parseFloat(cs.borderTopWidth) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
  const chromeX = padX + borderX;
  const chromeY = padY + borderY;

  // Available inner space for tiles (content box)
  const availW = Math.max(0, availWOuter - chromeX);
  const availH = Math.max(0, availHOuter - chromeY);

  // Compute tile size that fits rows×cols including gaps
  const totalGapW = gap * Math.max(0, cols - 1);
  const totalGapH = gap * Math.max(0, rows - 1);
  const maxTileW = (availW - totalGapW) / cols;
  const maxTileH = (availH - totalGapH) / rows;
  const tileSize = Math.max(16, Math.floor(Math.min(maxTileW, maxTileH)));

  // Final grid size
  const width  = tileSize * cols + totalGapW + chromeX;
  const height = tileSize * rows + totalGapH + chromeY;

  // Expose current tile size for settings previews
  document.documentElement.style.setProperty("--tile-size-px", `${tileSize}px`);

  gridEl.style.width  = `${Math.max(160, Math.min(width,  availWOuter))}px`;
  gridEl.style.height = `${Math.max(160, Math.min(height, availHOuter))}px`;
}
