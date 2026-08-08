/* =========================================================
   MONTHLY STRENGTH REPORT + SHAREABLE CARDS

   Assembles a month of real training into one report, draws it to a canvas, and hands the
   PNG to the share pipeline the app already has (IgnytShare.shareImage / saveImage, with the
   browser <a download> path as the fallback — see downloadFile() in app.js for why the blob
   trick alone is not enough inside the Android WebView).

   EVERY FIGURE IS MEASURED
   Workouts, hours, volume, PRs, badges, active days, weight change and the average IGNYT
   score all come from logs. There is no "estimated muscle gained", no percentile, and no
   projection. A report is a record; the moment it contains a guess, none of it can be
   trusted.

   COMPARISONS ARE OMITTED, NOT ZEROED
   A month with no previous month to compare against shows no comparison. "+0% vs last month"
   is a false statement about a month that did not exist, and "-100%" to someone returning
   from injury is a punishment for coming back.

   TWO CARDS
   The report card is the month in full. The progress card is the short version — score,
   level, streak and lifetime totals — for when someone wants to post a number rather than a
   spreadsheet.
========================================================= */

window.IgnytReport = (function () {
  "use strict";

  var W = 1080, H = 1350;

  /* The workout share cards already define a palette; matching it means a user's posts look
     like they came from the same app.
     Read as a bare identifier, not off window: app.js declares SHARE_THEMES with const, and a
     top-level const lives in the script's lexical scope and never becomes a window property.
     window.SHARE_THEMES is undefined even though SHARE_THEMES resolves fine. */
  var FALLBACK_THEME = {
    steel: { label: "Steel", bg0: "#0E1B26", bg1: "#121216", text: "#F2F1ED", muted: "#8FA7B5", accent: "#2563EB" }
  };
  function theme(key) {
    var themes = FALLBACK_THEME;
    try { if (typeof SHARE_THEMES !== "undefined" && SHARE_THEMES) themes = SHARE_THEMES; }
    catch (e) { /* not loaded yet — the fallback is the same dark card */ }
    return themes[key] || themes.steel || themes[Object.keys(themes)[0]];
  }

  function font(weight, px) {
    return weight + " " + px + "px -apple-system, Roboto, 'Segoe UI', sans-serif";
  }

  function clip(ctx, text, maxWidth) {
    if (typeof window.clipText === "function") return window.clipText(ctx, text, maxWidth);
    if (ctx.measureText(text).width <= maxWidth) return text;
    var s = String(text);
    while (s.length > 1 && ctx.measureText(s + "…").width > maxWidth) s = s.slice(0, -1);
    return s + "…";
  }

  function rounded(ctx, x, y, w, h, r) {
    if (typeof window.roundRect === "function") return window.roundRect(ctx, x, y, w, h, r);
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function displayName() {
    if (typeof window.workoutShareName === "function") return window.workoutShareName();
    var auth = window.IgnytAuth && IgnytAuth.getAccount();
    return (window.state && state.profile && state.profile.name) || (auth && auth.displayName) || "";
  }

  /* ---- the data ------------------------------------------------------------------------ */

  /**
   * The month, assembled. Returns null when there is nothing to report — an empty report is
   * worse than no button.
   */
  function data(s) {
    if (!s) return null;
    var month = window.IgnytReview ? IgnytReview.month(s) : null;
    if (!month || (!month.workouts && !month.activeDays)) return null;

    var strength = window.IgnytStrength || null;
    var compare = strength ? strength.monthCompare(s) : null;
    var lifetime = strength ? strength.lifetime(s) : null;
    var scoreNow = strength ? strength.score(s) : null;
    var band = (strength && scoreNow != null) ? strength.level(scoreNow) : null;

    /* Average IGNYT score across the days actually recorded in the last 30 — not across 30,
       which would quietly punish someone who installed the app three weeks ago. */
    var avgScore = null, scoredDays = 0;
    try {
      var hist = JSON.parse(localStorage.getItem("hx_score_history") || "{}") || {};
      var sum = 0, cur = new Date(); cur.setHours(0,0,0,0);
      for (var i = 0; i < 30; i++) {
        var k = cur.getFullYear() + "-" + String(cur.getMonth()+1).padStart(2,"0") + "-" + String(cur.getDate()).padStart(2,"0");
        if (hist[k] != null) { sum += hist[k]; scoredDays++; }
        cur.setDate(cur.getDate() - 1);
      }
      if (scoredDays) avgScore = Math.round(sum / scoredDays);
    } catch (e) { /* no history: the report simply omits the line */ }

    // Only a comparison with a month that actually had training in it means anything.
    var hasLastMonth = !!(compare && compare.lastMonth &&
      (compare.lastMonth.workouts > 0 || compare.lastMonth.volumeKg > 0));

    return {
      periodLabel: "Last 30 days",
      generatedAt: Date.now(),
      workouts: month.workouts,
      hours: Math.round(month.minutes / 60 * 10) / 10,
      volumeKg: month.volumeKg,
      activeDays: month.activeDays,
      consistencyPct: month.consistencyPct,
      prs: month.prs,
      badges: month.badges,
      weightChangeKg: month.weightChangeKg,
      strengthScore: scoreNow,
      strengthLevel: band ? band.name : null,
      strengthColor: band ? band.color : null,
      averageScore: avgScore,
      scoredDays: scoredDays,
      lifetime: lifetime,
      compare: hasLastMonth ? {
        volumeChangePct: compare.volumeChangePct,
        workoutChangePct: compare.workoutChangePct,
        prChange: compare.prChange,
        lastMonth: compare.lastMonth
      } : null,
      /* The month's heaviest session, by volume — a real day the user can remember, not an
         average of days that never happened. */
      bestSession: bestSessionOfMonth(s)
    };
  }

  function bestSessionOfMonth(s) {
    var cutoff = Date.now() - 30 * 86400000;
    var best = null;
    (s.workoutLog || []).forEach(function (w) {
      if (new Date(w.startedAt || w.date).getTime() < cutoff) return;
      if (!best || (w.volume || 0) > (best.volume || 0)) best = w;
    });
    if (!best || !(best.volume > 0)) return null;
    // Sessions store `date` as a full ISO string, so it is formatted here rather than shown raw.
    var when = new Date(best.startedAt || best.date);
    return {
      title: (typeof window.sessionTitle === "function" ? sessionTitle(best) : (best.title || "Workout")),
      volumeKg: Math.round(best.volume),
      date: isNaN(when) ? null : when.toLocaleDateString(undefined, { day: "numeric", month: "short" })
    };
  }

  /* ---- drawing ------------------------------------------------------------------------- */

  function header(ctx, t, title, sub) {
    var grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, t.bg0); grad.addColorStop(1, t.bg1);
    ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = "top";
    ctx.fillStyle = t.accent; ctx.font = font(900, 56);
    ctx.fillText("IGNYT", 72, 68);
    ctx.fillStyle = t.muted; ctx.font = font(800, 30);
    ctx.fillText(String(sub).toUpperCase(), 72, 140);
    ctx.fillStyle = t.text; ctx.font = font(900, 78);
    ctx.fillText(clip(ctx, title, W - 144), 72, 190);
  }

  function footer(ctx, t) {
    var name = displayName();
    ctx.fillStyle = t.muted; ctx.font = font(700, 30);
    var when = new Date().toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
    ctx.fillText((name ? name + " · " : "") + when, 72, H - 96);
  }

  /* The footer sits at a fixed height, so everything above it has a budget. FOOTER_TOP is the
     line no drawing may cross — the first version had none, and the report ran off the bottom
     with "Best session" printed through the footer. */
  var FOOTER_TOP = H - 120;

  /** A 2-column grid of big numbers. Returns the y directly below it. */
  function statGrid(ctx, t, items, top, rowH) {
    rowH = rowH || 150;
    var colW = (W - 144 - 36) / 2;
    items.forEach(function (it, i) {
      var x = 72 + (i % 2) * (colW + 36);
      var y = top + Math.floor(i / 2) * rowH;
      ctx.fillStyle = it.color || t.text; ctx.font = font(900, 76);
      ctx.fillText(clip(ctx, it.value, colW), x, y);
      ctx.fillStyle = t.muted; ctx.font = font(800, 29);
      ctx.fillText(String(it.label).toUpperCase(), x, y + 88);
    });
    return top + Math.ceil(items.length / 2) * rowH;
  }

  function pill(ctx, t, x, y, text, bg, fg) {
    ctx.font = font(800, 38);
    var w = ctx.measureText(text).width + 56;
    ctx.fillStyle = bg; rounded(ctx, x, y, w, 72, 36); ctx.fill();
    ctx.fillStyle = fg; ctx.fillText(text, x + 28, y + 17);
    return w;
  }

  /** The full monthly report. */
  function drawReport(canvas, s, themeKey) {
    var d = data(s);
    if (!d) return null;
    var t = theme(themeKey);
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    header(ctx, t, "Monthly Report", d.periodLabel);

    var y = statGrid(ctx, t, [
      { value: String(d.workouts), label: "workouts" },
      { value: d.hours + " h", label: "training time" },
      { value: Number(d.volumeKg).toLocaleString(), label: "kg lifted" },
      { value: d.activeDays + "/30", label: "active days" }
    ], 330);

    /* Everything from here down is optional and drawn in priority order. A section that will
       not fit above the footer is skipped rather than squeezed — a report that overlaps
       itself is unreadable, and the sections below are already ordered least-important-last. */
    function room(need) { return y + need <= FOOTER_TOP; }

    // Strength band, only if the module produced one.
    if (d.strengthLevel && room(140)) {
      ctx.fillStyle = t.muted; ctx.font = font(800, 30);
      ctx.fillText("STRENGTH LEVEL", 72, y + 6);
      var pw = pill(ctx, t, 72, y + 50, d.strengthLevel, d.strengthColor || t.accent, "#0E0E11");
      ctx.fillStyle = t.text; ctx.font = font(900, 46);
      ctx.fillText(String(d.strengthScore), 72 + pw + 28, y + 64);
      ctx.fillStyle = t.muted; ctx.font = font(700, 30);
      ctx.fillText("pts", 72 + pw + 28 + ctx.measureText(String(d.strengthScore)).width + 60, y + 78);
      y += 140;
    }

    // Comparison with last month — drawn only when there IS a last month.
    var rows = [];
    if (d.compare) {
      if (d.compare.volumeChangePct != null) rows.push(["Volume", d.compare.volumeChangePct + "%"]);
      if (d.compare.workoutChangePct != null) rows.push(["Workouts", d.compare.workoutChangePct + "%"]);
      rows.push(["Records", (d.compare.prChange > 0 ? "+" : "") + d.compare.prChange]);
    }
    if (rows.length && room(44 + rows.length * 54 + 22)) {
      ctx.fillStyle = t.muted; ctx.font = font(800, 29);
      ctx.fillText("VS PREVIOUS 30 DAYS", 72, y);
      rows.forEach(function (r, i) {
        var ry = y + 44 + i * 54;
        ctx.fillStyle = t.muted; ctx.font = font(700, 38);
        ctx.fillText(r[0], 72, ry);
        var up = String(r[1]).indexOf("-") !== 0 && String(r[1]) !== "0";
        ctx.fillStyle = up ? "#22C55E" : t.muted;
        ctx.font = font(900, 38);
        var txt = (String(r[1]).indexOf("-") !== 0 && String(r[1]).indexOf("+") !== 0 ? "+" : "") + r[1];
        ctx.fillText(txt, W - 72 - ctx.measureText(txt).width, ry);
      });
      y += 44 + rows.length * 54 + 22;
    }

    // The month's heaviest session — a real day, not an average.
    if (d.bestSession && room(142)) {
      ctx.fillStyle = t.muted; ctx.font = font(800, 29);
      ctx.fillText("BEST SESSION", 72, y);
      ctx.fillStyle = t.text; ctx.font = font(900, 46);
      ctx.fillText(clip(ctx, d.bestSession.title + (d.bestSession.date ? "  ·  " + d.bestSession.date : ""), W - 144), 72, y + 42);
      ctx.fillStyle = t.accent; ctx.font = font(800, 36);
      ctx.fillText(Number(d.bestSession.volumeKg).toLocaleString() + " kg", 72, y + 98);
      y += 142;
    }

    var tail = [];
    if (d.prs) tail.push(d.prs + " personal record" + (d.prs !== 1 ? "s" : ""));
    if (d.badges) tail.push(d.badges + " badge" + (d.badges !== 1 ? "s" : ""));
    if (d.averageScore != null) tail.push("avg score " + d.averageScore);
    if (d.weightChangeKg != null) tail.push((d.weightChangeKg > 0 ? "+" : "") + d.weightChangeKg + " kg");
    if (tail.length && room(44)) {
      ctx.fillStyle = t.muted; ctx.font = font(700, 34);
      ctx.fillText(clip(ctx, tail.join("  ·  "), W - 144), 72, y);
    }

    footer(ctx, t);
    return canvas;
  }

  /** The short version: one number, one level, one streak. */
  function drawProgressCard(canvas, s, themeKey) {
    var t = theme(themeKey);
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext("2d");

    var score = window.IgnytScore ? IgnytScore.today(s) : null;
    var stats = window.IgnytScore ? IgnytScore.stats(s) : null;
    var life = window.IgnytStrength ? IgnytStrength.lifetime(s) : null;
    if (!score && !life) return null;

    header(ctx, t, "Today", new Date().toLocaleDateString(undefined, { weekday: "long" }));

    if (score) {
      // The ring, drawn the same way the app draws it on Home.
      var cx = W / 2, cy = 580, r = 210;
      ctx.lineWidth = 40; ctx.lineCap = "round";
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
      var pct = Math.min(1, score.score / 160);
      if (pct > 0) {
        ctx.strokeStyle = score.level.color;
        ctx.beginPath();
        ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
        ctx.stroke();
      }
      ctx.textAlign = "center";
      ctx.fillStyle = score.level.color; ctx.font = font(900, 180);
      ctx.fillText(String(score.score), cx, cy - 96);
      ctx.fillStyle = t.muted; ctx.font = font(800, 34);
      ctx.fillText("IGNYT SCORE", cx, cy + 66);
      ctx.fillStyle = t.text; ctx.font = font(900, 58);
      ctx.fillText(clip(ctx, score.level.name, W - 144), cx, cy + 240);
      ctx.textAlign = "left";
    }

    var items = [];
    if (stats) {
      if (stats.streak) items.push({ value: String(stats.streak), label: "day streak" });
      if (stats.best) items.push({ value: String(stats.best), label: "best score" });
    }
    if (life) {
      items.push({ value: String(life.workouts), label: "workouts" });
      items.push({ value: Number(life.volumeKg).toLocaleString(), label: "kg lifted" });
    }
    /* Two rows of stats have to finish above the footer: at 150 per row that is 300, so the
       grid starts at 920 and the last label lands on 1158, clear of FOOTER_TOP. */
    statGrid(ctx, t, items.slice(0, 4), score ? 920 : 400);

    footer(ctx, t);
    return canvas;
  }

  /* ---- export -------------------------------------------------------------------------- */

  function toBase64(kind, s, themeKey) {
    var canvas = document.createElement("canvas");
    var drawn = kind === "progress" ? drawProgressCard(canvas, s, themeKey) : drawReport(canvas, s, themeKey);
    if (!drawn) return null;
    return canvas.toDataURL("image/png").split(",")[1];
  }

  function summaryText(s) {
    var d = data(s);
    if (!d) return "IGNYT";
    var bits = [
      "My last 30 days — IGNYT",
      d.workouts + " workout" + (d.workouts !== 1 ? "s" : "") +
        " · " + d.hours + " h · " + Number(d.volumeKg).toLocaleString() + " kg"
    ];
    if (d.prs) bits.push(d.prs + " personal record" + (d.prs !== 1 ? "s" : ""));
    if (d.strengthLevel) bits.push("Strength level: " + d.strengthLevel);
    return bits.join("\n");
  }

  function toast(msg, kind) {
    if (window.showToast) showToast(msg, kind || "success", window.render);
  }

  /**
   * Share the image. Native goes through the app's own IgnytShare plugin (the same one the
   * workout card uses); a browser falls back to navigator.share and then to a download,
   * because inside the Android WebView a bare <a download> silently does nothing.
   */
  async function share(kind, s, themeKey) {
    try {
      var base64 = toBase64(kind, s, themeKey);
      if (!base64) { toast("Not enough logged yet to build a report.", "error"); return false; }
      var fileName = "ignyt-" + (kind === "progress" ? "progress" : "report") + "-" +
                     (typeof dayKey === "function" ? dayKey() : new Date().toISOString().slice(0, 10)) + ".png";
      var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytShare;
      if (plugin) {
        var res = await plugin.shareImage({ base64: base64, fileName: fileName, text: summaryText(s) });
        if (!res || !res.success) toast("Sharing isn't available on this device.", "error");
        return !!(res && res.success);
      }
      if (navigator.share) { await navigator.share({ title: "IGNYT", text: summaryText(s) }); return true; }
      return save(kind, s, themeKey);
    } catch (e) {
      // Closing the OS share sheet is a choice, not a failure.
      var m = String(e && e.message || e).toLowerCase();
      if (m.indexOf("cancel") !== -1 || m.indexOf("abort") !== -1) return false;
      toast("Couldn't share on this device.", "error");
      return false;
    }
  }

  async function save(kind, s, themeKey) {
    try {
      var base64 = toBase64(kind, s, themeKey);
      if (!base64) { toast("Not enough logged yet to build a report.", "error"); return false; }
      var fileName = "ignyt-" + (kind === "progress" ? "progress" : "report") + "-" +
                     (typeof dayKey === "function" ? dayKey() : new Date().toISOString().slice(0, 10)) + ".png";
      var plugin = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.IgnytShare;
      if (plugin) {
        var res = await plugin.saveImage({ base64: base64, fileName: fileName });
        if (res && res.success) toast("Saved to " + ((res.data && res.data.location) || "your device") + ".");
        else toast("Couldn't save the image on this device.", "error");
        return !!(res && res.success);
      }
      var a = document.createElement("a");
      a.href = "data:image/png;base64," + base64;
      a.download = fileName;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      return true;
    } catch (e) {
      toast("Couldn't save the image on this device.", "error");
      return false;
    }
  }

  return {
    data: data, summaryText: summaryText,
    drawReport: drawReport, drawProgressCard: drawProgressCard,
    toBase64: toBase64, share: share, save: save
  };
})();
