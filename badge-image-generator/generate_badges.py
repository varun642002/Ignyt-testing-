"""
Generate IGNYT's achievement badges as image assets — ONE PER ACHIEVEMENT.

WHY PER BADGE AND NOT PER CATEGORY. The first version of this script produced 30 shared frames
(six category shapes times five tiers) with the numeral drawn over the top as SVG. That is the
cheaper design and it is the wrong one for the reference: those badges carry a UNIQUE ICON each
— an owl for Night Owl, a crescent for the late sessions, scales for weigh-ins, mountains for
HYROX, a globe for lifetime volume — and a shared "milestone" frame cannot give Night Owl an
owl. The icon is most of the character, so the art has to be per badge.

The number goes IN the image for the same reason: in the reference it is engraved metal that
catches the same light as the frame, not text sitting on top of a picture.

WHAT IT COSTS, AND WHY YOU SHOULD READ THIS BEFORE A FULL RUN. The def set is now 680 badges,
not the 82 this script was written for. At ~25 KB each a complete run is roughly 17 MB of
assets and 680 paid image-model calls. That is a real bill and a real APK increase, so the
sensible use is --only against the categories or badges that actually need art; a full run
should be a deliberate decision, not the default reading of "generate the badges".
Rendering stays at 256px rather than 512 — badges display at 84px, so 256 is already 3x for a
retina panel and anything larger is bytes nobody sees.

WHAT IS ON DISK TODAY. 45 badges have art. The other 635 fall back to the hand-drawn SVG, which
is a supported state, not a bug — see THE MANIFEST IS THE CONTRACT below.

WHAT IT PRODUCES
    www/assets/badges/<achievement id>.webp   256x256, transparent, ~25 KB each
    www/assets/badges/manifest.json           what actually exists

THE MANIFEST IS THE CONTRACT. www/js/badges/badge-frames.js reads it and falls back to the
hand-drawn SVG for any badge without art, so the app is correct before this has run, correct
after a partial run, and correct if generation is abandoned. It lists what is ON DISK rather
than what was requested — one call per badge, any of which can fail, and a badge advertised but missing
renders a broken image instead of falling back.

THE DEFINITIONS ARE READ FROM app.js, never duplicated here. An id, tier or value copied into
this file would drift from the app the first time a threshold moved, and the mismatch would be
invisible: the badge would simply keep art showing the old number.

USAGE
    pip install google-genai pillow python-dotenv
    echo GEMINI_API_KEY=... > badge-image-generator/.env
    python badge-image-generator/generate_badges.py --dry-run          # prompts only
    python badge-image-generator/generate_badges.py --only streak      # one category
    python badge-image-generator/generate_badges.py --only workouts-5  # one badge
    python badge-image-generator/generate_badges.py                    # ALL 680 — see WHAT IT COSTS
"""

from pathlib import Path
from io import BytesIO
import argparse
import json
import os
import re
import sys

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
APP_JS = REPO_ROOT / "www" / "app.js"
OUT_DIR = REPO_ROOT / "www" / "assets" / "badges"
MANIFEST = OUT_DIR / "manifest.json"
ENV_FILE = BASE_DIR / ".env"

DEFAULT_MODEL = "gemini-2.5-flash-image"
CANVAS = 256                 # displayed at 84px; 256 is already 3x
TARGET_KB = 25
WEBP_QUALITY_START = 86
WEBP_QUALITY_FLOOR = 55

# --- The look, shared by every badge -----------------------------------------------------
# Tier drives metal and ornament. These are the same five tiers as BADGE_TIER_ORDER in app.js;
# the script asserts that below rather than trusting the comment.
TIERS = {
    "bronze":   ("aged copper and dark bronze",                   "warm orange-brown", "a plain rim, no wreath",                      "one small star"),
    "silver":   ("brushed steel and pewter",                      "cool blue-grey",    "a thin laurel wreath at the base",            "two small stars"),
    "gold":     ("polished gold and brass",                       "rich warm yellow",  "a full laurel wreath",                        "three small stars"),
    "diamond":  ("ice-blue platinum with faceted crystal inlays",  "pale cyan",         "a laurel wreath and a small crown on top",    "four small stars"),
    "platinum": ("deep violet metal with an iridescent sheen",     "royal purple",      "an ornate crown, wreath and radiating spokes","five small stars"),
}

SHAPES = {
    "milestone":   "a flat-topped hexagon shield",
    "streak":      "a pointed-top hexagon shield",
    "strength":    "an octagon medal",
    "program":     "a chamfered heater shield",
    "consistency": "a pentagon shield",
    "nutrition":   "a circular medal",
    # The four the def set grew past this script. Their absence was not cosmetic: read_defs()
    # raises SystemExit on an unknown category, so every run — --dry-run included — died before
    # it printed anything.
    "body":        "an oval locket medal",
    "cardio":      "a rounded-triangle pennant",
    "hyrox":       "a diamond-set square medal",
    "special":     "an eight-pointed star medal",
}

# --- Per-badge icon ----------------------------------------------------------------------
# Matched on the achievement id, most specific first. The reference's character lives here: an
# owl, a crescent, a set of scales. A generic per-category icon is what this exists to avoid.
#
# KEYED ON THE CURRENT ID SCHEME. These were written against the retired underscore ids
# (night_owl, early_bird, exercises_100) and never updated when the ids were renamed to hyphens,
# so 520 of 680 badges fell through to DEFAULT_ICON — Night Owl included, which is the exact
# example the module docstring gives for why this table exists. Anchored with \b and ^ where the
# prefix is the whole meaning, because a bare "pr" matches "prc", "protein" and "program".
ICON_RULES = [
    (r"^night-?owl|^late|after-?9|10pm",        "a wise owl under a crescent moon"),
    (r"^early-?bird|sunrise|before-?6|5am|^dawn", "a rising sun over mountains"),
    (r"^hyrox|^wb[TC]?|^sled|^slp|^sla|^burp|^farm|^lunge|^sandb", "a jagged mountain range"),
    (r"^vol|^volk|lifetime",                    "a globe wrapped in a laurel"),
    (r"^weigh|^wi\b|^bodylog|^lost|^gain|^bf|^bmi", "a bathroom scale seen from above"),
    (r"^water|hydrat",                          "a single water droplet"),
    (r"^meal|^food|^nut|^prot|^cal[BD]?|^macro|^fibre|^carb", "crossed fork and knife"),
    (r"streak|^wstreak|^nutstk|consecutive",    "a stylised flame"),
    (r"^pr\b|^prc|^pr-|record",                 "a clipboard with a tick"),
    (r"^sets|^reps|^pull[TC]|^push[TC]|^dip",   "a lightning bolt"),
    (r"^pullup|^pushup|^situp|^burpee|^kb-|^plank|^bw-", "a flexed arm silhouette"),
    (r"^great-day|^elite-day|^thirty-strong|^consistency|^habit|^healthy", "a laurel-framed star"),
    (r"^squat|^bench|^dead|^ohp|^lift|^row(?!D)|^clean|^snatch", "a loaded barbell"),
    (r"^run|^runD|^t5k|^t10k|^longRun|^elev|^ride|^rideD|^skiD|^rowD|^cardMin", "a running shoe with a wing"),
    (r"^ex|^muscle|^coll",                      "crossed dumbbells"),
    (r"^chall|^weekly|^fest|^bday",             "a calendar page with a tick"),
    (r"^hrs|^hours|trained|^sess|^time",        "a stopwatch face"),
    (r"^days|^score|^app|^rest",                "a laurel-framed star"),
    (r"^goal",                                  "a target with an arrow in the centre"),
    (r"^sleep|^slp-",                           "a crescent moon over a pillow"),
    (r"^race|^rc-|division",                    "a chequered flag"),
]
DEFAULT_ICON = "a pair of crossed dumbbells"


def icon_for(aid):
    for pattern, icon in ICON_RULES:
        if re.search(pattern, aid, re.I):
            return icon
    return DEFAULT_ICON


PROMPT = (
    "A single premium 3D achievement medal for a fitness app, centred on a fully transparent "
    "background, filling the frame. Shape: {shape}. Material: {metal}, with realistic "
    "brushed-metal texture, sharp bevelled edges, deep inner shadow and a bright specular "
    "highlight from the upper left. Ornament: {ornament}, and {stars} in a row near the bottom. "
    "{icon} is embossed in metal in the upper third. "
    "Across the centre, the text \"{value}\" is engraved in large bold metallic capitals, "
    "catching the same light as the frame, perfectly legible and correctly spelled. "
    "This is the ONLY text anywhere on the medal. "
    "The plate behind the text is dark and faceted with subtle scratches. "
    "Dominant colour {colour}. Game trophy icon, dramatic studio lighting, high detail, crisp "
    "edges, square composition, no background, no ground shadow, no watermark."
)


def load_env():
    if not ENV_FILE.exists():
        return
    try:
        from dotenv import load_dotenv
        load_dotenv(ENV_FILE)
    except ImportError:
        for line in ENV_FILE.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                os.environ.setdefault(k.strip(), v.strip())


def read_defs():
    """Parse ACHIEVEMENT_DEFS out of app.js. Read, never duplicated — a value copied here would
    drift the first time a threshold moved, and the badge would silently keep the old number."""
    src = APP_JS.read_text(encoding="utf-8")
    block = re.search(r"const ACHIEVEMENT_DEFS = \[(.*?)\n\];", src, re.S)
    if not block:
        raise SystemExit("ACHIEVEMENT_DEFS not found in www/app.js — has it been renamed?")
    rows = re.findall(
        r'\{\s*id:"([^"]+)"[^\n]*?name:"([^"]+)"[^\n]*?category:"([^"]+)"'
        r'[^\n]*?tier:"([^"]+)"[^\n]*?value:"([^"]*)"',
        block.group(1))
    defs = [dict(id=a, name=b, category=c, tier=t, value=v) for a, b, c, t, v in rows]
    if not defs:
        raise SystemExit("ACHIEVEMENT_DEFS matched no entries — the shape must have changed.")

    # The taxonomy has to agree with this script or frames are generated nobody loads.
    tiers = {d["tier"] for d in defs}
    cats = {d["category"] for d in defs}
    unknown_t, unknown_c = tiers - set(TIERS), cats - set(SHAPES)
    if unknown_t or unknown_c:
        raise SystemExit("app.js uses tiers/categories this script does not know: "
                         + str(sorted(unknown_t | unknown_c)))
    return defs


def build_prompt(d):
    metal, colour, ornament, stars = TIERS[d["tier"]]
    return PROMPT.format(shape=SHAPES[d["category"]], metal=metal, colour=colour,
                         ornament=ornament, stars=stars, icon=icon_for(d["id"]).capitalize(),
                         value=d["value"] or d["name"])


def save_webp(image, path):
    from PIL import Image
    image = image.convert("RGBA").resize((CANVAS, CANVAS), Image.LANCZOS)
    q = WEBP_QUALITY_START
    while True:
        buf = BytesIO()
        image.save(buf, format="WEBP", quality=q, method=6)
        if buf.tell() <= TARGET_KB * 1024 or q <= WEBP_QUALITY_FLOOR:
            path.write_bytes(buf.getvalue())
            return buf.tell(), q
        q -= 4


def write_manifest():
    present = sorted(p.stem for p in OUT_DIR.glob("*.webp"))
    MANIFEST.write_text(json.dumps({"badges": present}, indent=2) + "\n", encoding="utf-8")
    return present


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="an achievement id, a category or a tier")
    ap.add_argument("--dry-run", action="store_true", help="print the prompts, call nothing")
    ap.add_argument("--force", action="store_true", help="regenerate badges that already exist")
    ap.add_argument("--limit", type=int, help="stop after N, to sample the look before committing")
    args = ap.parse_args()

    defs = read_defs()
    jobs = [d for d in defs if not args.only
            or args.only in (d["id"], d["category"], d["tier"])]
    if args.limit:
        jobs = jobs[:args.limit]
    if not jobs:
        print("nothing matches --only " + str(args.only))
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print("%d of %d badge(s) -> %s" % (len(jobs), len(defs), OUT_DIR))

    if args.dry_run:
        for d in jobs:
            print("\n--- %s (%s %s) ---" % (d["id"], d["category"], d["tier"]))
            print(build_prompt(d))
        return 0

    load_env()
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        print("No GEMINI_API_KEY. Put it in badge-image-generator/.env, the same file the "
              "exercise generator uses. Nothing was written.")
        return 1

    from google import genai
    from PIL import Image

    client = genai.Client(api_key=key)
    model = os.environ.get("BADGE_MODEL", DEFAULT_MODEL)

    made = skipped = 0
    failed = []
    for d in jobs:
        dest = OUT_DIR / (d["id"] + ".webp")
        if dest.exists() and not args.force:
            skipped += 1
            continue
        try:
            resp = client.models.generate_content(model=model, contents=build_prompt(d))
            data = None
            for part in resp.candidates[0].content.parts:
                if getattr(part, "inline_data", None):
                    data = part.inline_data.data
                    break
            if not data:
                failed.append(d["id"] + ": no image in response")
                continue
            size, q = save_webp(Image.open(BytesIO(data)), dest)
            print("  %-34s %5.1f KB  q%d" % (dest.name, size / 1024.0, q))
            made += 1
        except Exception as e:
            # One bad badge must not end the run — the ones that succeeded beat none.
            failed.append(d["id"] + ": " + str(e))

    present = write_manifest()
    total_kb = sum(p.stat().st_size for p in OUT_DIR.glob("*.webp")) / 1024.0
    print("\nmade %d, skipped %d, failed %d" % (made, skipped, len(failed)))
    for f in failed:
        print("  ! " + f)
    print("manifest: %d badge(s), %.1f MB on disk" % (len(present), total_kb / 1024.0))
    return 0


if __name__ == "__main__":
    sys.exit(main())
