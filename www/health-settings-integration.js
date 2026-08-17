/* =========================================================
   HEALTH CONNECT — SETTINGS INTEGRATION + EXPORT HOOKS

   Zero edits to app.js. Loaded after both app.js and health-connect.js.

   1. Settings → Integrations → Health Connect card, injected into the
      Settings tab via a MutationObserver on #main (app.js replaces #main's
      content on every render(); this re-injects after each one, same
      verified-working pattern as the dashboard integration built earlier
      in this project).

   2. Workout-completed / weight-logged export hooks are polled on the
      SAME observer firing (not a localStorage.setItem override -- that
      approach was tried earlier in this project and found unreliable;
      Storage objects have special Web IDL behavior that resists method
      reassignment in real browsers, not just in testing).

   3. Duplicate-export prevention has two layers: this file tracks which
      IGNYT workout/body-log ids have already been exported in a new
      localStorage key (hx_hc_exported_ids) and skips them before even
      calling the native plugin; the native plugin ALSO tags every write
      with a clientRecordId derived from that same IGNYT id, so Health
      Connect's own insert API upserts rather than duplicates even if
      this layer is ever bypassed.

   4. No permission requests happen anywhere in this file except inside
      the explicit "Connect" button's click handler -- never on load,
      never implicitly from a read call.
========================================================= */

(function () {
  "use strict";

  /* Android's product name, and meaningless on an iPhone where Health ships with the OS and
     cannot be installed. One source of truth in health-connect.js; this is a short alias so
     the templates below stay readable. */
  function hcName() {
    try { return (window.HealthConnect && HealthConnect.brandName) ? HealthConnect.brandName() : "Health Connect"; }
    catch (e) { return "Health Connect"; }
  }

  /* Used where the two platforms need a different SENTENCE, not just a different name — the
     "isn't installed" case, which cannot happen on iOS at all. */
  function platformIsIOS() {
    try {
      return typeof window.Capacitor !== "undefined"
        && typeof window.Capacitor.getPlatform === "function"
        && window.Capacitor.getPlatform() === "ios";
    } catch (e) { return false; }
  }

  const HC_STATE_KEY = "hx_hc_state";           // {connected, lastSyncAt, lastElevationMergeAt}
  const HC_EXPORTED_KEY = "hx_hc_exported_ids";  // {workouts:[...ids], weights:[...ids]}
  const HC_INSIGHTS_KEY = "hx_hc_insights_cache"; // {day:{...,fetchedAt}, week:{...}, month:{...}, year:{...}}
  const INSIGHTS_PERIODS = ["day", "week", "month", "year"];
  // Six hours. Comfortably more often than the ledger needs (it is day-keyed) and far less
  // often than handleSync() runs, which is the point — see the merge call site.
  const ELEVATION_MERGE_MIN_MS = 6 * 60 * 60 * 1000;

  function loadHcState() {
    try { return JSON.parse(localStorage.getItem(HC_STATE_KEY) || "null") || { connected: false, lastSyncAt: null }; }
    catch (e) { return { connected: false, lastSyncAt: null }; }
  }
  function saveHcState(s) {
    try { localStorage.setItem(HC_STATE_KEY, JSON.stringify(s)); } catch (e) { /* storage full/unavailable -- non-fatal */ }
  }
  function loadExported() {
    try { return JSON.parse(localStorage.getItem(HC_EXPORTED_KEY) || "null") || { workouts: [], weights: [] }; }
    catch (e) { return { workouts: [], weights: [] }; }
  }
  function saveExported(e) {
    try { localStorage.setItem(HC_EXPORTED_KEY, JSON.stringify(e)); } catch (err) { /* non-fatal */ }
  }

  // ---------------------------------------------------------------------
  // Export hooks: polled on every #main mutation (see #4 below for why)
  // ---------------------------------------------------------------------

  function safeLen(key) {
    try { return JSON.parse(localStorage.getItem(key) || "[]").length; } catch (e) { return 0; }
  }
  function safeWeightAndLog() {
    try {
      const profile = JSON.parse(localStorage.getItem("hx_profile") || "{}");
      const bodylog = JSON.parse(localStorage.getItem("hx_bodylog") || "[]");
      return { weight: profile.weight || null, latestLogId: bodylog[0] ? bodylog[0].id : null };
    } catch (e) { return { weight: null, latestLogId: null }; }
  }

  let _lastWorkoutCount = safeLen("hx_workout_log");
  let _lastSeenBodyLogId = safeWeightAndLog().latestLogId;

  async function checkForExportableEvents() {
    if (!window.HealthConnect || !HealthConnect.isNativeAndroid()) return;
    const hcState = loadHcState();
    if (!hcState.connected) return; // never export before the user has explicitly connected

    // Workout completed?
    const count = safeLen("hx_workout_log");
    if (count > _lastWorkoutCount) {
      try {
        const log = JSON.parse(localStorage.getItem("hx_workout_log") || "[]");
        const session = log[0]; // newest-first
        if (session && session.id != null) await exportWorkout(session);
      } catch (e) { /* malformed read, skip this cycle */ }
    }
    _lastWorkoutCount = count;

    // New weight logged?
    const { latestLogId } = safeWeightAndLog();
    if (latestLogId != null && latestLogId !== _lastSeenBodyLogId) {
      try {
        const bodylog = JSON.parse(localStorage.getItem("hx_bodylog") || "[]");
        const entry = bodylog.find(e => e.id === latestLogId);
        if (entry && entry.weight) await exportWeight(entry);
      } catch (e) { /* skip this cycle */ }
    }
    _lastSeenBodyLogId = latestLogId;
  }

  async function exportWorkout(session) {
    const exported = loadExported();
    const idStr = String(session.id);
    if (exported.workouts.includes(idStr)) return; // already exported -- do not call native again
    const type = (session.title || "").toLowerCase().includes("race") ? "race" : "strength";
    const result = await HealthConnect.saveWorkout(idStr, session.startedAt, session.finishedAt || session.startedAt, session.title || "Workout", type);
    if (result.success) {
      exported.workouts.push(idStr);
      saveExported(exported);
    } else {
      console.warn("[HealthConnect] Workout export failed (will retry next Sync):", result.error);
    }
  }

  async function exportWeight(entry) {
    const exported = loadExported();
    const idStr = String(entry.id);
    if (exported.weights.includes(idStr)) return;
    const timeMs = entry.date ? new Date(entry.date).getTime() : Date.now();
    const result = await HealthConnect.saveWeight(idStr, Number(entry.weight), timeMs);
    if (result.success) {
      exported.weights.push(idStr);
      saveExported(exported);
    } else {
      console.warn("[HealthConnect] Weight export failed (will retry next Sync):", result.error);
    }
  }

  // ---------------------------------------------------------------------
  // Settings card
  // ---------------------------------------------------------------------

  let _syncData = null;
  let _busy = false;
  let _errorMsg = null;

  function cardHtml() {
    if (!window.HealthConnect || !HealthConnect.isNativeAndroid()) {
      return `
        <div class="hc-card" id="hc-settings-card">
          <div class="hc-card-header"><span>${hcName()}</span></div>
          <div class="hc-empty">Available in the IGNYT mobile app only. Sync your fitness and health data with IGNYT.</div>
        </div>`;
    }

    const hcState = loadHcState();
    const statusLabel = hcState.connected ? "Connected" : "Not Connected";
    const statusColor = hcState.connected ? "var(--mint)" : "var(--muted)";
    const lastSync = hcState.lastSyncAt ? new Date(hcState.lastSyncAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Never";

    return `
      <div class="hc-card" id="hc-settings-card">
        <div class="hc-card-header"><span>${hcName()}</span></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:13px;color:var(--muted);">Status</span>
          <span style="font-size:13px;font-weight:700;color:${statusColor};">${statusLabel}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:13px;color:var(--muted);">Last sync</span>
          <span style="font-size:13px;font-weight:700;">${lastSync}</span>
        </div>
        <div style="font-size:12px;color:var(--muted);margin:10px 0 12px;">Sync your fitness and health data with IGNYT.</div>
        ${_errorMsg ? `<div class="hc-empty hc-error" style="margin-bottom:10px;">${_errorMsg}</div>` : ""}
        ${!hcState.connected
          ? `<button class="hc-sync-btn" style="width:100%;padding:10px;" data-hc-action="connect" ${_busy ? "disabled" : ""}>${_busy ? "Connecting…" : `Connect ${hcName()}`}</button>`
          : `
            <div style="display:flex;gap:8px;">
              <button class="hc-sync-btn" style="flex:1;padding:10px;" data-hc-action="sync" ${_busy ? "disabled" : ""}>${_busy ? "Syncing…" : "Sync Now"}</button>
              <button class="hc-sync-btn" style="flex:1;padding:10px;color:var(--accent);" data-hc-action="disconnect" ${_busy ? "disabled" : ""}>Disconnect</button>
            </div>
          `}
      </div>`;
  }

  let _lastCardHtml = null;

  function injectCard() {
    if (typeof state === "undefined") return;
    const main = document.getElementById("main");
    if (!main) return;
    const onSettingsIntegrations = state.tab === "settings"; // shown at the top of Settings
    const html = onSettingsIntegrations ? cardHtml() : "";
    const existing = document.getElementById("hc-settings-card");

    if (html === _lastCardHtml && (!!existing === !!html)) return;

    if (!html) {
      if (existing) { observer.disconnect(); existing.remove(); observer.observe(main, { childList: true }); }
      _lastCardHtml = html;
      return;
    }

    observer.disconnect();
    if (existing) existing.outerHTML = html;
    else main.insertAdjacentHTML("afterbegin", html);
    observer.observe(main, { childList: true });

    _lastCardHtml = html;
    wireCardButtons();
  }

  function wireCardButtons() {
    const connectBtn = document.querySelector('[data-hc-action="connect"]');
    if (connectBtn) connectBtn.addEventListener("click", handleConnect);
    const syncBtn = document.querySelector('[data-hc-action="sync"]');
    if (syncBtn) syncBtn.addEventListener("click", handleSync);
    const disconnectBtn = document.querySelector('[data-hc-action="disconnect"]');
    if (disconnectBtn) disconnectBtn.addEventListener("click", handleDisconnect);
  }

  async function handleConnect() {
    if (_busy) return;
    _busy = true; _errorMsg = null; injectCard(); notifyDashboard();

    const availability = await HealthConnect.isAvailable();
    if (!availability.success || !availability.data.available) {
      _busy = false;

      /* THE CALL FAILING AND THE STORE BEING ABSENT ARE NOT THE SAME THING, and this used to
         report both as "Health Connect isn't installed."

         availability.error carries the real reason — the plugin not being registered, a
         native call throwing — and it was being discarded in favour of a sentence that is
         merely wrong on Android and meaningless on iOS, where Health ships with the operating
         system and cannot be installed or missing. An iPhone reporting that Health Connect is
         not installed sends its owner to the App Store looking for something that does not
         exist, which is exactly what happened.

         So: a real error is shown as itself. Only a successful call that honestly answers
         "not available" gets the store wording, and only on Android. */
      if (!availability.success) {
        _errorMsg = availability.error || "Health data is unavailable on this device.";
      } else if (availability.data && availability.data.status === "UPDATE_REQUIRED") {
        _errorMsg = `${hcName()} needs an update.`;
        await HealthConnect.openHealthConnectInstall();
      } else if (platformIsIOS()) {
        _errorMsg = "Apple Health is unavailable on this device.";
      } else {
        _errorMsg = `${hcName()} isn't installed.`;
        await HealthConnect.openHealthConnectInstall();
      }

      injectCard(); notifyDashboard();
      return;
    }

    // The ONLY place permissions are ever requested -- direct result of this explicit tap.
    const perm = await HealthConnect.requestPermissions();
    _busy = false;
    if (!perm.success || !perm.data.granted) {
      _errorMsg = perm.error || "Permission was not granted.";
      injectCard(); notifyDashboard();
      return;
    }

    const hcState = loadHcState();
    hcState.connected = true;
    saveHcState(hcState);
    _errorMsg = null;
    injectCard(); notifyDashboard();
    await handleSync();
  }

  async function handleSync() {
    if (_busy) return;
    _busy = true; _errorMsg = null; injectCard(); notifyDashboard();

    // Re-check permission status before this protected operation -- never assume a prior
    // grant still holds (it may have been revoked from Android Settings since).
    const status = await HealthConnect.getPermissionStatus();
    if (!status.success || !status.data.granted) {
      _busy = false;
      _errorMsg = "Permissions are no longer granted. Reconnect to continue syncing.";
      const hcState = loadHcState();
      hcState.connected = false;
      saveHcState(hcState);
      injectCard(); notifyDashboard();
      return;
    }

    const result = await HealthConnect.syncNow();
    _busy = false;
    if (result.success) {
      _syncData = result.data;
      const hcState = loadHcState();
      hcState.lastSyncAt = result.data.syncedAt;

      /* Elevation rides along with the sync the user already asked for rather than getting a
         button of its own. Deliberately NOT awaited: it tops up a badge ledger, and a slow or
         failing elevation read must not hold up or fail the sync the user is watching.

         Throttled, because "the sync the user asked for" is not what handleSync() mostly is:
         refreshWhenConnected() drives it on launch, on every visibilitychange to visible, on
         every health-tab navigation and on a 5-minute interval, so tapping between Home and
         Nutrition ten times fired ten 30-day aggregate reads, each trailed by a sweep over 680
         achievement defs. The ledger is day-keyed and only needs topping up about daily; the
         30-day window it reads gives a wide margin, so a device that is off for a week still
         loses nothing. */
      if (typeof mergeElevationFromHealth === "function" &&
          Date.now() - (Number(hcState.lastElevationMergeAt) || 0) >= ELEVATION_MERGE_MIN_MS) {
        hcState.lastElevationMergeAt = Date.now();
        try { mergeElevationFromHealth(30); } catch (e) { /* never breaks the sync */ }
      }
      saveHcState(hcState);
      _errorMsg = null;
      /* The same field means different things on the two platforms, so the message cannot be
         the same. Health Connect reports read grants, so "partial" there really does mean some
         metrics cannot be read. On iOS the only statuses HealthKit will reveal are for the two
         types IGNYT WRITES, so "partial" means it cannot save back — reads may be working
         perfectly. Showing the Android wording there sends the user off to fix a permission
         that is not broken. */
      if (result.data.partialPermissions) {
        _errorMsg = result.data.readAuthorizationIsUnknowable
          ? `IGNYT can't save workouts or weight back to ${hcName()}. Turn those on in Settings › Privacy & Security › Health › IGNYT.`
          : `Permission required for some ${hcName()} metrics.`;
      }
      // Fast-load cache for Home: written only on a SUCCESSFUL explicit sync, read by
      // renderHomeHealthFeed() so Home never has to wait on (or trigger) a native call.
      try { localStorage.setItem("hx_hc_dashboard_cache", JSON.stringify(result.data)); } catch (e) { /* storage full/unavailable -- non-fatal, Home just falls back to no cached data */ }
      window.dispatchEvent(new CustomEvent("ignyt:health-connect-updated"));
    } else {
      _errorMsg = result.error || "Sync failed.";
    }
    injectCard(); notifyDashboard();
  }

  // ---------------------------------------------------------------------
  // Insights (Day/Week/Month/Year real period aggregates) -- cached the same
  // way as the dashboard snapshot: an in-memory copy for the current session
  // plus a localStorage fallback so the Insights page never has to block on
  // (or trigger) a native call just to paint whatever was last fetched.
  // ---------------------------------------------------------------------

  let _insightsData = {};   // period -> latest fetched payload (in-memory)
  let _insightsBusy = {};   // period -> bool, so a slow fetch can't overlap itself

  function loadInsightsCache() {
    try { return JSON.parse(localStorage.getItem(HC_INSIGHTS_KEY) || "null") || {}; }
    catch (e) { return {}; }
  }
  function saveInsightsCache(cache) {
    try { localStorage.setItem(HC_INSIGHTS_KEY, JSON.stringify(cache)); } catch (e) { /* non-fatal */ }
  }

  function getInsightsData(period) {
    if (!INSIGHTS_PERIODS.includes(period)) period = "day";
    if (_insightsData[period]) return _insightsData[period];
    return loadInsightsCache()[period] || null;
  }

  /** Real native fetch for one period. Never requests permissions (same rule as sync);
   *  no-ops quietly if not connected or a permission grant no longer holds -- the Insights
   *  page just keeps showing whatever's cached (or the honest empty state) instead. */
  async function fetchInsights(period) {
    if (!INSIGHTS_PERIODS.includes(period)) period = "day";
    if (!window.HealthConnect || !HealthConnect.isNativeAndroid()) return null;
    if (_insightsBusy[period]) return null;
    const hcState = loadHcState();
    if (!hcState.connected) return null;

    _insightsBusy[period] = true;
    try {
      const status = await HealthConnect.getPermissionStatus();
      if (!status.success || !status.data.granted) return null;
      const result = await HealthConnect.getInsights(period);
      if (result.success) {
        result.data.fetchedAt = Date.now();
        _insightsData[period] = result.data;
        const cache = loadInsightsCache();
        cache[period] = result.data;
        saveInsightsCache(cache);
        if (typeof state !== "undefined" && typeof render === "function" && state.tab === "insights") render();
        return result.data;
      }
      return null;
    } finally {
      _insightsBusy[period] = false;
    }
  }

  async function handleDisconnect() {
    if (_busy) return;
    _busy = true; injectCard(); notifyDashboard();
    await HealthConnect.revokePermissions();
    const hcState = loadHcState();
    hcState.connected = false;
    saveHcState(hcState);
    _busy = false; _syncData = null; _errorMsg = null;
    injectCard(); notifyDashboard();
  }

  /** Lets app.js's own renderHealthDashboard() (a real tab, not DOM-injected) stay in sync
   *  with actions taken from here or from the Settings-tab card, and vice versa -- both
   *  read/write the exact same hx_hc_state / _syncData, so there's one source of truth,
   *  not two drifting copies. No-ops harmlessly if the Health tab isn't the current one,
   *  since render() only repaints whichever tab state.tab actually points at. */
  /** Lets app.js's own renderHealthDashboard() AND renderHomeHealthFeed() (real tabs, not
   *  DOM-injected) stay in sync with actions taken from here or from the Settings-tab card.
   *  Both read the exact same hx_hc_state / _syncData / hx_hc_dashboard_cache, so there's
   *  one source of truth. No-ops harmlessly if neither Home nor Health is the current tab. */
  function notifyDashboard() {
    if (typeof state === "undefined" || typeof render !== "function") return;
    if (state.tab === "health" || state.tab === "home" || state.tab === "nutrition" || state.tab === "insights") render();
  }

  // Exposed so app.js's renderHealthDashboard() can drive the exact same connect/sync/
  // disconnect logic and read the exact same in-flight state, instead of duplicating it.
  window.HealthConnectIntegration = {
    loadState: loadHcState,
    getSyncData: () => _syncData,
    isBusy: () => _busy,
    getError: () => _errorMsg,
    connect: handleConnect,
    sync: handleSync,
    disconnect: handleDisconnect,
    // Insights (Day/Week/Month/Year real period aggregates)
    getInsightsData: getInsightsData,
    isInsightsBusy: (period) => !!_insightsBusy[period],
    refreshInsights: fetchInsights
  };

  // Reads never request permissions. These refreshes only run after the user explicitly
  // connected Health Connect, and a revoked grant is surfaced as "Permission required".
  // Covers: app launch, foreground resume (visibilitychange), the 5-minute active-app
  // interval below, and explicit navigation to Home/Health/Nutrition(Food Log)/Insights
  // (the ignyt:health-connect-navigation event, dispatched from app.js's nav handler).
  // When Insights is the open tab, also refreshes real period data for whichever
  // Day/Week/Month/Year range is currently selected -- not just the "today" snapshot.
  function refreshWhenConnected() {
    const hcState = loadHcState();
    if (!hcState.connected) return;
    if (!_busy) handleSync();
    if (typeof state !== "undefined" && state.tab === "insights") {
      fetchInsights(state.insightsRange || "day");
    }
  }

  window.addEventListener("ignyt:health-connect-navigation", refreshWhenConnected);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") refreshWhenConnected();
  });

  // ---------------------------------------------------------------------
  // Boot: single observer drives both the card and the export hooks.
  // No auto-sync, no auto-permission-request anywhere in this boot path.
  // ---------------------------------------------------------------------

  const observer = new MutationObserver(() => {
    checkForExportableEvents();
    injectCard();
  });

  function startObserving() {
    const main = document.getElementById("main");
    if (main) {
      observer.observe(main, { childList: true }); injectCard();
      refreshWhenConnected(); // app launch
      window.setInterval(() => {
        if (document.visibilityState === "visible") refreshWhenConnected();
      }, 5 * 60 * 1000);
    }
    else setTimeout(startObserving, 200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserving);
  } else {
    startObserving();
  }
})();
