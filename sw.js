const CACHE = "ignyt-v6"; // bumped for the flattened, further-split file layout
const ASSETS = [
  "./", "./index.html", "./manifest.json",
  "./assets/icons/icon-192.png", "./assets/icons/icon-512.png",
  "./css/styles.css", "./css/components.css", "./css/utilities.css", "./css/responsive.css",
  "./js/app.js", "./js/ui.js", "./js/storage.js", "./js/workout.js", "./js/nutrition.js",
  "./js/timer.js", "./js/charts.js", "./js/settings.js", "./js/utils.js", "./js/constants.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first for the app shell (index.html + every JS module) so a code update is
// picked up on the very next load instead of staying frozen on whatever was precached
// at install time. Falls back to cache only when offline. Other assets (icons, manifest,
// css) stay cache-first since they rarely change.
const NETWORK_FIRST = [/index\.html$/, /\/js\/.*\.js$/];

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  const isShell = e.request.mode === "navigate" || NETWORK_FIRST.some((re) => re.test(url.pathname));
  if (isShell) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});
