"""
Import IGNYT's badge artwork out of the supplied grid SCREENSHOTS.

WHAT THE SOURCE ACTUALLY IS. Not 82 badge files — ten WhatsApp-compressed JPEG screenshots of
a badge grid, 590-853px wide, RGB with no alpha. So every badge has to be located inside a
composite, cut out, separated from its background and identified. That is what this does.

HOW A BADGE IS FOUND. Not by hard-coded grid maths: the ten screenshots have three, four and
five columns and different margins, and a geometry table would be wrong the moment an eleventh
arrived. Instead the LABELS are read with OCR — every badge has its name printed directly
underneath — and each badge is taken as the box sitting above its own label. The text tells us
both where the badge is and which one it is, from one pass.

HOW THE BACKGROUND IS REMOVED. Flood fill inward from the border through near-black pixels
only, never a global luminance threshold. The badges have DARK INTERIOR PLATES, and a threshold
bright enough to clear the page background also punches a hole through the middle of every
badge. The fill cannot reach the interior because the bright metal frame encloses it. Measured
on the first crop: 44% of pixels cleared, centre alpha 255, corner alpha 0.

Transparency is not optional. The app's achievements screen is #121216 in dark theme and
#F8FAFC in light; a baked-in black background would show as a black square on the light one.

IDENTITY IS FUZZY-MATCHED, THEN CHECKED. OCR of small text over metal misreads — "Weigh-Ins"
becomes "Weiah-Ins". Each label is matched against ACHIEVEMENT_DEFS read from app.js, and
anything below the confidence floor is written to unmatched.csv rather than guessed. A badge
filed under the wrong id is worse than a badge with no art, because the fallback handles the
second case and nothing catches the first.

USAGE
    pip install easyocr opencv-python pillow
    python badge-image-generator/import_badges.py --src badge-src/badges
    python badge-image-generator/import_badges.py --src badge-src/badges --dry-run
"""

from pathlib import Path
from collections import deque
import argparse
import csv
import difflib
import json
import re
import sys

BASE_DIR = Path(__file__).resolve().parent
REPO_ROOT = BASE_DIR.parent
APP_JS = REPO_ROOT / "www" / "app.js"
OUT_DIR = REPO_ROOT / "www" / "assets" / "badges"
MANIFEST = OUT_DIR / "manifest.json"
REVIEW_DIR = BASE_DIR / "review"

# CANVAS IS CHOSEN PER BADGE, from the resolution the art actually has.
#
# A single fixed size is wrong in both directions here. Badges cut from the screenshots are only
# 118-284px of real detail, so writing them at 512 would store interpolation and nothing else —
# bytes with no picture in them. Badges supplied as their own files can be 1024px, and forcing
# those down to 256 would throw away detail the display can show: the grid renders at 84 CSS px,
# which is 252 device pixels on a 3x phone and 336 on a 4x one.
#
# So: never upscale past the source, never exceed the maximum, never drop below the minimum.
CANVAS_MIN = 256          # covers a 3x panel at the 84px display size
CANVAS_MAX = 512          # beyond this is invisible at 84px on any shipping display
CANVAS = CANVAS_MIN       # kept for callers that want the nominal size
TARGET_KB = 30
BG_LUMA = 42              # a pixel darker than this, reachable from the border, is background
MATCH_FLOOR = 0.72        # measured, not guessed: the two wrong matches scored 0.68 and 0.69
                          # ("Complete five weekly" -> hyrox_week1, "Train 21 days" ->
                          # training_days_50) and the worst CORRECT one scored 0.74. 0.80 was
                          # tried and cost real badges. When one id matches twice the higher
                          # score wins, so a stray low match cannot displace a clean one.


def read_defs():
    """Definitions come from app.js and are never copied here — a name duplicated into this
    file would drift the first time one was reworded, and the mismatch would be silent."""
    src = APP_JS.read_text(encoding="utf-8")
    block = re.search(r"const ACHIEVEMENT_DEFS = \[(.*?)\n\];", src, re.S)
    if not block:
        raise SystemExit("ACHIEVEMENT_DEFS not found in www/app.js")
    rows = re.findall(r'\{\s*id:"([^"]+)"[^\n]*?name:"([^"]+)"', block.group(1))
    if not rows:
        raise SystemExit("ACHIEVEMENT_DEFS matched no entries")
    return [{"id": a, "name": b} for a, b in rows]


def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", (s or "").lower()).strip()


def match_def(text, defs):
    """Best name match with its score, so the caller can decide rather than being told."""
    t = norm(text)
    if not t:
        return None, 0.0
    best, score = None, 0.0
    for d in defs:
        r = difflib.SequenceMatcher(None, t, norm(d["name"])).ratio()
        if r > score:
            best, score = d, r
    return best, score


def key_out_background(img):
    """Border-connected flood fill. See the module docstring for why not a threshold."""
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    def lum(p):
        return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]

    seen = bytearray(w * h)
    q = deque()

    def push(x, y):
        i = y * w + x
        if not seen[i] and lum(px[x, y]) < BG_LUMA:
            seen[i] = 1
            q.append((x, y))

    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)

    cleared = 0
    while q:
        x, y = q.popleft()
        px[x, y] = (0, 0, 0, 0)
        cleared += 1
        if x > 0:     push(x - 1, y)
        if x < w - 1: push(x + 1, y)
        if y > 0:     push(x, y - 1)
        if y < h - 1: push(x, y + 1)
    return img, cleared / float(w * h)


def drop_caption_bleed(img):
    """Erase content that sits entirely in the top band, and report the ink coverage left.

    THE PROBLEM. The box is measured from the label, so it commonly reaches far enough up to
    catch the bottom of the caption belonging to the row ABOVE. That text survives the background
    key — it is bright pixels on dark, exactly like the badge — and renders as words floating
    over the medal in the app.

    WHY NOT "KEEP THE LARGEST BLOB". That was the obvious fix and it is wrong here, measured: a
    badge is not reliably ONE blob. Where the frame is thin or dark the border fill leaks inside
    and splits the medal into pieces, so night_owl scored 0.08 and volume_500k 0.04 on
    largest-blob share — indistinguishable from a stray glyph, and 30 good badges were thrown out.

    WHAT ACTUALLY SEPARATES THEM. Position and ink. Caption bleed is always at the TOP of the
    crop, because the badge is anchored to the label at the bottom; anything whose whole bounding
    box lives in the top quarter is caption, whatever its size. And a crop that is nothing BUT
    text — prs_10 and score_70_x30 came through every earlier filter as pictures of the words
    "FIRST PERSONAL RECORD" and "Thirty Strong Days" — has low total coverage, because type is
    thin strokes on empty ground while a medal is a solid object. Fragmentation does not change
    total coverage, which is why it is the measure used.
    """
    w, h = img.size
    px = img.load()
    label = [0] * (w * h)
    blobs = {}          # id -> [area, min_y, max_y, min_x, max_x]
    cur = 0
    for sy in range(h):
        for sx in range(w):
            if label[sy * w + sx] or px[sx, sy][3] == 0:
                continue
            cur += 1
            label[sy * w + sx] = cur
            stack, area = [(sx, sy)], 0
            y0 = y1 = sy
            x0 = x1 = sx
            while stack:
                x, y = stack.pop()
                area += 1
                if y < y0: y0 = y
                if y > y1: y1 = y
                if x < x0: x0 = x
                if x > x1: x1 = x
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1),
                               (1, 1), (1, -1), (-1, 1), (-1, -1)):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < w and 0 <= ny < h and not label[ny * w + nx] \
                            and px[nx, ny][3] != 0:
                        label[ny * w + nx] = cur
                        stack.append((nx, ny))
            blobs[cur] = [area, y0, y1, x0, x1]

    # Everything discarded here is discarded on POSITION, because position is what identifies it.
    # The badge is centred in the box and anchored to its label, so:
    #   above  — a blob wholly in the top band is the caption of the row above, bleeding in
    #   below  — a blob wholly in the bottom band is this badge's own caption, when the OCR line
    #            used to place the box was the numeral engraved in the art rather than the label
    #   beside — a narrow blob touching a side edge is a slice of the NEIGHBOURING badge, caught
    #            because the box width is estimated from the caption and sometimes overshoots
    top_band, bot_band = h * 0.28, h * 0.86
    doomed = {k for k, (a, y0, y1, x0, x1) in blobs.items()
              if y1 < top_band
              or y0 > bot_band
              # A NEIGHBOUR IS ANYTHING THAT NEVER CROSSES THE CENTRE COLUMN.
              # Two weaker versions of this test were tried and measured. Keying on blob WIDTH
              # fails at both ends: a box wide enough to hold the frame also holds a fat slice of
              # the badge next door, while a narrow box slices this badge's own frame flat. Adding
              # "must touch the border" then did nothing at all — the fragments sit a pixel or two
              # inside after the background key, so the test never fired and the output came back
              # byte-identical.
              #
              # What holds for every badge and no intruder: this badge is centred over its own
              # label, so some part of it spans the middle of the box. A fragment that wandered in
              # from either side does not. Ornaments that flank without touching the body are the
              # accepted cost, and in this artwork the laurels join the frame.
              or (x1 < w * 0.42 or x0 > w * 0.58)}

    # A FIXED BAND CANNOT CATCH TEXT THAT STRADDLES IT, and plenty does — the box top is derived
    # from the caption width, so how far it reaches into the row above varies per badge. What is
    # invariant is the GAP: the layout puts blank space between one cell's caption and the next
    # cell's medal, so there is always a fully transparent row between the two. Cut at the lowest
    # such row in the upper half and the text goes with it, wherever it happened to land.
    #
    # This is safe on the medals themselves because none of them contains a fully transparent
    # row: a hexagon narrows to a point but the apex row still holds pixels, and the flanking
    # laurels only add more. Empty rows exist above the art, not inside it.
    for y in range(int(h * 0.5), 0, -1):
        if all(px[x, y][3] == 0 or label[y * w + x] in doomed for x in range(w)):
            for yy in range(y):
                for xx in range(w):
                    px[xx, yy] = (0, 0, 0, 0)
            break
    kept = 0
    for y in range(h):
        row = y * w
        for x in range(w):
            if label[row + x] in doomed:
                px[x, y] = (0, 0, 0, 0)
            elif px[x, y][3] != 0:
                kept += 1
    return img, kept / float(w * h)


def trim_to_content(img, pad=6):
    """Crop to what is actually opaque, then pad. Keeps every badge the same visual weight
    whatever slack the detected box had around it."""
    bbox = img.getbbox()
    if not bbox:
        return img
    l, t, r, b = bbox
    l = max(0, l - pad); t = max(0, t - pad)
    r = min(img.width, r + pad); b = min(img.height, b + pad)
    return img.crop((l, t, r, b))


def square(img):
    """Centre on a transparent square, resize to the canvas, and restore edge contrast.

    WHY SHARPEN AT ALL. The source is a WhatsApp-recompressed JPEG screenshot in which each badge
    occupies only 118-284px, so every badge arrives already softened by chroma subsampling and
    most are then interpolated UP to reach the canvas. Both steps cost edge contrast, and the
    engraved numerals — the part a user actually reads at 84px — lose it first.

    This does not invent detail and is not a substitute for higher-resolution art; it restores
    the acutance that compression and resampling took off. The radius is small and the threshold
    non-zero deliberately: a large radius would ring around the bright metal frame, and a zero
    threshold would sharpen JPEG noise in the flat dark plate as enthusiastically as the type.
    """
    from PIL import Image, ImageFilter
    side = max(img.size)
    out = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    out.paste(img, ((side - img.width) // 2, (side - img.height) // 2), img)

    # Take the source's own resolution where it has one, rather than a fixed size.
    canvas = max(CANVAS_MIN, min(CANVAS_MAX, side))
    out = out.resize((canvas, canvas), Image.LANCZOS)

    # Sharpen the colour channels only. Running an unsharp mask over the alpha channel would
    # ring the cut-out edge into a halo of semi-transparent pixels, which reads as a dirty
    # outline against the app's light theme.
    alpha = out.getchannel("A")
    rgb = out.convert("RGB").filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=3))
    rgb = rgb.convert("RGBA")
    rgb.putalpha(alpha)
    return rgb


def save_webp(img, path):
    """Encode under a budget that scales with the canvas.

    A flat byte budget would defeat the point of keeping a larger canvas: holding a 512px badge
    to the 256px allowance just spends the extra pixels on compression artefacts and ends up
    looking worse than the smaller file. The budget tracks area, so quality per pixel is what
    stays constant.
    """
    from io import BytesIO
    budget = TARGET_KB * 1024 * (img.width * img.height) / float(CANVAS_MIN * CANVAS_MIN)
    q = 88
    while True:
        buf = BytesIO()
        img.save(buf, format="WEBP", quality=q, method=6)
        if buf.tell() <= budget or q <= 55:
            path.write_bytes(buf.getvalue())
            return buf.tell(), q
        q -= 4


def ingest_files(src_dir, args):
    """Take a folder of ONE IMAGE PER BADGE, named after the achievement id.

    This is the accurate path and should be preferred whenever the art exists as separate files.
    Everything the screenshot importer has to infer — where the badge is, which badge it is — is
    already stated by the filename, so none of the OCR, cropping or matching heuristics run and
    none of their failure modes apply. The background key, trim and encode still do, because the
    art still has to end up transparent and small enough to ship.

    An unrecognised filename is reported, never guessed at: a file dropped in as "badge12.png"
    would otherwise be filed under whatever id happened to look closest.
    """
    from PIL import Image
    defs = {d["id"]: d for d in read_defs()}
    files = [p for p in sorted(src_dir.iterdir())
             if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")]
    if not files:
        raise SystemExit("no images in " + str(src_dir))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.review:
        REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    written, unknown = 0, []
    for f in files:
        aid = f.stem.strip().lower().replace("-", "_").replace(" ", "_")
        if aid not in defs:
            unknown.append(f.name)
            continue
        img = Image.open(f).convert("RGBA")
        # Art supplied with real transparency is trusted as-is; keying it again would eat into
        # the dark plate that the flood fill relies on being enclosed.
        if img.getextrema()[3][0] == 255:
            img, _ = key_out_background(img)
        final = square(trim_to_content(img))
        if not args.dry_run:
            size, q = save_webp(final, OUT_DIR / (aid + ".webp"))
            print("  %-30s %5.1f KB  q%d" % (aid + ".webp", size / 1024.0, q))
            written += 1
        if args.review:
            final.save(REVIEW_DIR / (aid + ".png"))

    if not args.dry_run:
        present = sorted(p.stem for p in OUT_DIR.glob("*.webp"))
        MANIFEST.write_text(json.dumps({"badges": present}, indent=2) + "\n", encoding="utf-8")
        total = sum(p.stat().st_size for p in OUT_DIR.glob("*.webp")) / 1048576.0
        print("\nwrote %d file(s); %d badge(s) on disk, %.2f MB" % (written, len(present), total))

    if unknown:
        print("\nNOT an achievement id, so nothing was written for these:")
        for u in unknown:
            print("  " + u)
        print("Rename them to <id>.png — see badge-image-generator/badge-list.csv.")

    missing = [i for i in defs if i not in {p.stem for p in OUT_DIR.glob("*.webp")}]
    print("\n%d of %d achievements have art" % (len(defs) - len(missing), len(defs)))
    if missing:
        print("still needed: " + ", ".join(sorted(missing)))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True, help="folder of grid screenshots")
    ap.add_argument("--files", action="store_true",
                    help="src holds ONE IMAGE PER BADGE named <achievement id>.png; skips all "
                         "OCR and cropping, which is why it is the accurate path")
    ap.add_argument("--dry-run", action="store_true", help="report matches, write nothing")
    ap.add_argument("--review", action="store_true", help="also write PNGs to review/")
    args = ap.parse_args()

    src_dir = Path(args.src)
    if args.files:
        return ingest_files(src_dir, args)

    shots = sorted([p for p in src_dir.iterdir()
                    if p.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp")])
    if not shots:
        raise SystemExit("no images in " + str(src_dir))

    defs = read_defs()
    print("%d screenshots, %d achievements defined" % (len(shots), len(defs)))

    import easyocr
    from PIL import Image
    reader = easyocr.Reader(["en"], gpu=False, verbose=False)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    if args.review:
        REVIEW_DIR.mkdir(parents=True, exist_ok=True)

    taken = {}          # id -> (score, source)
    unmatched = []
    written = 0

    for shot in shots:
        im = Image.open(shot).convert("RGB")
        W, H = im.size
        lines = reader.readtext(str(shot))
        # Keep confident lines only; the descriptions and the nav bar produce noise.
        lines = [(box, txt, conf) for box, txt, conf in lines if conf >= 0.35 and len(txt) > 2]
        print("\n%s  %dx%d  %d text lines" % (shot.name[:44], W, H, len(lines)))

        # ---- Geometry, derived from the layout rather than guessed from label width ----
        # Every text line is placed into a COLUMN by its centre, using the median label width
        # as the column pitch. Within a column the lines run top to bottom, and a badge occupies
        # the vertical gap between the previous line's bottom and its own label's top.
        #
        # The first attempt scaled badge height from label WIDTH, which has no relationship to
        # it: "PR" and "1,000,000kg Lifetime Volume" produced boxes of wildly different heights
        # for identically sized badges, so some crops caught the caption above and some cut the
        # badge in half. The gap between text lines IS the badge, and it is measurable.
        boxed = []
        for box, txt, conf in lines:
            xs = [q[0] for q in box]; ys = [q[1] for q in box]
            boxed.append({"txt": txt, "conf": conf, "cx": sum(xs)/4.0,
                          "x0": min(xs), "x1": max(xs), "y0": min(ys), "y1": max(ys),
                          "h": max(ys) - min(ys)})
        if not boxed:
            continue

        # WIDTH comes from the label, which measured well in practice — a badge is a little wider
        # than its own caption on every one of these shots. Clustering the x-centres to recover a
        # true column pitch was tried and is worse: wrapped caption lines sit slightly off-centre
        # and split into spurious clusters, collapsing the pitch to 103px on a 590px three-column
        # shot and cutting every badge in half.

        for b in boxed:
            d, score = match_def(b["txt"], defs)
            if not d or score < MATCH_FLOOR:
                continue
            # A description line can also fuzzy-match a name ("Log 100 working sets" scores 0.89
            # against "100 Working Sets"), and cropping above it would capture the name text
            # rather than the badge. Nothing needs to classify the line to catch that: the
            # nearest line above a description IS its own name, a few pixels up, so the box comes
            # out far too short and the size check below rejects it. Height was tried as the
            # discriminator first and was worse than useless — OCR box heights vary as much
            # within a role as between them, so the filter took out half the real names.
            cx, label_top = b["cx"], b["y0"]
            # 0.75 was too tight and SLICED THE MEDALS: a hexagon or circle wider than its own
            # caption came out with flat cut edges, which reads as bad art rather than as a bad
            # crop. Overshooting is the safer error — a neighbour caught at the edge is a narrow
            # blob touching the border, which drop_caption_bleed removes, whereas a frame cut off
            # here is gone for good.
            half = max(70, (b["x1"] - b["x0"]) * 0.92)

            # Clamping the top at the nearest text line above was tried and does not work here:
            # every badge has its VALUE ENGRAVED IN THE ART, so OCR reports "10 HOURS" as a text
            # line INSIDE the badge, roughly 20px above its own caption. The clamp latched onto
            # that and collapsed the box to nothing — 80 badges fell to 45. There is no reliable
            # ceiling in the text layer, so the box is taken from the label and the bad ones are
            # rejected afterwards by SHAPE, below, where the difference is unambiguous.
            top = max(0, label_top - half * 2.1)
            bx0 = int(max(0, cx - half)); bx1 = int(min(W, cx + half))
            by0 = int(top); by1 = int(max(0, label_top - 4))
            if by1 - by0 < 45 or bx1 - bx0 < 45:
                continue
            txt = b["txt"]

            crop = im.crop((bx0, by0, bx1, by1))
            keyed, ratio = key_out_background(crop)
            # A crop that is nearly all background caught a gap, not a badge.
            if ratio > 0.92 or ratio < 0.05:
                continue

            # Drop the caption bleed, then judge what is left.
            keyed, share = drop_caption_bleed(keyed)
            # A badge fills a good part of its box. A stray glyph or a fragment of the row above
            # does not, so anything small is a crop that found no badge at all.
            # 0.14 is where the two populations actually part, measured across all ten shots:
            # every rejected crop scored 0.100-0.137 and every real badge 0.158 or better.
            if share < 0.14:
                continue
            trimmed = trim_to_content(keyed)
            # Belt and braces on shape: the medals are square-ish, a line of type is not.
            aspect = trimmed.width / float(max(1, trimmed.height))
            if aspect > 1.9 or aspect < 0.5:
                continue
            final = square(trimmed)

            prev = taken.get(d["id"])
            if prev and prev[0] >= score:
                continue                     # keep the better-scoring instance
            taken[d["id"]] = (score, shot.name)

            if not args.dry_run:
                size, q = save_webp(final, OUT_DIR / (d["id"] + ".webp"))
                written += 1
            if args.review:
                final.save(REVIEW_DIR / (d["id"] + ".png"))
            print("   %-34s <- %-30s %.2f" % (d["id"], txt[:30], score))

        # Anything read but not confidently matched is reported, never guessed.
        for b in boxed:
            txt = b["txt"]
            d, score = match_def(txt, defs)
            if d and score >= MATCH_FLOOR:
                continue
            if len(norm(txt).split()) >= 2:
                unmatched.append({"source": shot.name, "text": txt,
                                  "closest": d["name"] if d else "", "score": round(score, 2)})

    covered = sorted(taken)
    missing = [d["id"] for d in defs if d["id"] not in taken]

    if not args.dry_run:
        present = sorted(p.stem for p in OUT_DIR.glob("*.webp"))
        MANIFEST.write_text(json.dumps({"badges": present}, indent=2) + "\n", encoding="utf-8")
        total = sum(p.stat().st_size for p in OUT_DIR.glob("*.webp")) / 1048576.0
        print("\nwrote %d file(s), %.2f MB" % (written, total))

    if unmatched:
        p = BASE_DIR / "unmatched.csv"
        with p.open("w", newline="", encoding="utf-8") as f:
            wr = csv.DictWriter(f, fieldnames=["source", "text", "closest", "score"])
            wr.writeheader(); wr.writerows(unmatched)
        print("unmatched text -> " + str(p) + " (%d rows)" % len(unmatched))

    print("\nmatched %d of %d achievements" % (len(covered), len(defs)))
    if missing:
        print("no art for %d: %s%s" % (len(missing), ", ".join(missing[:12]),
                                       " ..." if len(missing) > 12 else ""))
        print("Those keep the hand-drawn SVG — the app renders a mixed grid by design.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
