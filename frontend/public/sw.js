const SW_VERSION = "2026.05.18.3";
const CACHE_NAME = `gymtra-shell-${SW_VERSION}`;
const OFFLINE_PAGE = "/offline.html";
const SHELL_FILES = [
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/icon-512-maskable.png",
  "/icons/favicon-32.png",
  "/icons/apple-touch-icon.png",
  OFFLINE_PAGE,
];

const DEFAULT_ROUTE = "/";
const ROUTE_BY_EVENT = {
  water: "/member/dashboard",
  meal_breakfast: "/member/dashboard",
  meal_lunch: "/member/dashboard",
  meal_dinner: "/member/dashboard",
  incomplete_daily_tasks: "/member/dashboard",
  password_reset_request: "/owner/dashboard",
  platform_test: "/",
};

const broadcastToClients = async (message) => {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  clients.forEach((client) => client.postMessage(message));
};

const parsePushPayload = (event) => {
  if (!event.data) {
    return { title: "Gymtra", body: "", eventType: "general", url: DEFAULT_ROUTE, tag: "gymtra-general" };
  }
  try {
    const payload = event.data.json();
    const eventType = payload.eventType || "general";
    return {
      title: payload.title || "Gymtra",
      body: payload.body || "",
      eventType,
      url: payload.url || ROUTE_BY_EVENT[eventType] || DEFAULT_ROUTE,
      tag: payload.tag || `gymtra-${eventType}`,
    };
  } catch {
    return {
      title: "Gymtra",
      body: event.data.text(),
      eventType: "general",
      url: DEFAULT_ROUTE,
      tag: "gymtra-general",
    };
  }
};

const resolveNotificationUrl = (url) => new URL(url, self.location.origin).href;

const showPushNotification = async (payload) => {
  const href = resolveNotificationUrl(payload.url);
  await self.registration.showNotification(payload.title, {
    body: payload.body,
    tag: payload.tag,
    icon: "/icons/icon-192.png",
    badge: "/icons/favicon-32.png",
    data: { url: href, eventType: payload.eventType, tag: payload.tag },
    renotify: false,
  });
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

/** Web Push: always show a system notification (required on iOS; reliable on Android). */
self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clients) {
        if (client.focused) {
          client.postMessage({
            type: "PUSH_RECEIVED",
            eventType: payload.eventType,
            url: payload.url,
            title: payload.title,
            body: payload.body,
            tag: payload.tag,
          });
        }
      }
      await showPushNotification(payload);
    })()
  );
});

self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil(
    (async () => {
      const subscription = await self.registration.pushManager.getSubscription();
      await broadcastToClients({
        type: "PUSH_SUBSCRIPTION_CHANGED",
        endpoint: subscription?.endpoint || null,
      });
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = event.notification?.data?.url || resolveNotificationUrl(DEFAULT_ROUTE);
  const eventType = event.notification?.data?.eventType || "general";
  const path = new URL(href).pathname + new URL(href).search;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "NOTIFICATION_CLICKED", eventType, url: path });
          if ("navigate" in client) {
            return client.navigate(path).catch(() => client.focus());
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(href);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  const eventType = event.notification?.data?.eventType || "general";
  event.waitUntil(
    broadcastToClients({ type: "NOTIFICATION_CLOSED", eventType, tag: event.notification?.tag })
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
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

  const isNavigate = event.request.mode === "navigate";
  const isShellDoc = isNavigate || url.pathname === "/" || url.pathname.endsWith(".html");

  if (isShellDoc) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(
            (cached) =>
              cached ||
              caches.match(OFFLINE_PAGE).then(
                (offlinePage) =>
                  offlinePage ||
                  new Response("Offline", {
                    status: 503,
                    headers: { "Content-Type": "text/plain; charset=utf-8" },
                  }),
              ),
          ),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => new Response("", { status: 504, statusText: "Gateway Timeout" }));
    }),
  );
});
