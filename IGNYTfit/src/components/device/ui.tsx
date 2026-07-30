import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Primitives for the in-page app mockups.
 *
 * These reproduce the IGNYT client's own UI kit — status bar, headers, tiles,
 * rings, charts, list rows, bottom tab bar — as vectors and text rather than
 * raster screenshots. That means the mockups stay razor sharp on any display,
 * cost a few kilobytes instead of megabytes of PNGs, and never need
 * re-exporting when the product's colours change.
 *
 * Everything is authored against the 280×606 grid defined in `PhoneFrame`.
 */

/* -------------------------------------------------------------- chrome */

export function StatusBar({ dark = true }: { dark?: boolean }) {
  return (
    <div
      className={cn(
        "flex h-[26px] items-end justify-between px-4 pb-0.5 text-[9px] font-semibold",
        dark ? "text-white/85" : "text-black/70",
      )}
    >
      <span>9:41</span>
      <span aria-hidden className="flex items-center gap-1">
        {/* signal */}
        <svg
          viewBox="0 0 16 10"
          className="h-[7px] w-[11px]"
          fill="currentColor"
        >
          <rect x="0" y="7" width="2.4" height="3" rx="0.6" />
          <rect x="4" y="5" width="2.4" height="5" rx="0.6" />
          <rect x="8" y="2.6" width="2.4" height="7.4" rx="0.6" />
          <rect x="12" y="0" width="2.4" height="10" rx="0.6" />
        </svg>
        {/* wifi */}
        <svg
          viewBox="0 0 16 12"
          className="h-[7px] w-[9px]"
          fill="currentColor"
        >
          <path d="M8 11.2 5.6 8.4a3.8 3.8 0 0 1 4.8 0Z" />
          <path
            d="M2.6 5.4a8.4 8.4 0 0 1 10.8 0"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        {/* battery */}
        <svg viewBox="0 0 24 12" className="h-[7px] w-[14px]" fill="none">
          <rect
            x="0.6"
            y="0.6"
            width="20"
            height="10.8"
            rx="3"
            stroke="currentColor"
            strokeOpacity="0.5"
          />
          <rect
            x="2.4"
            y="2.4"
            width="14"
            height="7.2"
            rx="1.8"
            fill="currentColor"
          />
          <path d="M22.4 4.2v3.6a2 2 0 0 0 0-3.6Z" fill="currentColor" />
        </svg>
      </span>
    </div>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  right,
  back = false,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  back?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-4 pb-2.5 pt-2">
      {back ? (
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-full border border-line text-[11px] text-text-mute"
        >
          ‹
        </span>
      ) : null}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-extrabold leading-tight text-text">
          {title}
        </p>
        {subtitle ? (
          <p className="truncate text-[9.5px] font-medium text-text-dim">
            {subtitle}
          </p>
        ) : null}
      </div>
      {right}
    </div>
  );
}

const TABS = [
  { id: "home", label: "Home" },
  { id: "workout", label: "Workout" },
  { id: "food", label: "Food" },
  { id: "progress", label: "Progress" },
  { id: "more", label: "More" },
] as const;

const TAB_ICONS: Record<string, ReactNode> = {
  home: (
    <path d="M3 9.5 10 4l7 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-5V17H4a1 1 0 0 1-1-1Z" />
  ),
  workout: (
    <path d="M4 7h2v6H4zm10 0h2v6h-2zM6.5 9h7v2h-7zM2 8.4h1.4v3.2H2zm14.6 0H18v3.2h-1.4z" />
  ),
  food: (
    <path d="M6 3v6.5a2 2 0 0 0 1.4 1.9V17h1.4v-5.6A2 2 0 0 0 10.2 9.5V3H9v4.4H7.9V3H6.8v4.4H5.7V3ZM13 3c-1.4 0-2.4 1.9-2.4 4.4 0 1.9.7 3.3 1.7 3.7V17h1.4V3Z" />
  ),
  progress: (
    <path d="M3 15h2.6v2H3zm4.2-5h2.6v7H7.2zm4.2-4H14v11h-2.6zm4.2 6H18v5h-2.4z" />
  ),
  more: (
    <path d="M4.5 8.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm5.5 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
  ),
};

export function TabBar({ active = "home" }: { active?: string }) {
  return (
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-around border-t border-line-soft bg-[#0a0c11]/95 px-2 pb-3 pt-2 backdrop-blur">
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <span key={tab.id} className="flex flex-col items-center gap-1">
            <svg
              viewBox="0 0 20 20"
              className={cn(
                "size-[15px]",
                isActive ? "text-ember" : "text-text-dim",
              )}
              fill="currentColor"
              aria-hidden
            >
              {TAB_ICONS[tab.id]}
            </svg>
            <span
              className={cn(
                "text-[8px] font-semibold",
                isActive ? "text-ember" : "text-text-dim",
              )}
            >
              {tab.label}
            </span>
          </span>
        );
      })}
    </div>
  );
}

/**
 * Body region of a screen. `pb-16` reserves room for the absolutely
 * positioned tab bar.
 *
 * Row spacing is a `tight` boolean rather than something a caller overrides
 * through `className`: two gap utilities on one element resolve by stylesheet
 * order, not attribute order, so `className="gap-2"` would silently lose to
 * the default. Screens with a lot of rows pass `tight` to fit the 606px
 * device grid exactly.
 */
export function ScreenBody({
  children,
  className,
  withTabBar = true,
  tight = false,
}: {
  children: ReactNode;
  className?: string;
  withTabBar?: boolean;
  tight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col px-4",
        tight ? "gap-2" : "gap-2.5",
        withTabBar ? "pb-16" : "pb-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* --------------------------------------------------------------- panels */

export function Tile({
  children,
  className,
  tone = "surface",
}: {
  children: ReactNode;
  className?: string;
  tone?: "surface" | "elevated" | "ember" | "pulse";
}) {
  const tones = {
    surface: "border-line-soft bg-surface",
    elevated: "border-line bg-surface-2",
    ember:
      "border-ember/30 bg-[linear-gradient(140deg,rgba(255,90,31,0.16),rgba(255,90,31,0.03))]",
    pulse:
      "border-pulse/30 bg-[linear-gradient(140deg,rgba(62,130,247,0.16),rgba(62,130,247,0.03))]",
  };

  return (
    <div className={cn("rounded-[14px] border p-3", tones[tone], className)}>
      {children}
    </div>
  );
}

export function StatTile({
  label,
  value,
  unit,
  accent = "text-text",
  sub,
}: {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
  sub?: string;
}) {
  return (
    <Tile className="flex-1">
      <p className="text-[8.5px] font-semibold uppercase tracking-[0.1em] text-text-dim">
        {label}
      </p>
      <p className="mt-1 flex items-baseline gap-0.5">
        <span className={cn("text-[17px] font-extrabold leading-none", accent)}>
          {value}
        </span>
        {unit ? (
          <span className="text-[9px] font-semibold text-text-dim">{unit}</span>
        ) : null}
      </p>
      {sub ? <p className="mt-1 text-[8.5px] text-text-dim">{sub}</p> : null}
    </Tile>
  );
}

export function Row({
  title,
  sub,
  right,
  rightSub,
  leading,
  className,
}: {
  title: string;
  sub?: string;
  right?: string;
  rightSub?: string;
  leading?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-[12px] border border-line-soft bg-surface px-2.5 py-2",
        className,
      )}
    >
      {leading}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10.5px] font-bold text-text">{title}</p>
        {sub ? (
          <p className="truncate text-[8.5px] text-text-dim">{sub}</p>
        ) : null}
      </div>
      {right ? (
        <div className="text-right">
          <p className="text-[10.5px] font-bold text-text">{right}</p>
          {rightSub ? (
            <p className="text-[8px] text-text-dim">{rightSub}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function Avatar({
  children,
  tone = "ember",
}: {
  children: ReactNode;
  tone?: "ember" | "pulse" | "good" | "warn";
}) {
  const tones = {
    ember: "bg-ember/15 text-ember",
    pulse: "bg-pulse/15 text-pulse-strong",
    good: "bg-good/15 text-good",
    warn: "bg-warn/15 text-warn",
  };
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-7 shrink-0 place-items-center rounded-[9px] text-[11px] font-bold",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/* --------------------------------------------------------------- charts */

/** Circular progress gauge, as used on the app's home dashboard. */
export function Ring({
  value,
  size = 84,
  stroke = 8,
  color = "var(--color-ember)",
  track = "rgba(255,255,255,0.08)",
  children,
}: {
  /** 0–1 */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center leading-none">
        {children}
      </div>
    </div>
  );
}

export function Bars({
  data,
  labels,
  color = "var(--color-ember)",
  height = 56,
}: {
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}) {
  const max = Math.max(...data, 1);
  return (
    <div aria-hidden>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((value, index) => (
          <div key={index} className="flex flex-1 flex-col justify-end">
            <div
              className="w-full rounded-t-[3px]"
              style={{
                height: `${Math.max((value / max) * 100, 6)}%`,
                background:
                  index === data.length - 1
                    ? color
                    : `color-mix(in oklab, ${color} 42%, transparent)`,
              }}
            />
          </div>
        ))}
      </div>
      {labels ? (
        <div className="mt-1 flex gap-1.5">
          {/* Weekday initials repeat (T/T, S/S), so the index is the only
              stable key here. */}
          {labels.map((label, index) => (
            <span
              key={index}
              className="flex-1 text-center text-[7.5px] font-medium text-text-dim"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Smoothed area chart used for weight and analytics screens. */
export function AreaChart({
  data,
  color = "var(--color-pulse)",
  height = 74,
  gradientId,
}: {
  data: number[];
  color?: string;
  height?: number;
  /** Must be unique per rendered chart — SVG gradient ids are global. */
  gradientId: string;
}) {
  const width = 240;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;

  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - 8 - ((value - min) / span) * (height - 20),
  }));

  // Catmull-Rom-ish smoothing: a cubic through each pair using midpoint
  // control handles. Cheap, and visually identical to a spline at this size.
  const line = points
    .map((point, index) => {
      if (index === 0) return `M${point.x},${point.y}`;
      const previous = points[index - 1];
      const cx = (previous.x + point.x) / 2;
      return `C${cx},${previous.y} ${cx},${point.y} ${point.x},${point.y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.38" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${line} L${width},${height} L0,${height} Z`}
        fill={`url(#${gradientId})`}
      />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx={points[points.length - 1].x - 2}
        cy={points[points.length - 1].y}
        r="3.2"
        fill={color}
      />
    </svg>
  );
}

export function Meter({
  value,
  color = "var(--color-ember)",
  className,
}: {
  /** 0–1 */
  value: number;
  color?: string;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "h-1.5 w-full overflow-hidden rounded-full bg-white/8",
        className,
      )}
    >
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(value, 1) * 100}%`, background: color }}
      />
    </div>
  );
}

export function Chip({
  children,
  active = false,
}: {
  children: ReactNode;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2.5 py-1 text-[8.5px] font-bold",
        active
          ? "border-ember/50 bg-ember/15 text-ember"
          : "border-line bg-surface text-text-dim",
      )}
    >
      {children}
    </span>
  );
}
