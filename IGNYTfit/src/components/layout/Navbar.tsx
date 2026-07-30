"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/brand/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { navRoutes } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Sticky site header.
 *
 * Transparent over the hero, then fading to frosted glass once the page
 * scrolls. The effect is driven by a single passive scroll listener writing
 * one boolean, rather than a scroll-linked animation, so it costs nothing on
 * the main thread while scrolling.
 *
 * Deliberately free of any animation library. The header is above the fold on
 * every page, so anything it imports lands in the critical path — the active
 * pill and the mobile sheet are plain CSS transitions instead, which the
 * compositor handles.
 */
export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on navigation. Adjusting state during render (the
  // pattern React documents for "derive from a prop change") avoids the extra
  // commit an effect would cost, and keeps the sheet from flashing on the new
  // route before it closes.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // Lock body scroll while the sheet is open, and restore it exactly.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  // Escape closes the sheet.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname.startsWith(path);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,backdrop-filter,box-shadow] duration-300",
        scrolled
          ? "glass border-b border-line/80 shadow-[0_10px_40px_-24px_rgba(0,0,0,0.9)]"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <Container className="flex h-[68px] items-center justify-between gap-4">
        <Link
          href="/"
          className="shrink-0 rounded-lg"
          aria-label="IGNYT — home"
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navRoutes.map((route) => (
              <li key={route.path}>
                <Link
                  href={route.path}
                  aria-current={isActive(route.path) ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-9 items-center rounded-full px-3.5 text-[14px] font-semibold",
                    "transition-colors duration-200",
                    isActive(route.path)
                      ? "border border-ember/30 bg-ember/10 text-text"
                      : "border border-transparent text-text-mute hover:text-text",
                  )}
                >
                  {route.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink
            href="/download"
            size="sm"
            className="hidden sm:inline-flex"
          >
            Download App
          </ButtonLink>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-xl border border-line bg-surface/70 text-text lg:hidden"
          >
            {menuOpen ? (
              <X aria-hidden className="size-5" />
            ) : (
              <Menu aria-hidden className="size-5" />
            )}
          </button>
        </div>
      </Container>

      {/* Mobile sheet.
          Kept mounted and collapsed with a grid-rows transition rather than
          conditionally rendered, so opening and closing animate without an
          animation library and without a layout-thrashing height measurement.
          `invisible` when closed keeps it out of the tab order. */}
      <div
        id="mobile-menu"
        className={cn(
          "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden",
          menuOpen
            ? "grid-rows-[1fr] opacity-100"
            : "invisible grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0">
          <div className="glass-strong border-t border-line">
            <Container className="py-4">
              <nav aria-label="Mobile">
                <ul className="flex flex-col gap-1">
                  {navRoutes.map((route) => (
                    <li key={route.path}>
                      <Link
                        href={route.path}
                        tabIndex={menuOpen ? undefined : -1}
                        aria-current={isActive(route.path) ? "page" : undefined}
                        className={cn(
                          "flex items-center rounded-xl px-4 py-3 text-[15px] font-semibold transition-colors",
                          isActive(route.path)
                            ? "bg-ember/12 text-ember"
                            : "text-text-mute hover:bg-surface-2 hover:text-text",
                        )}
                      >
                        {route.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <ButtonLink
                href="/download"
                className="mt-3 w-full"
                tabIndex={menuOpen ? undefined : -1}
              >
                Download App
              </ButtonLink>
            </Container>
          </div>
        </div>
      </div>
    </header>
  );
}
