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
| **A sleep log** | 16 | `sleep_logs`, `sleep_hours`, `sleep_streak_days`. `sleep_hrs` exists only as a legacy CSV import column. Adding `sleep` to `BODY_MEASUREMENT_GROUPS` would give all 16 a real source and a UI at once — that array is the single place the entry form, CSV and charts read. |
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
