# -*- coding: utf-8 -*-
"""Generate exercise CSVs from the LIBRARY in www/app.js.

    python tools/exercise-csv.py --mode <mode> [--out FILE]

LIBRARY is the source of truth, not tools/workout_names.csv -- the CSV seeded the library and
has not kept up with it. Everything here reads app.js directly so the output can never
disagree with what the app ships.

MODES

  images      Every exercise that has NO illustration, with an empty link column to fill in.
              This is the round trip: run it, paste image urls into the last column, hand the
              file back, and the download-convert-install pipeline takes it from there.

  category    All exercises grouped by how you would actually train them -- home workout,
              dumbbell, machine, barbell, cardio -- rather than by the library's storage
              category. "Bodyweight" in the library is not one thing: a plank and a muscle-up
              are both filed there and only one can be done in a bare room, so this splits on
              what a movement actually NEEDS.

  instructions Every exercise with NO written how-to steps, with empty columns to fill in.
              The counterpart to --mode images: same round trip, different content.

  worksheet   All exercises with empty instruction columns, for writing the how-to text.

  names       name,muscle only -- the shape tools/workout_names.csv expects. Run this before
              build-exercise-library.py so that script is not working from a stale set.

  audit       No file. Prints what is missing: illustrations, instructions, and any exercise
              whose library category disagrees with the equipment its name implies.
"""
import io, json, os, re, sys, csv

APP = "www/app.js"


# --------------------------------------------------------------------------- library parsing
def read_library():
    """The LIBRARY object literal out of app.js, by brace balance.

    Not by regex. A regex over an object this large with nested arrays is how you silently
    truncate someone's exercise library and only find out when a screen renders empty.
    """
    src = io.open(APP, encoding="utf-8").read()
    start = src.index("const LIBRARY = {")
    open_i = src.index("{", start)
    depth, end = 0, -1
    for i in range(open_i, len(src)):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                end = i
                break
    if end < 0:
        raise SystemExit("LIBRARY literal is unbalanced in %s" % APP)
    return json.loads(src[open_i:end + 1])


def slug(name):
    """Must match exerciseImageSlug() in app.js exactly, or the manifest lookup misses."""
    s = name.lower().replace("&", " and ")
    s = re.sub(r"[()']", "", s)
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def read_manifest():
    """{slug: 1 | "gif" | "webp"} -- 1 means a .jpg still, a string is the extension."""
    p = "www/js/workout/exercise-images.js"
    if not os.path.exists(p):
        return {}
    txt = io.open(p, encoding="utf-8").read()
    return json.loads(txt[txt.index("{"):txt.rindex("}") + 1])


def read_instructions():
    """{exercise name: [step, step, ...]}. Keyed by the EXACT library name, never fuzzily --
    the library separates movements by equipment, so a near match attaches barbell setup cues
    to a machine movement, which is worse than having no instructions at all."""
    p = "www/js/workout/exercise-instructions.js"
    if not os.path.exists(p):
        return {}
    txt = io.open(p, encoding="utf-8").read()
    return json.loads(txt[txt.index("{"):txt.rindex("}") + 1])


# ----------------------------------------------------------------- what a movement NEEDS
IT_BAND = re.compile(r"\bIT band\b", re.I)
BAR = re.compile(r"\b(pull ?ups?|chin ?ups?|muscle ?ups?)\b|\btoes to bar\b|\bhanging\b|\bhang\b"
                 r"|\b(front|back) lever\b|\bhuman flag\b|\bskin the cat\b", re.I)
FREE_COND = re.compile(r"burpee|shadow boxing|carioca|lateral shuffle|agility ladder|cone drill"
                       r"|\bt drill\b|wall drill|jump rope|high knee", re.I)

# Checked in order, first match wins. Band and suspension sit ABOVE the cable rule so
# "Lat Pulldown (Band)" is not read as a machine because of the word "pulldown".
BODYWEIGHT_RULES = [
    (lambda n: re.search(r"\bfoam roll", n, re.I) or re.match(r"^wrist roller$", n, re.I),
     "Home Workout - Foam Roller", "Foam roller", "Yes - small kit"),
    (lambda n: re.search(r"\bjump rope\b|\bskipping\b", n, re.I),
     "Home Workout - Jump Rope", "Skipping rope", "Yes - small kit"),
    (lambda n: re.search(r"\b(suspension|trx)\b|\brings?\b", n, re.I),
     "Home Workout - Suspension", "Suspension trainer or rings", "Yes - with an anchor"),
    (lambda n: re.search(r"\bbands?\b", n, re.I) and not IT_BAND.search(n),
     "Home Workout - Resistance Band", "Resistance band", "Yes - small kit"),
    (lambda n: re.search(r"\bweighted\b|\bplate\b", n, re.I),
     "Home Workout - Added Weight", "A plate or dumbbell", "Yes - if you own weight"),
    (lambda n: BAR.search(n),
     "Home Workout - Pull-Up Bar", "Pull-up bar", "Yes - with a bar"),
    (lambda n: re.search(r"\bab wheel\b", n, re.I),
     "Home Workout - Ab Wheel", "Ab wheel", "Yes - small kit"),
    (lambda n: re.search(r"\b(bench|box|step ?ups?|dips?|parallettes?|chair|couch)\b", n, re.I),
     "Home Workout - Bench or Step", "Bench, box or step", "Yes - a chair or step works"),
    # Still "no equipment" as a category -- everyone has a towel -- but the column should say
    # so rather than claim nothing is needed.
    (lambda n: re.search(r"\btowel\b", n, re.I),
     "Home Workout - No Equipment", "A towel", "Yes"),
]


def classify(cat, name):
    """(workout category, equipment needed, can do at home)."""
    if cat == "Barbell":
        return "Barbell Workout", "Barbell, rack and plates", "Gym or home gym"
    if cat == "Dumbbell":
        return "Dumbbell Workout", "Dumbbells", "Gym or home"
    if cat == "Kettlebell":
        return "Kettlebell Workout", "Kettlebell", "Gym or home"
    if cat == "Machine":
        kind = "Cable machine" if re.search(r"cable|pulldown|pushdown", name, re.I) else "Weight machine"
        return "Machine & Cable Workout", kind, "Gym only"
    if cat == "Cardio Machine":
        return "Cardio - Machine", name, "Gym only"
    if cat == "Cardio Outdoor":
        if re.search(r"swim", name, re.I):
            return "Cardio - Swimming", "Swimming pool", "Pool needed"
        need = "A bicycle" if re.search(r"cycl", name, re.I) else "None - outdoors"
        return "Cardio - Outdoor", need, "Yes - outdoors"
    if cat == "Mobility / Stretch":
        return "Mobility & Stretching", "None", "Yes"
    if cat == "Conditioning":
        if FREE_COND.search(name):
            return "Home Workout - No Equipment", "None", "Yes"
        eq = ("Sled" if re.search(r"sled", name, re.I) else
              "Sandbag" if re.search(r"sandbag", name, re.I) else
              "Medicine or slam ball" if re.search(r"med(icine)? ?ball|wall ball|slam ball", name, re.I) else
              "Strongman implement" if re.search(r"atlas|keg|yoke|tire|log", name, re.I) else
              "Battle ropes" if re.search(r"rope", name, re.I) else
              "Heavy bag or sledgehammer" if re.search(r"bag|sledge", name, re.I) else
              "Gym equipment")
        return "Conditioning / Functional", eq, "Gym only"
    for test, label, equip, home in BODYWEIGHT_RULES:
        if test(name):
            if label == "Home Workout - Resistance Band" and BAR.search(name):
                return label, "Resistance band and a pull-up bar", "Yes - with a bar"
            return label, equip, home
    return "Home Workout - No Equipment", "None", "Yes"


# Equipment the NAME states, used only by --mode audit to spot a wrong library category.
#
# EXCLUDE is checked first and matters more than the rules do. Without it this flags
# "Lat Pulldown (Band)" as a machine because of the word "pulldown", and "Sandbag Clean" as a
# barbell lift because of the word "clean" -- both wrong, and an audit that reports four
# things it is wrong about is an audit nobody reads twice.
NAME_IMPLIES = [
    (re.compile(r"\b(clean|snatch|jerk)\b|\bt bar row\b|\bbarbell\b|\bez ?bar\b|\btrap bar\b", re.I),
     "Barbell",
     re.compile(r"\b(dumbbell|kettlebell|band|sandbag|med(icine)? ?ball|slam ball|suspension)\b", re.I)),
    (re.compile(r"\b(cable|smith|pulldown|pushdown|hack squat|pec deck)\b", re.I),
     "Machine",
     re.compile(r"\b(band|suspension|bodyweight)\b", re.I)),
    (re.compile(r"\bdumbbell\b", re.I), "Dumbbell", re.compile(r"\b(band|suspension)\b", re.I)),
    (re.compile(r"\bkettlebell\b", re.I), "Kettlebell", re.compile(r"\b(band|suspension)\b", re.I)),
]


def rows_from(lib):
    out = []
    for cat in lib:
        for name, presc, unit, muscle in lib[cat]:
            out.append({"name": name, "cat": cat, "presc": presc, "unit": unit, "muscle": muscle})
    return out


def write_csv(path, header, rows):
    with io.open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\r\n")
        w.writerow(header)
        w.writerows(rows)
    print("wrote %s  (%d rows)" % (path, len(rows)))


def main(argv):
    mode = "category"
    out = None
    for i, a in enumerate(argv):
        if a == "--mode" and i + 1 < len(argv):
            mode = argv[i + 1]
        if a == "--out" and i + 1 < len(argv):
            out = argv[i + 1]

    lib = read_library()
    rows = rows_from(lib)
    manifest = read_manifest()
    rows.sort(key=lambda r: (r["cat"], r["muscle"], r["name"]))
    print("library: %d exercises, %d categories" % (len(rows), len(lib)))

    if mode == "images":
        missing = [r for r in rows if slug(r["name"]) not in manifest]
        write_csv(out or "ignyt-missing-images.csv",
                  ["name", "cat", "presc", "unit", "muscle", "image links"],
                  [[r["name"], r["cat"], r["presc"], r["unit"], r["muscle"], ""] for r in missing])
        print("%d of %d still have no illustration" % (len(missing), len(rows)))

    elif mode == "category":
        data = []
        for r in rows:
            wcat, equip, home = classify(r["cat"], r["name"])
            data.append([r["name"], wcat, equip, home, r["cat"], r["muscle"], r["presc"], r["unit"]])
        data.sort(key=lambda x: (x[1], x[5], x[0]))
        write_csv(out or "ignyt-workouts-by-category.csv",
                  ["Exercise", "Workout Category", "Equipment Needed", "Can Do At Home",
                   "Library Category", "Muscle Group", "Default Sets x Reps", "Log Type"], data)
        tally = {}
        for d in data:
            tally[d[1]] = tally.get(d[1], 0) + 1
        for k in sorted(tally, key=lambda x: -tally[x]):
            print("   %4d  %s" % (tally[k], k))

    elif mode == "instructions":
        instr = read_instructions()
        missing = [r for r in rows if r["name"] not in instr]
        write_csv(out or "ignyt-missing-instructions.csv",
                  ["name", "cat", "muscle", "presc", "unit", "has image",
                   "how to do it", "common mistakes"],
                  [[r["name"], r["cat"], r["muscle"], r["presc"], r["unit"],
                    "yes" if slug(r["name"]) in manifest else "", "", ""] for r in missing])
        print("%d of %d have no written steps" % (len(missing), len(rows)))
        by_cat = {}
        for r in missing:
            by_cat[r["cat"]] = by_cat.get(r["cat"], 0) + 1
        for k in sorted(by_cat, key=lambda x: -by_cat[x]):
            print("   %4d  %s" % (by_cat[k], k))

    elif mode == "worksheet":
        write_csv(out or "ignyt-exercise-content-worksheet.csv",
                  ["name", "cat", "muscle", "presc", "unit", "has image",
                   "how to do it", "common mistakes", "image links"],
                  [[r["name"], r["cat"], r["muscle"], r["presc"], r["unit"],
                    "yes" if slug(r["name"]) in manifest else "", "", "", ""] for r in rows])

    elif mode == "names":
        write_csv(out or "tools/workout_names.csv", ["exercise_name", "muscle_group"],
                  [[r["name"], r["muscle"]] for r in sorted(rows, key=lambda r: r["name"])])

    elif mode == "audit":
        no_img = [r for r in rows if slug(r["name"]) not in manifest]
        animated = sorted(k for k, v in manifest.items() if isinstance(v, str))
        wrong = []
        for r in rows:
            for rx, implied, exclude in NAME_IMPLIES:
                if exclude.search(r["name"]):
                    break                      # the name names a different implement; not a mismatch
                if rx.search(r["name"]) and r["cat"] != implied:
                    wrong.append((r["name"], r["cat"], implied))
                    break
        instr = read_instructions()
        no_steps = [r for r in rows if r["name"] not in instr]
        both = [r for r in rows if slug(r["name"]) not in manifest and r["name"] not in instr]
        print("")
        print("exercises               : %d" % len(rows))
        print("without an illustration : %d   (tools/exercise-csv.py --mode images)" % len(no_img))
        print("without written steps   : %d   (tools/exercise-csv.py --mode instructions)" % len(no_steps))
        print("without either          : %d" % len(both))
        print("animated demonstrations : %d %s" % (len(animated), animated or ""))
        print("category looks wrong    : %d" % len(wrong))
        for n, have, want in wrong[:20]:
            print("    %-34s stored %-12s name says %s" % (n, have, want))
        if len(wrong) > 20:
            print("    ... and %d more" % (len(wrong) - 20))

    else:
        print(__doc__)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
