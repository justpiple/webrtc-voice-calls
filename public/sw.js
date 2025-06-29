const CACHE_NAME = "voice-call-v1";
const urlsToCache = [
  "/",
  "/app.js",
  "/styles.css",
  "/js/dom-manager.js",
  "/js/audio-manager.js",
  "/js/webrtc-manager.js",
  "/js/socket-manager.js",
  "/js/utils.js",
  "/js/config.js",
  "/assets/ring.mp3",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache)),
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    }),
  );
});

self.addEventListener("sync", (event) => {
  if (event.tag === "keep-alive") {
    event.waitUntil(keepAlive());
  }
});

async function keepAlive() {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach((client) => {
      client.postMessage({
        type: "KEEP_ALIVE",
        timestamp: Date.now(),
      });
    });
  } catch (error) {
    console.error("Keep alive failed:", error);
  }
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "START_BACKGROUND_SYNC") {
    self.registration.sync.register("keep-alive");
  }
});

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "periodic-keep-alive") {
    event.waitUntil(keepAlive());
  }
});
