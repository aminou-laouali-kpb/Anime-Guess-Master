// Minimal service worker: serves the build's hashed files (<base>/assets/*)
// from a cache, so returning players don't wait on the network for scripts
// and styles that can't have changed (a new build gets new file names).
// Nothing else is touched: index.html, /api, the socket and the portraits
// always go to the network as usual.
//
// To retire it, replace this file with one that calls
// self.registration.unregister() and keep it deployed for a while.

const CACHE = "animewho-assets-v1";
const MAX_ENTRIES = 80; // a few builds' worth; the oldest are dropped first
const ASSETS_PREFIX = new URL("assets/", self.registration.scope).pathname;

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cache) {
  const keys = await cache.keys();
  for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) {
    await cache.delete(key);
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // The host answers unknown paths with index.html (status 200): never keep
  // an HTML page under an asset's name.
  const type = response.headers.get("content-type") || "";
  if (response.ok && response.type === "basic" && !type.includes("text/html")) {
    await cache.put(request, response.clone());
    await trim(cache);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(ASSETS_PREFIX)) return;
  event.respondWith(cacheFirst(request));
});
