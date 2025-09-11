/**
 * Letter Stacks Service Worker
 * - Pre-caches the app shell (HTML/CSS/JS) and the local dictionary (data/words.json)
 * - Cache-first strategy for same-origin GET requests
 * - Works on GitHub Pages and local static servers
 */

const CACHE_NAME = "letter-stacks-v3";

// Assets to precache (relative to repo root)
const PRECACHE_URLS = [
  // HTML
  "index.html",
  "game.html",
  "guide.html",

  // Styles
  "styles/base.css",
  "styles/landing.css",
  "styles/game.css",

  // Scripts
  "js/main.js",
  "js/game.js",
  "js/grid.js",
  "js/bag.js",
  "js/ui.js",
  "js/api.js",

  // Data
  "data/words.json"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(PRECACHE_URLS);
      // Activate updated SW immediately on install
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Clean old caches
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith("letter-stacks-") && n !== CACHE_NAME)
          .map((n) => caches.delete(n))
      );
      // Control existing clients without reload
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET requests
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  event.respondWith(cacheFirst(req));
});

async function cacheFirst(req) {
  const cache = await caches.open(CACHE_NAME);

  // Try cache first (ignore search to help with querystringed navigations)
  const cached = await cache.match(req, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const res = await fetch(req);
    // Cache successful responses for future offline use
    if (res && res.ok) {
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    // Navigation fallback to the app shell
    if (req.mode === "navigate") {
      const shell = await cache.match("index.html");
      if (shell) return shell;
    }
    // As a last resort, return a basic offline response
    return new Response("Offline", { status: 503, statusText: "Offline" });
  }
}
