/**
 * dictionary API wrapper
 * - Default endpoint: https://api.dictionaryapi.dev/api/v2/entries/en/
 * - Exported: checkWord(word: string) => Promise<boolean>
 * - Caches results in-memory
 * - Fallback: if network/server error, returns DEV_ALLOW_ANY_WORD (default: true for MVP)
 */

const DEFAULT_ENDPOINT = "https://api.dictionaryapi.dev/api/v2/entries/en/";
const cache = new Map();

/** Read config from global or localStorage (optional future override) */
function getEndpoint(){
  if (typeof window !== "undefined" && window.WORD_STACKS_API_BASE){
    return String(window.WORD_STACKS_API_BASE);
  }
  const ls = typeof localStorage !== "undefined" ? localStorage.getItem("wordStacks.apiBase") : null;
  return (ls || DEFAULT_ENDPOINT);
}
function getDevAllowAnyWord(){
  const ls = typeof localStorage !== "undefined" ? localStorage.getItem("wordStacks.devAllowAnyWord") : null;
  if (ls === null) return true; // MVP default: on
  return ls === "true";
}

/**
 * Query the dictionary API
 * Returns: true if found (200 with valid body), false if 404,
 *          DEV fallback boolean if other error statuses or network failures
 */
export async function checkWord(word){
  const w = (word || "").toLowerCase().trim();
  if (w.length < 3) return false;
  if (cache.has(w)) return cache.get(w);

  const endpoint = getEndpoint();
  const allowFallback = getDevAllowAnyWord();

  try{
    const res = await fetch(endpoint + encodeURIComponent(w), { cache: "no-store" });
    if (res.status === 200){
      const data = await res.json();
      const ok = Array.isArray(data) && data.length > 0 && !!(data[0]?.word);
      cache.set(w, !!ok);
      return !!ok;
    }
    if (res.status === 404){
      cache.set(w, false);
      return false;
    }
    // unknown server response; dev fallback
    return allowFallback ? true : false;
  } catch{
    // network error / offline; dev fallback
    return allowFallback ? true : false;
  }
}
