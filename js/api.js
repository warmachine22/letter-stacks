/**
 * Local dictionary loader & checker
 * - Loads once from data/words.json (JSON array of strings)
 * - Exported: checkWord(word: string) => Promise<boolean>
 * - Strict: no network fallback, never accept non-words
 */

let dictSet = null;
/** @type {Promise<Set<string>>|null} */
let loadPromise = null;

function normalizeWord(w) {
  return (w || "").toLowerCase().trim();
}

async function ensureDictionary() {
  if (dictSet) return dictSet;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    // Allow SW to serve from cache; still fine on first load
    const res = await fetch("data/words.json", { cache: "force-cache" });
    if (!res.ok) throw new Error("Failed to load dictionary");

    const arr = await res.json();
    const set = new Set();

    // Normalize to lowercase, keep only alphabetic words length ≥ 3
    for (let i = 0; i < arr.length; i++) {
      const raw = arr[i];
      if (typeof raw !== "string") continue;
      const lower = normalizeWord(raw);
      if (lower.length < 3) continue;
      if (!/^[a-z]+$/.test(lower)) continue; // filter out anything not A–Z
      set.add(lower);
    }

    dictSet = set;
    return dictSet;
  })();

  return loadPromise;
}

/**
 * Check if a word exists in the local dictionary (strict).
 * If the dictionary cannot be loaded (e.g., first-ever offline visit), returns false.
 */
export async function checkWord(word) {
  const w = normalizeWord(word);
  if (w.length < 3) return false;

  try {
    const set = await ensureDictionary();
    return set.has(w);
  } catch {
    // Strict: never allow words if dictionary unavailable
    return false;
  }
}
