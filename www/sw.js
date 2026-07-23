const CACHE = "ignyt-v55";
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./app.js",
  "./css/tokens.css", "./css/base.css", "./css/layout.css", "./css/components.css", "./css/responsive.css", "./css/pages/home.css", "./css/pages/workout.css", "./css/pages/nutrition.css", "./css/pages/progress.css", "./css/pages/tools.css", "./css/pages/profile.css", "./css/pages/ai-coach.css", "./js/pages/home.js", "./js/pages/workout.js", "./js/pages/progress.js", "./js/body-photos-db.js", "./js/bloodwork.js", "./js/goals.js", "./js/health-uploads.js", "./js/ai-coach.js", "./assets/images/athletes/home-athlete.png"];

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

// Network-first for the app shell (index.html, app.js) so a code update is picked up
// on the very next load instead of staying frozen on whatever was precached at install
// time. Falls back to cache only when offline. Other assets (icons, manifest) stay
// cache-first since they rarely change.
const NETWORK_FIRST = [/index\.html$/, /app\.js$/, /health-connect\.js$/, /health-settings-integration\.js$/, /health-connect\.css$/, /\/css\//, /\/js\/pages\//];

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
        // If nothing is cached yet either (e.g. the very first launch happens offline, or
        // install's caches.addAll partially failed), caches.match resolves undefined and
        // respondWith(undefined) would surface the browser's bare connection-error page
        // instead of anything Ignyt-branded. Fall back to the cached app shell itself so the
        // user still gets a real (if stale) screen rather than a blank native error page.
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match("./index.html")))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then((cached) => cached || fetch(e.request))
    );
  }
});
