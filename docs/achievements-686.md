# The 686-medal set — what shipped and what is still missing a data source

`ignyt-medals-686.html` designed 686 medals. It is a strict superset of the earlier 186 set —
all 186 ids survive in it — so this replaced rather than reopened that work.

**606 of the 686 are now in `ACHIEVEMENT_DEFS`.** This file records the 80 that are not, and
what each one needs before it can be.

## Why most of the 500 new ones were cheap

They are new **rungs on ladders that already existed**. `total_workouts` at 150/200/250/…/5000
is the same `state.workoutLog.length` the original `workouts_50` read. 435 of the outstanding
516 mapped onto a metric the app already logs, so they cost a template and a threshold rather
than a feature:

```
total_workouts   -> (state.workoutLog||[]).length >= {goal}
squat_1rm_kg     -> bestLiftKg(ACH_SQUAT_RE)      >= {goal}
total_row_m      -> totalRowMetres()              >= {goal}
```

The 81 that did not map needed a **new source**, and 22 new helpers were written for the ones
whose source already existed but had never been read: per-movement volume, bike distance,
cardio minutes and calories, race stations and transitions, weekend sessions, comeback counts,
food-log streaks, water litres and streaks, weight lost/gained, stretch minutes, meditation
sessions, distinct calendar months.

## The 80 not implemented, grouped by what they need

| Needs | Medals | Note |
|---|---|---|
| ~~A sleep log~~ | ~~16~~ | **Done — and it needed no feature at all.** See "The sleep log was already there" below. |
| **A festival/holiday calendar** | 11 | 10 `festival_*` (Diwali, Holi, Pongal, Onam, Navratri, Ganesh, Eid, Christmas, Republic, Independence) plus `holiday_workout`. Four are fixed-date; the rest are lunar and move yearly, so this needs a multi-year date table, not a formula. |
| **Program history** | 10 | `programs_started`, `programs_completed`, `program_types`. Only the CURRENT plan is stored (`state.plan`). Needs an `hx_completed_programs` list written when a plan hits 100%. |
| **Cardio elevation** | 6 | Cardio sets carry `distanceKm`, `durationSec`, `calories`, `heartRate` — no elevation. Needs a field or a Health Connect read. |
| **An app-open log** | 6 | `app_streak_days`. One `dayKey()` appended at boot would do it — but note a badge for *opening the app* rewards launching it, not training. |
| **Barcode scanning** | 5 | Removed from the food log at your request. These cannot come back without that feature coming back. |
| **A rest-day log** | 5 | A day off is an absence of data, not an entry. Needs an explicit "rest day" action. |
| **A cuisine tag** | 5 | `indian_dishes`. The catalogue *does* have the categories (`South Indian dishes`, `sambar`, `rasam`, `chaat`, `biryani`, `gravy_curry`, `mandhi` — ~760 foods), and `lookupFood(id)` is synchronous, so this is buildable: resolve the logged `foodId` back to its category at check time. |
| **Share tracking** | 5 | `workouts_shared`. Sharing happens but is never recorded. |
| **Deload marking** | 4 | Nothing marks a week as a deload. |
| **A per-year birthday record** | 4 | `birthdays_trained` at 2/3/5 needs to know *which* birthdays. The one-off "Birthday Beast" is implemented. |
| **A race division field** | 2 | `hyrox_doubles`, `hyrox_pro`. `state.raceLog` entries are `{id, date, totalMs, segments}` — adding `division` to the race start is small and unlocks both. |
| **A join order from the server** | 1 | `founding_member`. |
| **A 100-day challenge feature** | 1 | `hundred_challenge`. |

Six of these — sleep, festivals, program history, rest days, cuisine, race division — are
**small, self-contained features** that would unlock 49 medals between them. That is the
highest-value work left in this area.

## One naming scheme (2026-08-16)

The original 82 achievements used underscore ids (`first_workout`) from before the designed
medal set existed. All 82 now ship under their id from that set (`first-workout`), so the whole
collection speaks one scheme and nothing is left over from the old one.

**This required a migration, and shipping it without one would have been destructive.**
`state.achievements` is keyed by id, so a bare rename means every user loses every badge they
have earned: the old records stop matching any def — becoming ghosts that still inflate the
"X of Y earned" count, since that reads `state.achievements.length` — and the same medals
re-unlock under new ids stamped with today's date instead of the day they were actually earned.

`ACHIEVEMENT_ID_MIGRATION` maps all 82. It runs inside `runMigrations()` and **mutates
`state.achievements` in memory before writing it**, which is the only order that works: the
migration runs at the bottom of `app.js`, long after `const state = {...}` has read storage, so
rewriting localStorage instead would be flattened by the first `persist()` putting the stale
in-memory copy back on top. That trap is documented at the top of the file by the day-key
migration, which hit it.

`volume_1m` is the one that is not a straight rename — the designed set already ships that medal
as `lifetime-volume`, so the legacy def was **removed** rather than renamed onto it (which would
have produced two defs with the same id), and the map points its earners at the survivor.
Where a rename collides with a badge already held, the **earlier** `achievedAt` wins.

Verified in the browser against a pre-rename profile: 5 stored records → 4, every id on the new
scheme, every date preserved at its original February value including the collision, zero
ghosts, and idempotent across reloads.

## The sleep log was already there

This file previously said "no sleep log exists". That was wrong, and the way it was wrong is
worth recording: `grep sleepLog` returns nothing and `sleep_hrs` looks like a legacy CSV column,
so both signals pointed at a feature that had never been built.

The field is `sleep`, and it has been shipping the whole time:

```
render   renderProgressBody -> fieldSm("b-sleep","Sleep (hrs)","7.5")   in a "Recovery" section
save     entry = { ..., sleep: val("b-sleep"), hrv: val("b-hrv") }      alongside weight
export   e.sleep written under the legacy `sleep_hrs` column
import   colIdx.sleep = header.indexOf("sleep_hrs")
```

What it never had was a **reader**. All 16 medals needed was `sleepLogCount()`,
`totalSleepHours()` and `sleepStreakDays()`. No new logging, no new form field, no migration.

Sleep is now also **chartable** — one line in `BODY_CHART_METRICS`, because `bodyMetricSeries()`
reads `e[metric]` generically. Data collected since the measurements CSV was written had never
been viewable. **HRV sits in exactly the same position and is one line away.**

### Two traps this opened, both closed

**Sleep must stay OUT of `BODY_MEASUREMENT_KEYS`.** The obvious way to "add a sleep field" is to
put it in `BODY_MEASUREMENT_GROUPS`, which is where the entry form, CSV and chart switcher all
read from. Doing that would have broken `measurementEntryCount()`, which counts *any* key in
that list as a tape measurement — so logging sleep nightly would have earned "Log measurements
100 times" without the user ever picking up a tape. The existing design already had sleep
outside that list, which turned out to be correct rather than an oversight.

**`weigh_ins` was counting rows, not weigh-ins.** Nine defs tested `state.bodylog.length`. The
entry form guarantees a weight (`if(!rawWeight) return;`), but the measurements CSV importer
deliberately does not — its own comment says a row "doesn't need weight (e.g. a waist-only or
body-fat-only day)". So an imported waist-only row counted toward "Log 50 weigh-ins". All nine
now call `weighInCount()`, which requires an actual weight. Tightening is safe: unlocks are
stored in `state.achievements` once earned, so no one loses a badge they already have.

## Two medals whose wording changed

`sandbag_total_m` and `burpee_bj_total_m` are metres in the designed set. This app logs both
movements in **reps** — `exerciseLogType()` classifies them as `strength` on purpose, with a
comment saying so — so they ship counted in reps and their descriptions say reps.

## Judgement calls worth knowing about

**`workout_streak_days` reads the CURRENT streak** (`computeStreak()`), matching the original
streak badges, not the best-ever. A 500-day streak badge therefore needs 500 unbroken days,
not a 500-day run at some point in the past.

**`weight_lost_kg` measures from your FIRST weigh-in**, not peak-to-trough. A medal for losing
10 kg should mean 10 kg off where you started, not 10 kg off a one-off high reading.

**`total_calories_burned` only counts calories the user recorded.** It is never estimated from
weight and duration, because an invented number there would be indistinguishable from a real
one on the same screen.

**`transitions_total` counts recorded segment boundaries** (`segments.length - 1` per race),
which is exactly the roxzone transitions actually cleared.

**`medals_unlocked` is self-referential** — it reads `state.achievements.length`, which grows
during the same `checkAchievements()` pass. It converges over successive calls rather than
resolving in one, which is correct behaviour, just worth not being surprised by.

## What was verified

```
empty state (new user)          606 defs | threw: 0 | unlocked: 0
state with every array missing  606 defs | threw: 0 of the 524 new
populated state                 606 defs | threw: 0 | unlocked: 71
```

**Zero unlocked on an empty state** is the result that matters. The 21 throws in the middle row
are all original defs that index `state.workoutLog`/`state.prs` without a guard; every check
added since guards its arrays, and `checkAchievements()` wraps each def individually so one
throw costs only its own badge.

`assembleRelease` BUILD SUCCESSFUL · 606 defs confirmed in the packaged bundle.

## Categories

```
strength 168 · consistency 75 · cardio 67 · nutrition 63 · body 63
hyrox 51 · streak 49 · milestone 42 · program 18 · special 10
```

The filter tabs in `renderProgressAchievements()` are a hardcoded list. A category missing from
it still works — its badges appear under "All" — but becomes unreachable as a filter, so that
list and `ACHIEVEMENT_DEFS` change together.
