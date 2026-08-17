/* =========================================================
   ENTITLEMENTS — the single answer to "can this user use that?"

   Every premium check in the app goes through has(). Gating scattered across render
   functions is a list somebody eventually forgets to add to; one module means one place to
   read, one place to change, and one place to get the offline behaviour right.

   ANDROID ONLY, DELIBERATELY
   The paywall ships on Android. On iOS and the web build has() returns true for everything —
   iOS cannot even sign in yet, and charging for a platform that does not work would be
   indefensible. When iOS gets StoreKit this is the file that learns about it.

   WHAT HAPPENS WHEN BILLING CANNOT BE REACHED
   Free, never locked. A user who has paid keeps premium from the cached entitlement for
   GRACE_DAYS so a flight or a dead network does not take away something they bought; a user
   who has never been confirmed premium is treated as free. The failure mode is "you did not
   get charged and you kept the free app", never "the app you paid for stopped working".

   PRICES ARE NOT IN THIS FILE
   Play Console owns them. The app asks Play what a plan costs and shows that string, already
   localised and tax-inclusive. Hardcoding 249 here would display it to someone Google is
   about to charge something else — a different currency, a regional price, a promotion.
========================================================= */

window.IgnytEntitlements = (function () {
  "use strict";

  /* GATING IS OFF. Every feature is free, including the AI Coach.
   *
   * `has()` returns true for anything not named in this map, so an empty map means every
   * premiumAllows() seam in app.js passes and no upgrade wall ever renders. Because the wall
   * is the only route to the paywall sheet, that also makes the paywall unreachable — there
   * is no second switch to find, and no half-gated state where a user can reach a purchase
   * screen for something they already have.
   *
   * THE BILLING STACK BELOW IS DELIBERATELY LEFT INTACT: the Play query, the entitlement
   * cache, the grace period, purchase and restore, and the server-side verification they talk
   * to. None of it runs while this map is empty. It was emptied rather than deleted because
   * turning gating back on should be restoring this map and nothing else — deleting it would
   * turn a one-line change into rebuilding a feature, and the Play product ID and the verified
   * entitlement records would go with it.
   *
   *   var PREMIUM_FEATURES = {
   *     coach:      "AI Coach",
   *     diet:       "Diet Plans",
   *     health:     "Health Dashboard",
   *     insights:   "Insights",
   *     photos:     "Progress Photos",
   *     sync:       "Cloud Sync & Backup",
   *     muscles:    "Muscle Distribution",
   *     fasting:    "Fasting Tracker",
   *     supplements:"Supplement Tracker",
   *     export:     "Data Export"
   *   };
   *
   * The server has its own switch and it already agrees: AI_REQUIRES_PREMIUM is false on
   * Render, so /v1/ai/chat serves any authenticated account. BOTH have to be on for gating to
   * work, and only this one has to be off for it not to be — which is the safe asymmetry.
   *
   * Free tier keeps everything the user creates and everything they log. When this does come
   * back, what is gated is new capability, never access to their own data — an app that holds
   * someone's workout history hostage earns the review it gets, and Play takes a dim view of
   * it too. */
  /* THE GATE MAP. has(feature) returns true for anything NOT listed here, so this map is the
     complete definition of what costs money -- an empty map means the whole app is free, which
     is what it was until now.

     The spec: free for 7 days (the trial is an OFFER on the Play base plan, not app-side logic),
     after which a free user keeps basic workout logging and basic food logging. Everything else
     is premium.

     What stays free is deliberately NOT in this map:
       - logging today's workout: start, sets, reps, weight, finish
       - logging today's food, searching the FULL 13,516-food library
       - logging weight
     Those are the product's floor. A user who stops paying can still record what they did today.

     A gated feature must still let people READ what they already own. Gating history means it
     is not browsable, never that it is deleted -- and gating sync means it stops syncing, never
     that local data disappears. That distinction is the difference between a lapsed subscription
     and a support ticket saying the app ate their data. */
  var PREMIUM_FEATURES = {
    coach:       "AI Coach",
    diet:        "Diet Plans",
    plans:       "Training Plans",
    hyrox:       "HYROX Training",
    history:     "Workout History",
    analytics:   "Advanced Progress",
    records:     "Personal Records",
    muscles:     "Muscle Distribution",
    calendar:    "Training Calendar",
    insights:    "Insights",
    health:      "Health Connect & Wearables",
    sync:        "Cloud Sync & Backup",
    photos:      "Progress Photos",
    fasting:     "Fasting Tracker",
    supplements: "Supplement Tracker",
    macros:      "Macro & Micronutrient Tracking",
    export:      "Data Export",
    reminders:   "Advanced Reminders"
  };

  var PRODUCT_ID = "ignyt_premium";
  var CACHE_KEY = "hx_entitlement";
  var GRACE_DAYS = 14;

  /* Grandfathering, off as specified: everyone gets the same free tier and the same offer.
   *
   * IGNYT is already live, so turning this on is the difference between an existing user
   * opening the app to find the AI Coach behind a paywall and never seeing a change. Set it
   * to an ISO date and anyone whose profile predates it keeps full access for good.
   *
   *   var GRANDFATHER_BEFORE = "2026-08-02";
   */
  var GRANDFATHER_BEFORE = null;

  var _state = null;

  function platform() {
    return (typeof window.Capacitor !== "undefined"
      && typeof window.Capacitor.isNativePlatform === "function"
      && window.Capacitor.isNativePlatform()
      && typeof window.Capacitor.getPlatform === "function")
      ? window.Capacitor.getPlatform() : "web";
  }

  /**
   * ANDROID IS PAID. iOS AND WEB ARE FREE. THIS IS A DECISION, NOT AN OVERSIGHT.
   *
   * isPremium() returns true unconditionally wherever this is false, so on iPhone every gate
   * passes and no upgrade wall ever renders -- the whole app is free there. Confirmed as
   * intended by the product owner on 2026-08-13.
   *
   * The reason is simply that billing exists on one platform: Play Billing is wired up through
   * BillingPlugin.kt, and there is no StoreKit equivalent on the Swift side. Charging on iOS
   * would need a plugin, App Store Connect products and receipt validation -- none of which
   * exists, and shipping a paywall that cannot take money is worse than no paywall.
   *
   * DO NOT "FIX" THIS by making it return true everywhere. That would gate iOS features behind
   * an entitlement no iPhone user can ever obtain, locking them out of an app they cannot pay
   * for. If iOS billing is built later, this is the line that changes -- and it changes at the
   * same time as the plugin lands, not before.
   */
  /* iOS StoreKit landed as ios/App/App/BillingPlugin.swift on 2026-08-17, registered as
     IgnytBilling — the same plugin name Android uses, returning the same JSON keys, so nothing
     in this file needs a per-platform branch beyond the flag below.

     THE FLAG IS OFF, AND THAT IS THE POINT. The comment above says this line changes "at the
     same time as the plugin lands, not before". The plugin has been WRITTEN, not landed: it has
     never been compiled (no Mac in this toolchain — iOS builds go through Codemagic) and never
     run. Turning this on now would gate every premium feature on an iPhone behind a purchase
     path nobody has watched work, and if it does not work those users are locked out of an app
     they cannot pay for. That is strictly worse than iOS staying free.

     TURN IT ON only after, on a real device: getProducts() returns both plans with real prices,
     a sandbox purchase completes, getEntitlement() reports entitled afterwards, restore()
     recovers it on a reinstall, and the BACKEND agrees — /v1/billing/verify has no Apple path
     yet, so server-side entitlement is still Android-only and must be built before this flips.
     Flipping it before that ships a client-only paywall, which is forgeable in seconds. */
  var IOS_BILLING_ENABLED = false;

  function paywallApplies() {
    if (platform() === "android") return true;
    // Plugin presence is checked too, so a build without it cannot gate anything even if the
    // flag is on by mistake.
    if (platform() === "ios") return IOS_BILLING_ENABLED && !!bridge();
    return false;
  }

  function bridge() {
    return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytBilling;
  }

  function loadCache() {
    if (_state) return _state;
    try { _state = JSON.parse(localStorage.getItem(CACHE_KEY) || "null"); }
    catch (e) { _state = null; }
    return _state;
  }

  function saveCache(premium, source) {
    _state = { premium: !!premium, source: source || "play", checkedAt: Date.now() };
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(_state)); }
    catch (e) { /* storage full — entitlement is re-queried next launch anyway */ }
    try {
      window.dispatchEvent(new CustomEvent("ignyt:entitlement-changed", { detail: _state }));
    } catch (e) { /* a listener throwing must not break billing */ }
  }

  function grandfathered() {
    if (!GRANDFATHER_BEFORE) return false;
    try {
      var account = JSON.parse(localStorage.getItem("hx_auth_account") || "null");
      if (!account || !account.signedInAt) return false;
      return account.signedInAt < Date.parse(GRANDFATHER_BEFORE);
    } catch (e) { return false; }
  }

  /**
   * Is this user premium right now?
   *
   * Reads the cached entitlement, which refresh() keeps current. Synchronous on purpose:
   * render() calls this on every paint and cannot await anything.
   */
  function isPremium() {
    if (!paywallApplies()) return true;
    if (grandfathered()) return true;
    var cached = loadCache();
    if (!cached || !cached.premium) return false;
    // A confirmed purchase survives a long offline stretch, but not forever — otherwise a
    // cancelled subscription would keep working on a device that never reconnects.
    return (Date.now() - cached.checkedAt) < GRACE_DAYS * 86400000;
  }

  /** The one question the rest of the app asks. */
  function has(feature) {
    if (!PREMIUM_FEATURES[feature]) return true;   // not a gated feature
    return isPremium();
  }

  function label(feature) {
    return PREMIUM_FEATURES[feature] || feature;
  }

  /**
   * Re-query Play for the real entitlement. Called at launch and after a purchase.
   * Never throws and never downgrades a user because the network failed — only Play
   * answering "no active purchase" clears premium.
   */
  /* THE RECEIPT GOES TO THE SERVER, and this is the only reason the plugin returns a token.
   *
   * Everything in this file is a CACHE for drawing the UI — has() answers instantly and
   * offline, which is right for deciding whether to render a lock icon and wrong as a
   * security boundary, because a modified app can simply return true. The backend cannot take
   * this file's word for anything, so it gets the purchase token and asks Google itself.
   *
   * Deliberately silent and deliberately not awaited. A failure here means the server keeps
   * whatever it last verified — which is the safe direction — and the user is not shown an
   * error about a background reconciliation they did not ask for. */
  async function syncReceipt(purchaseToken) {
    if (!purchaseToken) return;                       // nothing bought, nothing to verify
    var base = (window.IgnytConfig && IgnytConfig.apiBase && IgnytConfig.apiBase()) || "";
    if (!base) return;
    try {
      var headers = { "Content-Type": "application/json" };
      var tok = window.IgnytAuth && IgnytAuth.getIdToken ? await IgnytAuth.getIdToken() : null;
      if (!tok) return;                               // signed out: nothing to attach it to
      headers.Authorization = "Bearer " + tok;
      await fetch(base + "/v1/billing/verify", {
        method: "POST", headers: headers,
        body: JSON.stringify({ purchaseToken: String(purchaseToken) })
      });
    } catch (e) { /* offline or backend down — the server keeps its last verified answer */ }
  }

  async function refresh() {
    if (!paywallApplies()) return true;
    var plugin = bridge();
    if (!plugin || typeof plugin.getEntitlement !== "function") return isPremium();
    try {
      var result = await plugin.getEntitlement({ productId: PRODUCT_ID });
      if (!result || result.success !== true || !result.data) return isPremium();
      saveCache(result.data.entitled === true, "play");
      // Hand the receipt to the backend so IT can decide too. Fire-and-forget on purpose:
      // this cache drives what the UI draws and must not wait on a network call, while the
      // server's copy is what actually gates anything expensive.
      syncReceipt(result.data.purchaseToken);
      return result.data.entitled === true;
    } catch (e) {
      return isPremium();   // transient failure keeps whatever was last confirmed
    }
  }

  /** The plans to show on the paywall, priced by Play rather than by this app. */
  async function getPlans() {
    var plugin = bridge();
    if (!plugin || typeof plugin.getProducts !== "function") {
      return { success: false, error: "Billing is not available on this device." };
    }
    try {
      return await plugin.getProducts({ productId: PRODUCT_ID });
    } catch (e) {
      return { success: false, error: "Could not load plans: " + (e && e.message ? e.message : String(e)) };
    }
  }

  /** Launch Play's purchase sheet. Google owns the trial, the charge and the cancellation. */
  async function purchase(basePlanId, offerToken) {
    var plugin = bridge();
    if (!plugin || typeof plugin.purchase !== "function") {
      return { success: false, error: "Billing is not available on this device." };
    }
    try {
      var result = await plugin.purchase({
        productId: PRODUCT_ID, basePlanId: basePlanId, offerToken: offerToken || null
      });
      if (result && result.success) {
        // Verify with the backend from the purchase result directly, rather than relying on
        // refresh() to re-query — this is the moment the user paid, and the sooner the server
        // knows, the sooner Pro works on their other devices.
        if (result.data && result.data.purchaseToken) syncReceipt(result.data.purchaseToken);
        await refresh();
      }
      return result;
    } catch (e) {
      return { success: false, error: "Purchase failed: " + (e && e.message ? e.message : String(e)) };
    }
  }

  return {
    FEATURES: PREMIUM_FEATURES,
    PRODUCT_ID: PRODUCT_ID,
    paywallApplies: paywallApplies,
    isPremium: isPremium,
    has: has,
    label: label,
    refresh: refresh,
    getPlans: getPlans,
    purchase: purchase,
    /** Test seam: force a state without going through Play. Never called by the app. */
    _setForTesting: function (premium) { saveCache(premium, "test"); }
  };
})();
