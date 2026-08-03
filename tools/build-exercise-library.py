# -*- coding: utf-8 -*-
"""Rebuild LIBRARY in www/app.js from workout_names.csv."""
import csv, io, re
from collections import OrderedDict

CSV = "tools/workout_names.csv"   # the dataset this library was generated from
APP = "www/app.js"

rows = []
with io.open(CSV, encoding="utf-8-sig") as f:
    for r in csv.DictReader(f):
        n = (r.get("exercise_name") or "").strip()
        m = (r.get("muscle_group") or "").strip()
        if n:
            rows.append((n, m))


def category(name, muscle):
    n = name.lower()
    if re.search(r"\bsmith machine\b", n): return "Machine"
    if re.search(r"\((machine[^)]*|pec deck)\)|\bmachine\b|\bpec deck\b", n): return "Machine"
    if re.search(r"\(cable\)|\bcable\b", n): return "Machine"
    if re.search(r"\(barbell\)|\bbarbell\b|\bez bar\b|\btrap bar\b|\blandmine\b", n): return "Barbell"
    if re.search(r"\(dumbbell\)|\bdumbbell\b", n): return "Dumbbell"
    if re.search(r"\(kettlebell\)|\bkettlebell\b", n): return "Kettlebell"
    if re.search(r"\(band\)|\bband\b|\bsuspension\b", n): return "Bodyweight"
    if muscle == "Cardio":
        if re.search(r"treadmill|elliptical|bike|rowing machine|stair|ski erg|spinning|recumbent", n):
            return "Cardio Machine"
        return "Cardio Outdoor"
    if re.search(r"\bsled\b|wall ball|battle rope|farmers walk|sandbag|burpee|thruster|ball slam", n):
        return "Conditioning"
    if re.search(r"yoga|stretch|pilates|downward dog|warm up|mobility", n):
        return "Mobility / Stretch"
    return "Bodyweight"


TIME = (r"plank|hold|wall sit|dead hang|hiit|aerobics|boxing|yoga|pilates|stretch|spinning|"
        r"jump rope|battle ropes|warm up|l-sit|wall ball|bear crawl|mountain climber|high knees|flutter kicks")
DIST = (r"walk|run|sprint|carry|sled|hiking|swimming|cycling|skiing|skating|snowboarding|climbing|"
        r"rowing machine|ski erg|treadmill|elliptical|air bike|recumbent bike|stair machine")


def unit(name, muscle):
    n = name.lower()
    if re.search(DIST, n): return "distance"
    if re.search(TIME, n): return "time"
    return "time" if muscle == "Cardio" else "reps"


def presc(u, m):
    if u == "distance": return "3x400m"
    if u == "time": return "3x45s"
    if m in ("Abdominals", "Calves", "Forearms", "Neck"): return "3x15"
    if m in ("Biceps", "Triceps", "Shoulders", "Traps"): return "3x12"
    return "4x8"


ORDER = ["Barbell", "Dumbbell", "Machine", "Kettlebell", "Bodyweight", "Conditioning",
         "Cardio Machine", "Cardio Outdoor", "Mobility / Stretch"]
cats = OrderedDict((c, []) for c in ORDER)
for n, m in rows:
    u = unit(n, m)
    cats[category(n, m)].append((n, presc(u, m), u, m))

q = chr(34)


def esc(x):
    # No exercise name contains a backslash; only the quote needs escaping.
    return x.replace(q, "\\" + q)


out = ["const LIBRARY = {"]
for c in ORDER:
    items = sorted(cats[c], key=lambda t: t[0])
    if not items:
        continue                      # an empty category would render an empty Library section
    out.append("  %s%s%s:[" % (q, esc(c), q))
    line = "    "
    for k, (n, p, u, m) in enumerate(items):
        piece = "[%s%s%s,%s%s%s,%s%s%s,%s%s%s]" % (q, esc(n), q, q, p, q, q, u, q, q, esc(m), q)
        if len(line) + len(piece) > 116:
            out.append(line.rstrip())
            line = "    "
        line += piece + ("," if k < len(items) - 1 else "")
    out.append(line.rstrip())
    out.append("  ],")
out[-1] = out[-1].rstrip(",")
out.append("};")
lib = "\n".join(out)

HEADER = """/* The exercise library, rebuilt from the supplied dataset (workout_names.csv, %d rows).
   Entry shape is unchanged: [name, default prescription, unit, primary muscle].

   Only the name and the muscle came from the dataset. Category is read from the equipment the
   name states, unit from what a set of the movement is actually measured in - a carry is
   distance, a plank is time, everything else reps - and the prescription is a per-muscle
   default. Those three are inferences, not data: correct them here rather than in the CSV.

   The old EXERCISE_DETAILS records went with the old names. Only 95 of the original 458 could
   have kept theirs, and matching the rest would have meant attaching cable form-cues to
   dumbbell movements, which is worse than having none.

   Every exercise here has an image - a photo in www/assets/exercises or an instruction poster
   in www/assets/exercise-posters. The six that never got one were dropped from the CSV rather
   than left showing an icon badge, and their muscles moved to LEGACY_MUSCLE_MAP so anyone who
   had already logged them keeps the attribution. Adding a row here without adding an image
   reintroduces the badge. */
""" % len(rows)

s = io.open(APP, encoding="utf-8").read()
i = s.index("const LIBRARY = {")
j = s.index("\n};", i) + 3
old_len = j - i
s = s[:i] + HEADER + lib + s[j:]
io.open(APP, "w", encoding="utf-8").write(s)
print("LIBRARY replaced: %d -> %d chars" % (old_len, len(lib)))
print("categories: %d, exercises: %d" % (
    sum(1 for c in ORDER if cats[c]), sum(len(v) for v in cats.values())))
