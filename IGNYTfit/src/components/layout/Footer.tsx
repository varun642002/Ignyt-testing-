import { Mail } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import {
  GithubIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
} from "@/components/brand/SocialIcons";
import { Container } from "@/components/ui/Container";
import { PlayStoreButton } from "@/components/ui/PlayStoreButton";
import { footerGroups } from "@/lib/routes";
import { site } from "@/lib/site";

const socials = [
  { href: site.links.github, label: "IGNYT on GitHub", Icon: GithubIcon },
  {
    href: site.links.instagram,
    label: "IGNYT on Instagram",
    Icon: InstagramIcon,
  },
  { href: site.links.x, label: "IGNYT on X", Icon: XIcon },
  { href: site.links.linkedin, label: "IGNYT on LinkedIn", Icon: LinkedinIcon },
];

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-line bg-ink-soft">
      {/* Ember hairline echoing the brand bolt. */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,90,31,0.55),transparent)]"
      />

      <Container className="py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-[14px] leading-relaxed text-text-mute">
              {site.shortDescription}
            </p>
            <PlayStoreButton size="md" className="mt-5" />
          </div>

          {/* Product / Learn / Legal — driven entirely by the route registry,
              so a new page appears here without touching this file. */}
          {footerGroups.map((group) => {
            const id = `footer-${group.heading.toLowerCase()}`;
            return (
              <nav key={group.heading} aria-labelledby={id}>
                <h2
                  id={id}
                  className="text-[12px] font-bold uppercase tracking-[0.16em] text-text-dim"
                >
                  {group.heading}
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {group.routes.map((route) => (
                    <li key={route.path}>
                      <Link
                        href={route.path}
                        className="text-[14px] text-text-mute transition-colors hover:text-ember"
                      >
                        {route.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            );
          })}

          <div>
            <h2 className="text-[12px] font-bold uppercase tracking-[0.16em] text-text-dim">
              Connect
            </h2>
            <a
              href={`mailto:${site.email.support}`}
              className="mt-4 inline-flex items-center gap-2 text-[14px] text-text-mute transition-colors hover:text-ember"
            >
              <Mail aria-hidden className="size-4" />
              {site.email.support}
            </a>
            <ul className="mt-5 flex items-center gap-2.5">
              {socials.map(({ href, label, Icon }) => (
                <li key={label}>
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-xl border border-line bg-surface text-text-mute transition-colors hover:border-ember/50 hover:text-ember"
                  >
                    <Icon className="size-[18px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-text-dim">
            © {new Date().getFullYear()} {site.name}. All Rights Reserved.
          </p>
          <p className="text-[13px] text-text-dim">
            IGNYT is not a medical device and does not provide medical advice.{" "}
            <Link
              href="/disclaimer"
              className="text-text-mute underline underline-offset-4 transition-colors hover:text-ember"
            >
              Read the disclaimer
            </Link>
            .
          </p>
        </div>
      </Container>
    </footer>
  );
}
