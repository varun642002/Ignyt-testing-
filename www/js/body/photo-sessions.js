/* =========================================================
   PROGRESS SESSIONS — grouping body photos into dated check-ins

   A "session" is every photo taken on one date: front, side, back and whatever else, treated
   as one record with one weight and one set of notes. That is how people actually take
   progress photos — you stand in front of a mirror once and shoot several angles — and it is
   what makes two dates comparable.

   SESSIONS ARE DERIVED, NOT STORED.
   Photos already carry a `date`. Grouping on it gives every session a stable identity for free,
   works retroactively for every photo already in IndexedDB, and needs no migration — nothing
   has to be rewritten, so nothing can be lost rewriting it. A stored session id would add a
   second source of truth for a fact the date already answers, and the first bug would be a
   photo whose date and session disagreed.

   The session's id IS its date. Two photos on 2026-07-29 are one session, always.

   MEASUREMENTS BELONG TO THE SESSION, NOT THE PHOTO.
   Weight, body fat, waist and chest are stored per photo because that is the existing schema,
   but they describe the person on that day, not that angle. Reading takes the first non-null
   across the session's photos and writing fans out to all of them, so the session behaves as
   one record regardless of which photo the value was entered against.
========================================================= */
(function () {
  "use strict";

  var VIEW_ORDER = ["Front Relaxed", "Front Flexed", "Side Left", "Side Right",
                    "Back Relaxed", "Back Flexed", "Transformation", "Competition", "Custom", "Other"];

  /** Sort key so a session's photos always read front → side → back rather than upload order. */
  function viewRank(category) {
    var i = VIEW_ORDER.indexOf(category);
    return i === -1 ? VIEW_ORDER.length : i;
  }

  function firstNonNull(photos, key) {
    for (var i = 0; i < photos.length; i++) {
      if (photos[i][key] != null && photos[i][key] !== "") return photos[i][key];
    }
    return null;
  }

  /**
   * Groups a flat photo list into sessions, newest first.
   * @param {Array} photos  records from IgnytBodyPhotosDB.getAllMeta()
   */
  function sessions(photos) {
    var byDate = {};
    (photos || []).forEach(function (p) {
      if (!p || !p.date) return;
      (byDate[p.date] = byDate[p.date] || []).push(p);
    });

    return Object.keys(byDate).sort().reverse().map(function (date) {
      var list = byDate[date].slice().sort(function (a, b) {
        var r = viewRank(a.category) - viewRank(b.category);
        return r !== 0 ? r : (a.createdAt || 0) - (b.createdAt || 0);
      });
      return {
        id: date,                 // the date IS the identity
        date: date,
        photos: list,
        count: list.length,
        // Earliest capture time in the session — "when did you take these".
        takenAt: Math.min.apply(null, list.map(function (p) { return p.createdAt || 0; })),
        weight: firstNonNull(list, "weight"),
        bodyfat: firstNonNull(list, "bodyfat"),
        waist: firstNonNull(list, "waist"),
        chest: firstNonNull(list, "chest"),
        note: firstNonNull(list, "note") || "",
        views: list.map(function (p) { return p.category; }),
        milestone: list.some(function (p) { return p.milestone; })
      };
    });
  }

  function byId(photos, date) {
    return sessions(photos).filter(function (s) { return s.id === date; })[0] || null;
  }

  // ---------------------------------------------------------------- filters

  /**
   * @param {Object} f  { year, month, weightMin, weightMax, bodyfatMin, bodyfatMax }
   *   month is "YYYY-MM". Any absent field is simply not applied — a filter nobody set must
   *   never silently exclude sessions.
   */
  function filter(list, f) {
    f = f || {};
    return (list || []).filter(function (s) {
      if (f.year && s.date.slice(0, 4) !== String(f.year)) return false;
      if (f.month && s.date.slice(0, 7) !== f.month) return false;
      // A weight filter can only judge sessions that HAVE a weight. Excluding the rest is
      // correct — "between 90 and 95 kg" is not a claim you can make about an unknown.
      if (f.weightMin != null || f.weightMax != null) {
        if (s.weight == null) return false;
        if (f.weightMin != null && s.weight < f.weightMin) return false;
        if (f.weightMax != null && s.weight > f.weightMax) return false;
      }
      if (f.bodyfatMin != null || f.bodyfatMax != null) {
        if (s.bodyfat == null) return false;
        if (f.bodyfatMin != null && s.bodyfat < f.bodyfatMin) return false;
        if (f.bodyfatMax != null && s.bodyfat > f.bodyfatMax) return false;
      }
      return true;
    });
  }

  /** Years and months that actually contain sessions, for the filter chips. Offering a month
   *  with nothing in it is offering a dead end. */
  function periods(list) {
    var years = {}, months = {};
    (list || []).forEach(function (s) {
      years[s.date.slice(0, 4)] = true;
      months[s.date.slice(0, 7)] = true;
    });
    return {
      years: Object.keys(years).sort().reverse(),
      months: Object.keys(months).sort().reverse()
    };
  }

  // ---------------------------------------------------------------- compare

  /** The presets the brief names, resolved against what actually exists. Each returns a
   *  session id or null — a preset with nothing to point at is offered as disabled rather
   *  than silently comparing against the wrong date. */
  function comparePresets(list) {
    if (!list || !list.length) return [];
    var latest = list[0];
    var DAY = 86400000;
    var t = function (s) { return new Date(s.date + "T12:00:00").getTime(); };
    var now = t(latest);

    /** The session closest to `target` that is not the latest one. */
    function nearest(target) {
      var best = null, bestGap = Infinity;
      list.slice(1).forEach(function (s) {
        var gap = Math.abs(t(s) - target);
        if (gap < bestGap) { bestGap = gap; best = s; }
      });
      return best;
    }

    var out = [
      { key: "week",  label: "vs Last week",  other: nearest(now - 7 * DAY) },
      { key: "month", label: "vs Last month", other: nearest(now - 30 * DAY) },
      { key: "start", label: "vs Starting date", other: list[list.length - 1] }
    ];
    // "vs start" is meaningless when the start IS the latest session.
    return out.filter(function (o) { return o.other && o.other.id !== latest.id; })
              .map(function (o) { return Object.assign({}, o, { latest: latest }); });
  }

  /** The difference between two sessions, for the compare header. Null where either side has
   *  no reading — a change cannot be computed from a missing number. */
  function delta(a, b) {
    var d = function (key) {
      if (!a || !b || a[key] == null || b[key] == null) return null;
      return Math.round((b[key] - a[key]) * 10) / 10;
    };
    var days = (a && b)
      ? Math.round((new Date(b.date + "T12:00:00") - new Date(a.date + "T12:00:00")) / 86400000)
      : null;
    return { weight: d("weight"), bodyfat: d("bodyfat"), waist: d("waist"), chest: d("chest"), days: days };
  }

  window.IgnytPhotoSessions = {
    VIEW_ORDER: VIEW_ORDER,
    sessions: sessions, byId: byId, filter: filter, periods: periods,
    comparePresets: comparePresets, delta: delta
  };
})();
