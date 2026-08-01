/* =========================================================
   MUSCLE MAP — which muscles a session actually worked, and a body diagram of it.

   Counting follows what the exercise library already records rather than inventing a
   model: the primary muscle takes a full set, each secondary takes half. That halving is
   the whole reason the figures come out as 1.5 or 2.5 — a set of lat pulldowns is one set
   of lats and half a set each of biceps, forearms and upper back, because that is what the
   movement does. Nothing here is a guess about training science; it is arithmetic over the
   primaryMuscle / secondaryMuscles fields that were already in the library.

   Only completed working sets count. A set you have not ticked has not happened, and a
   warmup is deliberately excluded by the same isCountingSet() rule the volume totals use,
   so this chart and the volume figure above it can never disagree about what a set is.

   The diagram is drawn, not photographed. The reference for this feature used rendered 3D
   anatomy, which is a licensed asset; this is an SVG built from simple regions keyed to the
   library's own muscle names. It scales, it themes, it costs no network request, and every
   region is addressable by name — so adding a muscle is adding a path, not re-rendering art.
========================================================= */

const IgnytMuscleMap = (() => {

  /** Secondary muscles are worth half a set each. */
  const SECONDARY_WEIGHT = 0.5;

  /* Names used by the library's secondaryMuscles that are not in BODY_MUSCLES, mapped onto
     the regions the diagram actually draws. Without this "Core" and "Upper Back" would count
     correctly in the table and highlight nothing on the body. */
  const REGION_ALIASES = {
    "Core": "Abdominals",
    "Abs": "Abdominals",
    "Upper Back": "Traps",
    "Lower Back": "Lats",
    "Rear Delts": "Shoulders",
    "Obliques": "Abdominals",
    "Rhomboids": "Traps",
    "Erector Spinae": "Lats"
  };

  /* Two different things, previously conflated in one set.
   *
   *  NOT_DRAWN is a real muscle group with no single region on the diagram — a burpee works
   *  the whole body, a treadmill run is cardio. These still belong in the table: the user did
   *  the work and the number is true.
   *
   *  UNKNOWN is the absence of data — what getMuscle() returns for an exercise the library
   *  has no record of. That is the only thing worth reporting as unattributed.
   *
   *  Lumping them together meant the rebuilt library's 47 Full Body exercises were each
   *  reported as "a completed set with no muscle data", which is the opposite of true. */
  const NOT_DRAWN = new Set(["Cardio", "Mobility", "Full Body"]);
  const UNKNOWN   = new Set(["Other"]);

  /**
   * Per-muscle completed-set counts for a list of session exercises.
   *
   * @param {Array} exercises session.exercises, each with {name, sets:[{done,type}]}
   * @returns {Object} muscle name -> set count (may be fractional)
   */
  function countsFor(exercises) {
    const counts = Object.create(null);
    const bump = (muscle, by) => {
      if (!muscle) return;
      counts[muscle] = (counts[muscle] || 0) + by;
    };

    (exercises || []).forEach(ex => {
      if (!ex || !ex.name) return;

      // Completed working sets only — the same rule the volume total uses.
      const n = (ex.sets || []).filter(s =>
        s && s.done && (typeof isCountingSet === "function" ? isCountingSet(s) : true)
      ).length;
      if (!n) return;

      const detail = (typeof EXERCISE_DETAILS !== "undefined") ? EXERCISE_DETAILS[ex.name] : null;

      if (detail && detail.primaryMuscle) {
        bump(detail.primaryMuscle, n);
        (detail.secondaryMuscles || []).forEach(m => bump(m, n * SECONDARY_WEIGHT));
      } else if (typeof getMuscle === "function") {
        // Library entries without a details record still carry a primary muscle. Half a
        // record is better than none: the row is real, it just has no secondaries.
        bump(getMuscle(ex.name), n);
      }
    });

    return counts;
  }

  /** Table rows: named muscles only, heaviest first.
   *
   *  "Other" is excluded. It is what an exercise the library has no muscle data for resolves
   *  to — a custom movement, almost always — and a row reading "Other" names nothing and
   *  highlights nothing, so it is a line of table that cannot be acted on. It is not dropped
   *  silently either: unattributed() reports the count so the sheet can say those sets exist
   *  but could not be placed. */
  function rowsFor(counts) {
    return Object.keys(counts)
      .filter(m => counts[m] > 0 && !UNKNOWN.has(m))
      .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
      .map(m => ({ muscle: m, sets: counts[m] }));
  }

  /** Sets that landed on no named muscle — exercises with no library entry. */
  function unattributed(counts) {
    return [...UNKNOWN].reduce((n, m) => n + (counts[m] || 0), 0);
  }

  /** Counts folded onto the regions the diagram can draw. */
  function regionCounts(counts) {
    const regions = Object.create(null);
    Object.keys(counts).forEach(m => {
      if (NOT_DRAWN.has(m) || UNKNOWN.has(m)) return;
      const region = REGION_ALIASES[m] || m;
      regions[region] = (regions[region] || 0) + counts[m];
    });
    return regions;
  }

  /* ---- the diagram ----
     Two 120x300 figures. Regions are plain paths so a muscle can be added without touching
     anything else. Left/right pairs share a data-muscle value: the body is symmetrical and
     the library does not record sides. */

  const FRONT = [
    ["Traps",      "M46 40 L60 34 L74 40 L68 48 L52 48 Z"],
    ["Shoulders",  "M38 48 Q30 52 29 66 Q37 70 43 60 Z M82 48 Q90 52 91 66 Q83 70 77 60 Z"],
    ["Chest",      "M45 50 Q60 46 75 50 L74 70 Q60 76 46 70 Z"],
    ["Biceps",     "M30 68 Q27 82 30 94 L38 92 Q39 78 37 66 Z M90 68 Q93 82 90 94 L82 92 Q81 78 83 66 Z"],
    ["Forearms",   "M29 96 Q26 112 27 126 L35 125 Q37 110 37 95 Z M91 96 Q94 112 93 126 L85 125 Q83 110 83 95 Z"],
    ["Abdominals", "M48 73 L72 73 L71 112 Q60 118 49 112 Z"],
    ["Quadriceps", "M46 120 Q42 150 45 180 L57 178 Q59 148 57 120 Z M74 120 Q78 150 75 180 L63 178 Q61 148 63 120 Z"],
    ["Adductors",  "M57 120 Q60 140 63 120 L63 156 Q60 162 57 156 Z"],
    ["Calves",     "M47 190 Q44 212 48 232 L56 230 Q58 210 56 189 Z M73 190 Q76 212 72 232 L64 230 Q62 210 64 189 Z"]
  ];

  const BACK = [
    ["Traps",      "M44 38 L60 32 L76 38 L72 62 Q60 68 48 62 Z"],
    ["Shoulders",  "M38 48 Q30 52 29 66 Q37 70 43 60 Z M82 48 Q90 52 91 66 Q83 70 77 60 Z"],
    ["Lats",       "M42 62 Q36 84 44 104 L58 100 L58 64 Z M78 62 Q84 84 76 104 L62 100 L62 64 Z"],
    ["Triceps",    "M30 68 Q27 82 30 94 L38 92 Q39 78 37 66 Z M90 68 Q93 82 90 94 L82 92 Q81 78 83 66 Z"],
    ["Forearms",   "M29 96 Q26 112 27 126 L35 125 Q37 110 37 95 Z M91 96 Q94 112 93 126 L85 125 Q83 110 83 95 Z"],
    ["Glutes",     "M46 112 Q60 106 74 112 Q76 132 60 136 Q44 132 46 112 Z"],
    ["Hamstrings", "M47 138 Q44 160 48 184 L57 182 Q59 158 57 138 Z M73 138 Q76 160 72 184 L63 182 Q61 158 63 138 Z"],
    ["Abductors",  "M43 116 Q39 134 44 150 L49 148 Q46 130 48 116 Z M77 116 Q81 134 76 150 L71 148 Q74 130 72 116 Z"],
    ["Calves",     "M47 190 Q44 212 48 232 L56 230 Q58 210 56 189 Z M73 190 Q76 212 72 232 L64 230 Q62 210 64 189 Z"]
  ];

  /* Body outline, drawn once behind the regions so an unworked figure still reads as a body
     rather than as floating shapes. */
  const SILHOUETTE =
    "M60 18 Q68 18 68 28 Q68 36 60 38 Q52 36 52 28 Q52 18 60 18 Z" +
    "M60 38 Q78 42 84 56 Q92 62 94 96 Q96 120 92 130 L84 128 Q86 104 82 88 " +
    "L80 120 Q78 150 76 184 Q74 214 72 236 L62 236 Q60 200 60 170 " +
    "Q60 200 58 236 L48 236 Q46 214 44 184 Q42 150 40 120 L38 88 " +
    "Q34 104 36 128 L28 130 Q24 120 26 96 Q28 62 36 56 Q42 42 60 38 Z";

  /**
   * One figure.
   * @param {Array} regions [name, path] pairs
   * @param {Object} counts region name -> sets
   * @param {number} max the busiest region's count, for relative shading
   */
  function figure(regions, counts, max, label) {
    const shapes = regions.map(([muscle, d]) => {
      const v = counts[muscle] || 0;
      // Relative, not absolute: the busiest muscle of THIS session is full strength, so the
      // diagram reads the same whether the session was three sets or thirty.
      const intensity = max > 0 ? Math.min(1, v / max) : 0;
      const opacity = v > 0 ? (0.28 + intensity * 0.72).toFixed(2) : 0;
      return `<path d="${d}" fill="var(--mm-on)" fill-opacity="${opacity}"
        data-muscle="${muscle}"><title>${muscle}${v > 0 ? `: ${fmt(v)} sets` : ""}</title></path>`;
    }).join("");

    return `<svg viewBox="0 0 120 250" class="mm-figure" role="img" aria-label="${label}">
      <path d="${SILHOUETTE}" fill="var(--mm-off)" stroke="var(--mm-line)" stroke-width="0.8"/>
      ${shapes}
    </svg>`;
  }

  /** Trailing ".0" is noise; ".5" is the point. */
  function fmt(n) {
    return Number.isInteger(n) ? String(n) : n.toFixed(1);
  }

  /** Both figures, front then back. */
  function bodyHtml(counts) {
    const regions = regionCounts(counts);
    const max = Math.max(0, ...Object.values(regions));
    return `<div class="mm-bodies">
      ${figure(FRONT, regions, max, "Front view of worked muscles")}
      ${figure(BACK, regions, max, "Back view of worked muscles")}
    </div>`;
  }

  return { countsFor, rowsFor, unattributed, regionCounts, bodyHtml, fmt, SECONDARY_WEIGHT };
})();

window.IgnytMuscleMap = IgnytMuscleMap;
