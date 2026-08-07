"""
Generate IGNYT's achievement badge FRAMES as image assets.

WHY FRAMES AND NOT BADGES. There are ~90 achievements and only 30 distinct looks: six category
shapes times five tiers. The numeral ("5", "500K KG") and the star row stay as an SVG overlay
drawn by the app on top of the image. Baking the number in would mean 90 files instead of 30, a
re-render every time a threshold moves, and text rasterised at one size for every screen
density. The frame is the part that needs to be art; the number is the part that needs to be
crisp.

WHAT IT PRODUCES
    www/assets/badges/<category>-<tier>.webp    512x512, transparent, ~60 KB each
    www/assets/badges/manifest.json             what actually exists

THE MANIFEST IS THE CONTRACT. www/js/badges/badge-frames.js reads it and falls back to the
existing hand-drawn SVG for anything missing, so the app is correct before this script has ever
run, correct after a partial run, and correct if generation is abandoned entirely. It lists what
is ON DISK rather than what was requested — a frame that failed must not be advertised, or the
app renders a broken image instead of falling back.

USAGE
    pip install google-genai pillow python-dotenv
    echo GEMINI_API_KEY=... > badge-image-generator/.env
    python badge-image-generator/generate_badges.py               # all 30
    python badge-image-generator/generate_badges.py --only gold   # one tier
    python badge-image-generator/generate_badges.py --dry-run     # print prompts, call nothing
"""

from pathlib import Path
from io import BytesIO
import argparse
import json
import os
import sys

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
OUT_DIR = REPO_ROOT / "www" / "assets" / "badges"
MANIFEST = OUT_DIR / "manifest.json"
ENV_FILE = BASE_DIR / ".env"

DEFAULT_MODEL = "gemini-2.5-flash-image"
CANVAS = 512
TARGET_KB = 60
WEBP_QUALITY_START = 88
WEBP_QUALITY_FLOOR = 60

# ---------------------------------------------------------------------------
# THE TAXONOMY MUST MATCH app.js — the keys of BADGE_SHAPES and BADGE_TIER_ORDER.
# A frame generated under a name the app does not use is a file nobody loads.
# ---------------------------------------------------------------------------
CATEGORIES = {
    "milestone":   ("a flat-topped hexagon shield", "pair of crossed dumbbells"),
    "streak":      ("a pointed-top hexagon shield", "stylised flame"),
    "strength":    ("an octagon medal",             "lightning bolt"),
    "program":     ("a chamfered heater shield",    "calendar grid"),
    "consistency": ("a pentagon shield",            "circular arrow loop"),
    "nutrition":   ("a perfect circle medal",       "laurel-framed apple"),
}

TIERS = {
    "bronze":   ("aged copper and dark bronze", "warm orange-brown", "no wreath, plain rim"),
    "silver":   ("brushed steel and pewter",    "cool blue-grey",    "a thin laurel wreath at the base"),
    "gold":     ("polished gold and brass",     "rich warm yellow",  "a full laurel wreath and a small crown at the top"),
    "diamond":  ("ice-blue platinum with faceted crystal inlays", "pale cyan", "a crown and faceted gem accents"),
    "platinum": ("deep violet metal with iridescent sheen",       "royal purple", "an ornate crown, wreath and radiating spokes"),
}

# "leave the middle clear, no text" is load-bearing. The app draws the numeral on top; a frame
# with a generated number in it would collide with the real one and cannot be corrected later.
PROMPT = (
    "A single premium 3D achievement medal for a fitness app, centred on a fully transparent "
    "background. Shape: {shape}. Material: {metal}, with realistic brushed-metal texture, sharp "
    "bevelled edges, deep inner shadow and a soft specular highlight from the upper left. "
    "Ornament: {ornament}. A small {icon} is embossed in the upper third. "
    "The centre of the medal is a DARK, EMPTY, faceted plate with subtle scratches. Leave the "
    "middle completely clear. Do not draw any text, numbers, letters or digits anywhere. "
    "Dominant colour {colour}. Rendered as a game trophy icon, dramatic studio lighting, high "
    "detail, crisp edges, square composition, no background, no ground shadow, no text."
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


def build_prompt(category, tier):
    shape, icon = CATEGORIES[category]
    metal, colour, ornament = TIERS[tier]
    return PROMPT.format(shape=shape, metal=metal, colour=colour, ornament=ornament, icon=icon)


def save_webp(image, path):
    """Step the quality down until it fits the budget. Frames are flat-ish art and land well
    above the floor; the floor exists so a stubborn frame degrades instead of looping."""
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
    MANIFEST.write_text(json.dumps({"frames": present}, indent=2) + "\n", encoding="utf-8")
    return present


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", help="one tier or category, e.g. gold or strength")
    ap.add_argument("--dry-run", action="store_true", help="print the prompts, call nothing")
    ap.add_argument("--force", action="store_true", help="regenerate frames that already exist")
    args = ap.parse_args()

    jobs = [(c, t) for c in CATEGORIES for t in TIERS if not args.only or args.only in (c, t)]
    if not jobs:
        print("nothing matches --only " + str(args.only))
        return 1

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    print(str(len(jobs)) + " frame(s) -> " + str(OUT_DIR))

    if args.dry_run:
        for c, t in jobs:
            print("\n--- " + c + "-" + t + " ---")
            print(build_prompt(c, t))
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
    for c, t in jobs:
        dest = OUT_DIR / (c + "-" + t + ".webp")
        if dest.exists() and not args.force:
            skipped += 1
            continue
        try:
            resp = client.models.generate_content(model=model, contents=build_prompt(c, t))
            data = None
            for part in resp.candidates[0].content.parts:
                if getattr(part, "inline_data", None):
                    data = part.inline_data.data
                    break
            if not data:
                failed.append(c + "-" + t + ": no image in response")
                continue
            size, q = save_webp(Image.open(BytesIO(data)), dest)
            print("  %-28s %5.1f KB  q%d" % (dest.name, size / 1024.0, q))
            made += 1
        except Exception as e:
            # One bad frame must not end the run — 29 good frames beat none.
            failed.append(c + "-" + t + ": " + str(e))

    present = write_manifest()
    print("\nmade %d, skipped %d, failed %d" % (made, skipped, len(failed)))
    for f in failed:
        print("  ! " + f)
    print("manifest: %d frame(s)" % len(present))
    return 0


if __name__ == "__main__":
    sys.exit(main())
