import { cn } from "@/lib/utils";

/**
 * The IGNYT bolt, traced from the shipping Android launcher icon
 * (`www/icon-512.png`) on a 512×512 grid.
 *
 * Exported so the favicon, the Open Graph image and the in-page logo all draw
 * the identical mark — there is exactly one definition of the brand shape.
 */
export const BOLT_PATH =
  "M344 92 L198 216 L252 216 L168 420 L314 296 L258 296 Z";

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
      <path d={BOLT_PATH} />
    </svg>
  );
}

/**
 * Bolt inside the brand tile — the way the icon appears on a device home
 * screen. Used by the navbar and footer.
 */
export function LogoTile({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative grid place-items-center overflow-hidden rounded-[10px]",
        "bg-gradient-to-br from-ember via-ember-strong to-[#c9350a]",
        "shadow-[0_6px_18px_-6px_rgba(255,90,31,0.75)]",
        className,
      )}
    >
      {/* Gloss highlight — keeps the tile from reading as flat orange. */}
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent"
      />
      <BoltMark className="relative h-[62%] w-[62%] text-white" />
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
