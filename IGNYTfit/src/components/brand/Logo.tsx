import { cn } from "@/lib/utils";

/**
 * The IGNYT bolt, on a 512×512 grid.
 *
 * Exported so the favicon, the Open Graph image and the in-page logo all draw
 * the identical mark — there is exactly one definition of the brand shape.
 *
 * The mark is two identical arrowheads, the lower one the upper rotated 180°
 * about the centre. That is a property of the artwork, not a coincidence, so
 * the half is defined once and the second is produced by a transform — the two
 * cannot drift apart under editing.
 */
const BOLT_HALF = "M372 36 L190 206 L256 206 L250 290 L330 290 Z";

/** Both halves as one path string, for consumers that cannot apply a transform
 *  (Satori's OG renderer, favicon generators). Same geometry, written out. */
export const BOLT_PATH = `${BOLT_HALF} M140 476 L322 306 L256 306 L262 222 L182 222 Z`;

export const BOLT_VIEWBOX = "0 0 512 512";

/**
 * Bolt mark on its own. Inherits `currentColor`, so it can be tinted by the
 * surrounding text colour.
 */
export function BoltMark({
  className,
  title,
}: {
  className?: string;
  /** Provide only when the mark stands alone as a meaningful image. */
  title?: string;
}) {
  return (
    <svg
      viewBox={BOLT_VIEWBOX}
      className={className}
      fill="currentColor"
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}
      <path d={BOLT_HALF} />
      <path d={BOLT_HALF} transform="rotate(180 256 256)" />
    </svg>
  );
}

/**
 * The full badge: ring, bolt, and the wordmark banded across the middle — the
 * mark as it appears on the app icon and social avatars.
 *
 * The ring is a dashed stroke rather than two arc paths so the gaps stay
 * centred on the horizontal axis at any size; the band's rules run through
 * those gaps, which is what makes the wordmark read as cutting the ring rather
 * than sitting on top of it.
 */
export function BoltBadge({
  className,
  title,
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={BOLT_VIEWBOX}
      className={className}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      {title ? <title>{title}</title> : null}

      {/* Ring — one repeat is half the circumference, offset so a gap lands at
          3 o'clock and the other at 9 o'clock. */}
      <circle
        cx="256"
        cy="256"
        r="200"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.3"
        strokeWidth="11"
        strokeDasharray="538 90"
        strokeDashoffset="45"
      />

      {/* Flanking rules, on the wordmark's optical centre line. */}
      <g stroke="currentColor" strokeOpacity="0.3" strokeWidth="11">
        <line x1="34" y1="262" x2="96" y2="262" />
        <line x1="416" y1="262" x2="478" y2="262" />
      </g>

      {/* dx nudges the string right by half the tracking: letter-spacing is
          applied after the final glyph too, so a centred string sits visibly
          left of centre without it. */}
      <text
        x="256"
        y="262"
        dx="9"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fillOpacity="0.3"
        fontSize="86"
        fontWeight="800"
        letterSpacing="18"
        fontFamily="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"
      >
        IGNYT
      </text>

      <g fill="#ffffff">
        <path d={BOLT_HALF} />
        <path d={BOLT_HALF} transform="rotate(180 256 256)" />
      </g>
    </svg>
  );
}

/**
 * Bolt inside the brand tile — the way the icon appears on a device home
 * screen. Used by the navbar and footer.
 *
 * Near-black with a white bolt, matching the current artwork. The tile was an
 * ember gradient; the ring carries the identity now, so the ember is spent on
 * the shadow rather than on the whole surface.
 */
function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-[10px]",
        "border border-white/12 bg-[#0a0b0f]",
        "shadow-[0_6px_18px_-8px_rgba(0,0,0,0.9)]",
        className,
      )}
    >
      {/* Gloss highlight — keeps the tile from reading as a flat black square. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"
      />
      {/* Ring, scaled to the tile so the mark still reads at 36px. */}
      <span
        aria-hidden
        className="absolute inset-[13%] rounded-full border border-white/15"
      />
      <BoltMark className="relative h-[70%] w-[70%] text-white" />
    </span>
  );
}

/**
 * Full lockup: tile + "IGNYT" wordmark.
 *
 * The wordmark is real text, not an outlined path, so it stays crisp at every
 * size and remains selectable and searchable.
 */
export function Logo({
  className,
  tileClassName,
  wordClassName,
  showWord = true,
}: {
  className?: string;
  tileClassName?: string;
  wordClassName?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoTile className={cn("h-9 w-9", tileClassName)} />
      {showWord ? (
        <span
          className={cn(
            "text-[19px] font-black tracking-[0.16em] text-text",
            wordClassName,
          )}
        >
          IGNYT
        </span>
      ) : null}
    </span>
  );
}
