import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

/**
 * Google Play triangle, drawn inline so the store CTA costs no network
 * request and stays crisp at any size.
 */
function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      aria-hidden
      focusable="false"
    >
      <path
        fill="#00d0ff"
        d="M47 24 300 256 47 488c-9-6-15-17-15-31V55c0-14 6-25 15-31z"
      />
      <path fill="#00f076" d="M47 24c7-5 17-5 27 1l273 155-47 76z" />
      <path fill="#ffc900" d="M347 332 300 256l47-76 79 45c22 13 22 49 0 62z" />
      <path fill="#f43249" d="M47 488c7 5 17 5 27-1l273-155-47-76z" />
    </svg>
  );
}

/**
 * Store call to action.
 *
 * This is an IGNYT-styled button rather than Google's supplied badge artwork.
 * If a Play listing review asks for the official badge, drop the asset from
 * Google's Play brand toolkit into `public/` and swap this component's inner
 * markup for it — every caller across the site picks the change up.
 */
export function PlayStoreButton({
  className,
  size = "lg",
  label = "Get it on Google Play",
}: {
  className?: string;
  size?: "md" | "lg";
  label?: string;
}) {
  return (
    <a
      href={site.links.play}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center gap-3.5 rounded-btn border border-line",
        "bg-gradient-to-b from-surface-2 to-surface text-left",
        "transition-[transform,border-color,box-shadow] duration-200",
        "hover:-translate-y-0.5 hover:border-ember/55",
        "hover:shadow-[0_18px_44px_-18px_rgba(255,90,31,0.7)] active:scale-[0.98]",
        size === "lg" ? "h-[54px] px-5" : "h-12 px-4",
        className,
      )}
    >
      <PlayGlyph className={size === "lg" ? "h-6 w-6" : "h-5 w-5"} />
      <span className="flex flex-col leading-none">
        <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-text-dim">
          Download on
        </span>
        <span
          className={cn(
            "mt-1 font-bold text-text",
            size === "lg" ? "text-[15px]" : "text-[14px]",
          )}
        >
          {label === "Get it on Google Play" ? "Google Play" : label}
        </span>
      </span>
    </a>
  );
}
