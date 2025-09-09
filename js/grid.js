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
  const { gridSize, blinkTargets = [], onTileClick } = opts;
  if (!gridEl) return;

  if (gridSize) {
    gridEl.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;
  }

  gridEl.innerHTML = "";
  const N = gridStacks.length;
  for (let i = 0; i < N; i++){
    const tile = document.createElement("div");
    tile.className = "tile";
    tile.dataset.idx = String(i);

    if (selectedSet && selectedSet.has(i)) tile.classList.add("selected");

    const L = topLetter(gridStacks[i]);
    tile.textContent = L ?? "";

    const stackLen = gridStacks[i]?.length || 0;
    if (stackLen > 1){
      const b = document.createElement("div");
      b.className = "badge";
      b.textContent = `×${stackLen}`;
      tile.appendChild(b);
    }

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
  if (!gridEl) return;
  gridEl.querySelectorAll(".tile.blink").forEach(n => n.classList.remove("blink"));
  if (!indices || !indices.length) return;
  for (const idx of indices){
    const node = gridEl.querySelector(`.tile[data-idx="${idx}"]`);
    if (node) node.classList.add("blink");
  }
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

  const headerH = header ? header.getBoundingClientRect().height : 0;
  const footerH = footer ? footer.getBoundingClientRect().height : 0;
  const underH  = under ? (under.getBoundingClientRect().height + 8) : 0;

  const availH = window.innerHeight - headerH - footerH - underH - 24;
  const availW = middle ? middle.getBoundingClientRect().width : gridEl.parentElement?.getBoundingClientRect().width || window.innerWidth;

  const boardSize = Math.max(160, Math.min(availH, availW));
  gridEl.style.width  = `${boardSize}px`;
  gridEl.style.height = `${boardSize}px`;
}
