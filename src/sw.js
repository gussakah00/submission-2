const CACHE_NAME = "submission-2-v1";
const API_BASE = "https://story-api.dicoding.dev/v1";

const STATIC_CACHE_URLS = [
  "/submission-2/",
  "/submission-2/index.html",
  "/submission-2/app.bundle.js",
  "/submission-2/app.css",
  "/submission-2/manifest.json",
  "/submission-2/favicon.png",
];

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Caching app shell...");
        return cache.addAll(STATIC_CACHE_URLS).catch((error) => {
          console.warn("Some files failed to cache:", error);
        });
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activating...");
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log("Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  if (request.url.startsWith("chrome-extension://")) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          if (request.headers.get("accept").includes("text/html")) {
            return caches.match("./index.html");
          }
        });
    })
  );
});

self.addEventListener("push", (event) => {
  console.log("Push event received:", event);

  const options = {
    body: "Ada cerita baru di sekitarmu!",
    icon: "./favicon.png",
    badge: "./favicon.png",
    data: { url: "./#/beranda" },
    actions: [
      { action: "open", title: "Buka Aplikasi" },
      { action: "close", title: "Tutup" },
    ],
  };

  event.waitUntil(
    self.registration.showNotification("Cerita di Sekitarmu", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "open") {
    event.waitUntil(clients.openWindow(event.notification.data.url));
  }
});
