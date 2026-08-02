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

  /* Free tier keeps everything the user creates and everything they log. What is gated is
     new capability, never access to their own data — an app that holds someone's workout
     history hostage earns the review it gets, and Play takes a dim view of it too. */
  var PREMIUM_FEATURES = {
    coach:      "AI Coach",
    diet:       "Diet Plans",
    health:     "Health Dashboard",
    insights:   "Insights",
    photos:     "Progress Photos",
    sync:       "Cloud Sync & Backup",
    muscles:    "Muscle Distribution",
    fasting:    "Fasting Tracker",
    supplements:"Supplement Tracker",
    export:     "Data Export"
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

  /** The paywall exists on Android and nowhere else, for now. */
  function paywallApplies() {
    return platform() === "android";
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
  async function refresh() {
    if (!paywallApplies()) return true;
    var plugin = bridge();
    if (!plugin || typeof plugin.getEntitlement !== "function") return isPremium();
    try {
      var result = await plugin.getEntitlement({ productId: PRODUCT_ID });
      if (!result || result.success !== true || !result.data) return isPremium();
      saveCache(result.data.entitled === true, "play");
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
      if (result && result.success) await refresh();
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
