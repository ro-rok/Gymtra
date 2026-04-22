const SW_VERSION = "2026.04.22.1";
const CACHE_NAME = `gymtra-shell-${SW_VERSION}`;
const OFFLINE_PAGE = "/offline.html";
const SHELL_FILES = ["/", "/manifest.webmanifest", "/favicon.ico", OFFLINE_PAGE];

const broadcastToClients = async (message) => {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
};

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_FILES))
      .then(() => broadcastToClients({ type: "SW_UPDATE_AVAILABLE", version: SW_VERSION }))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))).then(() =>
        broadcastToClients({ type: "SW_ACTIVATED", version: SW_VERSION })
      )
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  // Never proxy cross-origin requests (e.g. API on :8000) through SW.
  if (url.origin !== self.location.origin) {
    return;
  }
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(JSON.stringify({ detail: "Network unavailable" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      })
    );
    return;
  }
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match(OFFLINE_PAGE);
        }
        return cached;
      });
    })
  );
});

