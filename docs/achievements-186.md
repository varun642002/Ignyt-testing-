# The 186-medal set — what shipped, what did not, and why

`ignyt-medals-186.html` designed 186 medals. **171 are now in `ACHIEVEMENT_DEFS`**
(`www/app.js`), up from 82. This file records the 15 that are not, because "why isn't my
badge there" is the question that gets asked six months later when nobody remembers.

## The rule this was built under

The comment at the top of the original block still governs:

> Every check reads logged data — sessions, sets, reps, PRs, food entries, water, the score
> history, the XP ledger. None of them can be unlocked by opening a screen, and none is
> awarded for anything the app cannot actually see.

A medal with no honest data source is worse than a missing medal. It is either permanently
unearnable — a locked tile the user can never clear, which makes 100% impossible — or it is
awarded on a guess, which is the same as making the number up.

## Ids were not renamed

The designed set uses hyphens (`first-workout`); the 82 already in the app use underscores
(`first_workout`). **The existing ids stayed.** `state.achievements` stores unlock records
keyed by id, so renaming them would orphan every badge every existing user has already
earned. 81 of the 186 matched an existing def by name and kept the old id; the 82nd
(`volume_1m`) is the designed set's `lifetime-volume` under a longer name.

New medals use the designed hyphenated ids. The two conventions sitting side by side is
deliberate and is cheaper than a migration.

## The 15 not implemented

| Medal | Why not |
|---|---|
| Barcode Scanner | Barcode scanning was removed from the food log. Nothing counts scans. |
| Founding Athlete | Needs a server-side join order. The app cannot know where a user ranks. |
| Locked In (30-day app streak) | Nothing logs app opens — and a badge for launching the app rewards the wrong thing. |
| No Days Off (public holiday) | No holiday calendar, and holidays are per-country. Not determinable offline. |
| Lights Out / Well Rested | There is no sleep log. `sleep_hrs` exists only as a legacy CSV import column. |
| Rest Day / Recovery Pro | Rest days are never logged. A day off is an absence of data, not an entry. |
| HYROX Doubles | `raceLog` entries carry no division field. A doubles run is indistinguishable. |
| HYROX Pro | `raceLog` entries carry no weight class. A Pro run is indistinguishable. |
| Desi Delight / Thali Tracker | Food log entries store no cuisine tag, and the catalogue lookup is async and lazy — it cannot be read from inside a synchronous `check()`. |
| Challenge Accepted | There are weekly challenges, but no 30-day challenge feature to complete. |
| Program Veteran | Only the CURRENT plan is stored. There is no history of completed programs. |
| 1,000,000kg Lifted | Duplicate — the designed set lists it twice (`lifetime-volume`, `vol-1m`) and the app already ships it as `volume_1m`. |

Six of these become buildable by adding the feature underneath them, not by writing a
cleverer check: a rest-day toggle, a sleep log, a division field on the race timer, a cuisine
tag on food entries. That is the honest backlog.

## Two medals whose wording changed

HYROX measures the sandbag lunge in metres (100 m) and the burpee broad jump in metres
(80 m). This app logs both in **reps** — `exerciseLogType()` classifies them as `strength`
on purpose, with a comment saying so, because they are counted movements rather than timed or
measured ones. The medals ship counted in reps, and their descriptions say reps rather than
metres. Awarding a metres badge off a rep count would be inventing a distance.

## Where each check gets its numbers

Set shape follows `exerciseLogType()`, so the helpers read the **field** rather than
re-deriving a type:

| Log type | Fields | Medals that read it |
|---|---|---|
| `strength` | `weight`, `reps`, `rpe` | lift ratios, rep totals, wall balls, pull-ups, push-ups |
| `cardio` | `distanceKm`, `durationSec`, `calories` | runs, rows, SkiErg, bike |
| `hold` | `durationSec` | plank |
| `carry` | `distanceKm`, `weight` | sled push, sled pull, farmers carry |

Two traps worth naming:

**`\brow\b` matches Barbell Row.** Rowing medals match machine words only
(`rowing|\brower\b|concept ?2`) and are additionally gated on a `distanceKm` field existing —
a strength row has reps and no distance. Getting this wrong would credit a back workout as
metres rowed.

**A time medal is literal, never a split.** "Sub-25 5K" is a single logged piece of *at least*
5 km finished inside 25:00. A 10 km run cannot satisfy it via its first 5 km, because the app
did not record that split. This is strictly harder than the medal's wording and never awards
on an estimate.

## What was verified

`node runchecks.js` runs all 171 checks against three states:

```
empty state (new user)          171 defs | threw: 0 | unlocked: 0
state with every array missing  171 defs | threw: 21 | unlocked: 0
populated state                 171 defs | threw: 0 | unlocked: 44
```

**Zero unlocked on an empty state** is the result that matters — a check that fires for a user
with no data is a false award, and there are none.

The 21 throws in the middle row are all **pre-existing** defs that index `state.workoutLog`
and `state.prs` directly without a guard. `LS.records()` always returns an array so this does
not happen in practice, but `checkAchievements()` now wraps each `def.check()` in its own
try/catch: at 82 defs a throw was survivable, at 171 an exception in one check would abort the
`forEach` and silently cost every badge after it in the list.

## Progress bars

`badgeProgress()` could only read a number out of five id shapes (`workouts_50`, `sets_500`…),
so every other badge rendered a bare tile. Defs may now declare their own:

```js
prog:{ have:()=> stationReps(ACH_WALLBALL_RE), need:1000 }
```

32 of the new medals carry one — the ones where a running total is meaningful. A streak or a
one-off event does not get a bar, because "1 of 1" tells the user nothing.

## Categories

The set went from 6 categories to 10 — `cardio`, `hyrox`, `body` and `special` are new. The
filter tabs in `renderProgressAchievements()` are a **hardcoded list**: a category missing from
it still works (its badges appear under "All") but becomes unreachable as a filter. That list
and `ACHIEVEMENT_DEFS` have to be changed together.

```
milestone 21 · strength 37 · consistency 31 · nutrition 18 · cardio 18
hyrox 14 · body 12 · streak 9 · program 6 · special 5
```
