/* v147, not back to v145. The coach merge shipped v146; reverting it restored the v145 name
   against contents that are no longer what v145 held. A device holding v146 would still
   refresh, since the names differ — but reusing an old version number for new content is a
   trap for whoever debugs the next cache issue. Versions only go up. */
const CACHE = "ignyt-v186";
/* Generated from the <script> and <link> tags in index.html. Hand-maintaining this
   drifted: it still listed js/health/health-security.js after that stopped being
   loaded, and named none of the diet-plan, fasting, reminders, supplements or
   photo-session modules — so those were simply unavailable offline. */
const ASSETS = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png", "./js/pages/home.js", "./js/pages/workout.js", "./js/pages/progress.js", "./js/diet/diet-plans.js", "./js/fasting/fasting.js", "./js/pages/diet-plan.js", "./js/pages/fasting.js", "./js/body/photo-sessions.js", "./js/notify/reminders.js", "./js/notify/active-workout.js", "./js/supplements/supplements.js", "./js/pages/supplements.js", "./js/config.js", "./js/storage-utils.js", "./js/body-photos-db.js", "./js/bloodwork.js", "./js/goals.js", "./js/health-uploads.js", "./js/health/health-db.js", "./js/health/health-models.js", "./js/health/health-utils.js", "./js/health/health-stub.js", "./js/health/health-dashboard.js", "./js/health/body-scan-ai.js", "./js/ai-coach.js", "./js/coach/profile-engine.js", "./js/coach/goal-engine.js", "./js/coach/recovery-engine.js", "./js/coach/exercise-engine.js", "./js/coach/plan-engine.js", "./js/coach/program-engine.js", "./js/coach/coach.js", "./js/food/food-db.js", "./js/food/serving-converter.js", "./js/food/food-importer.js", "./js/food/food-catalogue.js", "./js/food/food-images.js", "./js/food/nutrition-engine.js", "./js/food/food-curation.js", "./js/food/food-search.js", "./js/workout/exercise-images.js", "./js/workout/muscle-map.js", "./js/workout/exercise-instructions.js", "./app.js", "./health-connect.js", "./health-settings-integration.js", "./js/motivation/messages.js", "./js/motivation/xp.js", "./js/motivation/strength.js", "./js/motivation/review.js", "./js/motivation/milestones.js", "./js/motivation/celebrate.js", "./js/motivation/score.js", "./js/motivation/weekly.js", "./js/motivation/counters.js", "./js/motivation/report.js", "./js/billing/entitlements.js", "./js/auth/firebase-rest-auth.js", "./auth.js", "./cloud-sync.js", "./css/tokens.css", "./css/base.css", "./css/layout.css", "./css/components.css", "./css/responsive.css", "./css/pages/home.css", "./css/pages/workout.css", "./css/pages/nutrition.css", "./css/pages/progress.css", "./css/pages/tools.css", "./css/pages/diet-plan.css", "./css/pages/fasting.css", "./css/pages/progress-photos.css", "./css/pages/reminders.css", "./css/pages/supplements.css", "./css/pages/profile.css", "./css/pages/auth.css", "./css/pages/ai-coach.css", "./css/pages/dark-mode.css", "./health-connect.css", "./data/food/clean_foods.json", "./data/food/food_categories.json", "./legal/privacy-policy.html", "./legal/medical-disclaimer.html"];

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

/* Network-first for the app shell so a code update is picked up on the very next load
   instead of staying frozen on whatever was precached at install time. Falls back to cache
   only when offline. Icons, manifest, the food JSON and the legal pages stay cache-first —
   they are large or near-static and do not have to move in step with the code.

   THIS LIST COVERS ALL OF /js/, AND MUST KEEP DOING SO.
   It used to name only /js/pages/, which meant js/pages/home.js was fetched fresh while
   js/motivation/score.js came from the old cache. Those two files ship together and call
   into each other, so an update that added a function to one and a call to it from the
   other produced exactly one broken load: "IgnytScore.summary is not a function", and a
   blank Home screen until the user reopened the app. Observed three times while building
   this feature before the cause was traced here.

   Splitting code between network-first and cache-first is the bug. Either the whole app is
   fresh or the whole app is stale; a mixture is a version pair that was never tested. */
const NETWORK_FIRST = [/index\.html$/, /app\.js$/, /auth\.js$/, /cloud-sync\.js$/, /health-connect\.js$/, /health-settings-integration\.js$/, /health-connect\.css$/, /\/css\//, /\/js\//];

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
