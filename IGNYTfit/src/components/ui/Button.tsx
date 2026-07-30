import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "glass";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: cn(
    "bg-gradient-to-br from-ember-strong to-[#e0450e] text-[#150500]",
    "shadow-[0_10px_34px_-12px_rgba(255,90,31,0.85)]",
    "hover:shadow-[0_16px_44px_-12px_rgba(255,90,31,0.95)] hover:brightness-110",
  ),
  secondary: cn(
    "border border-line bg-surface-2/80 text-text",
    "hover:border-pulse/60 hover:bg-surface-3/80",
  ),
  ghost: "text-text-mute hover:text-text",
  glass: "glass text-text hover:border-ember/50 hover:bg-surface-2/70",
};

const SIZES: Record<Size, string> = {
  sm: "h-10 px-4 text-[13.5px]",
  md: "h-12 px-6 text-[15px]",
  lg: "h-[54px] px-7 text-[15.5px]",
};

const BASE = cn(
  "inline-flex select-none items-center justify-center gap-2 rounded-btn font-bold",
  "transition-[transform,box-shadow,background-color,border-color,filter] duration-200",
  "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55",
);

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

/**
 * Internal or external link styled as a button.
 *
 * Uses `next/link` for in-app routes (which prefetches on viewport entry) and
 * a plain anchor for external ones, where `rel="noreferrer"` matters.
 */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: CommonProps &
  Omit<ComponentPropsWithoutRef<"a">, "href" | "className" | "children"> & {
    href: string;
  }) {
  const classes = cn(BASE, VARIANTS[variant], SIZES[size], className);
  const isExternal = /^https?:\/\//.test(href);

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={classes}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: CommonProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children">) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
