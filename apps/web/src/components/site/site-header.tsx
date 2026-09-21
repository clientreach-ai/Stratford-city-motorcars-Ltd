"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Phone, X } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import type { Site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";
import { useNavStore } from "@/stores/nav";
import { navItems } from "./nav-config";

/** Past this far down the page, scrolling down tucks the header away. */
const HIDE_AFTER = 480;

/**
 * Every route opens with a dark band — the homepage hero, or the PageHero on
 * interior pages — so the header is ink and reads as one continuous block with
 * the utility strip above and the hero below.
 *
 * Once the page moves it condenses into a translucent, blurred ink bar with a
 * brass hairline, so the stock photography runs beneath it. Scrolling down a
 * long page tucks it away; the smallest scroll back up returns it. Keyboard
 * focus inside the header always brings it back.
 *
 * It is the fixed point of reference during route transitions
 * (`view-transition-name: site-header`), so it never animates with the page.
 */
export function SiteHeader({ site }: { site: Site }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [tucked, setTucked] = useState(false);
  const open = useNavStore((state) => state.open);
  const openNav = useNavStore((state) => state.openNav);
  const closeNav = useNavStore((state) => state.closeNav);

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const update = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      // A few pixels of dead zone so trackpad jitter never flickers it.
      if (Math.abs(y - last) > 6) {
        setTucked(y > last && y > HIDE_AFTER);
        last = y;
      }
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => closeNav(), [pathname, closeNav]);

  return (
    <>
      <UtilityStrip site={site} />

      <header
        data-surface="dark"
        style={{ viewTransitionName: "site-header" }}
        onFocus={() => setTucked(false)}
        className={cn(
          "sticky top-0 z-50 border-b text-bone",
          "transition-[background-color,border-color,translate] duration-500 ease-[var(--ease-out-expo)]",
          scrolled
            ? "border-brass/15 bg-ink-950/82 backdrop-blur-xl backdrop-saturate-150"
            : "border-transparent bg-ink-950",
          tucked && !open ? "-translate-y-full" : "translate-y-0",
        )}
      >
        <div
          className={cn(
            "container-page flex items-center justify-between gap-6 transition-[height] duration-500 ease-[var(--ease-out-expo)]",
            scrolled ? "h-16 md:h-[4.25rem]" : "h-18 md:h-20",
          )}
        >
          <Link
            href="/"
            className="relative block shrink-0"
            aria-label={`${site.name} — home`}
          >
            <Image
              src="/brand/logo-bone.webp"
              alt={site.name}
              width={900}
              height={269}
              // Rendered 36px tall (≈121px wide) on phones and 44px (≈147px) from md.
              sizes="(min-width: 768px) 148px, 121px"
              // Above the fold but tiny and never the LCP element: load it
              // straight away without a preload competing with the headline.
              loading="eager"
              className={cn(
                "w-auto transition-[height] duration-500 ease-[var(--ease-out-expo)]",
                scrolled ? "h-8 md:h-9" : "h-9 md:h-11",
              )}
            />
          </Link>

          <nav aria-label="Primary" className="hidden lg:block">
            <ul className="flex items-center gap-1">
              {navItems.map((item) => {
                const active =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative px-3.5 py-2 text-[0.8125rem] transition-colors duration-200",
                        "after:absolute after:inset-x-3.5 after:bottom-0.5 after:h-px after:origin-left",
                        "after:scale-x-0 after:bg-[var(--rule)] after:transition-transform after:duration-300",
                        "after:ease-[var(--ease-out-expo)] hover:after:scale-x-100",
                        active
                          ? "text-[var(--foreground)] after:scale-x-100"
                          : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <ButtonLink href="/vehicles" size="sm" className="hidden sm:inline-flex">
              View Stock
            </ButtonLink>

            <a
              href={site.phone.href}
              aria-label={`Call ${site.name} on ${site.phone.display}`}
              className="flex size-11 items-center justify-center border border-[var(--border-strong)] transition-colors duration-200 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] lg:hidden"
            >
              <Phone className="size-[1.1rem]" />
            </a>

            <button
              type="button"
              onClick={openNav}
              aria-label="Open menu"
              aria-expanded={open}
              aria-controls="mobile-nav"
              className="flex size-11 items-center justify-center border border-[var(--border-strong)] transition-colors duration-200 hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-[var(--primary-foreground)] lg:hidden"
            >
              <Menu className="size-[1.15rem]" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={open} onClose={closeNav} site={site} />
    </>
  );
}

/** Thin ink strip above the header — phone, hours and WhatsApp, always visible. */
function UtilityStrip({ site }: { site: Site }) {
  return (
    <aside
      aria-label="Showroom address and contact"
      data-surface="dark"
      className="hidden bg-ink-950 text-bone md:block"
    >
      <div className="container-page flex h-10 items-center justify-between text-[0.6875rem]">
        <p className="font-roman uppercase tracking-[0.2em] text-bone/55">
          {site.address.street}, {site.address.locality} {site.address.postcode}
        </p>
        <div className="flex items-center gap-6">
          {/* The full line wraps the fixed-height strip below lg, so tablets
              get the weekday hours; the appointment-only times stay in the
              footer, the showroom panel and the mobile drawer. */}
          <span className="text-bone/55 lg:hidden">{site.hours.short}</span>
          <span className="hidden text-bone/55 lg:inline">{site.hours.compact}</span>
          <a
            href={site.phone.href}
            className="flex items-center gap-2 tracking-wide transition-colors hover:text-brass"
          >
            <Phone className="size-3.5" />
            {site.phone.display}
          </a>
          <a
            href={whatsappLinks.general}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 tracking-wide transition-colors hover:text-whatsapp"
          >
            <WhatsAppIcon className="size-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ open, onClose, site }: { open: boolean; onClose: () => void; site: Site }) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    // The panel animates in from `visibility: hidden`, and an element inside a
    // hidden container cannot take focus — so wait for the browser to apply
    // the visible state before moving focus into the drawer.
    const focusFrame = requestAnimationFrame(() => closeRef.current?.focus());

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;

      // Keep focus inside the drawer while it is open.
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return (
    <div
      id="mobile-nav"
      data-surface="dark"
      aria-hidden={!open}
      // `inert` rather than `visibility: hidden`: it takes the closed drawer out
      // of the tab order and the accessibility tree immediately, where a
      // transitioned `visibility` still computes as hidden on the frame the
      // drawer opens — which silently swallowed the focus call.
      inert={!open}
      // The ink curtain drops from the top on open and lifts away on close;
      // the links rise into place behind it, one after another.
      className={cn(
        "grain fixed inset-0 z-60 bg-ink-950 text-bone lg:hidden",
        "transition-[clip-path] ease-[var(--ease-out-expo)]",
        open
          ? "duration-700 [clip-path:inset(0_0_0_0)]"
          : "pointer-events-none duration-500 [clip-path:inset(0_0_100%_0)]",
      )}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal={open || undefined}
        aria-label="Menu"
        className="flex h-dvh flex-col overflow-y-auto"
      >
        <div className="container-page flex h-18 shrink-0 items-center justify-between">
          <Image
            src="/brand/logo-bone.webp"
            alt={site.name}
            width={900}
            height={269}
            sizes="121px"
            className="h-9 w-auto"
          />
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex size-11 items-center justify-center border border-bone/25 transition-colors hover:border-bone hover:bg-bone hover:text-ink-950"
          >
            <X className="size-[1.15rem]" />
          </button>
        </div>

        <nav aria-label="Mobile" className="container-page flex-1 pt-4">
          <ul>
            {navItems.map((item, index) => (
              <li
                key={item.href}
                style={{ "--i": index } as React.CSSProperties}
                className={cn(
                  "border-b border-bone/10 transition-[opacity,translate] ease-[var(--ease-out-expo)]",
                  open
                    ? "translate-y-0 opacity-100 duration-700 delay-[calc(var(--i)*60ms+160ms)]"
                    : "translate-y-5 opacity-0 duration-200",
                )}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "page" : undefined}
                  className="group flex items-baseline justify-between gap-4 py-5 transition-colors hover:text-brass aria-[current=page]:text-brass-bright"
                >
                  <span className="flex shrink-0 items-baseline gap-4">
                    <span aria-hidden data-numeric className="font-roman text-[0.625rem] tracking-[0.2em] text-brass">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[1.75rem] leading-none min-[380px]:text-[2rem]">
                      {item.label}
                    </span>
                  </span>
                  {/*
                    The hint is the first thing to go on a narrow handset. Left
                    in, "Part Exchange" plus its hint overran a 320px viewport,
                    and because the drawer is fixed and full-bleed that widened
                    the whole document — every page then scrolled sideways.
                  */}
                  <span className="hidden min-w-0 truncate text-right text-[0.6875rem] text-bone/60 min-[400px]:block">
                    {item.hint}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div
          className={cn(
            "container-page shrink-0 space-y-3 py-8 transition-opacity ease-[var(--ease-out-expo)]",
            open ? "opacity-100 delay-500 duration-700" : "opacity-0 duration-200",
          )}
        >
          <ExternalButtonLink
            href={site.phone.href}
            variant="outline"
            size="md"
            className="w-full"
          >
            <Phone className="size-4" />
            {site.phone.display}
          </ExternalButtonLink>
          <ExternalButtonLink
            href={whatsappLinks.general}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="md"
            className="w-full"
          >
            <WhatsAppIcon className="size-4" />
            WhatsApp us
          </ExternalButtonLink>
          <p className="pt-2 text-center text-[0.6875rem] leading-relaxed text-bone/60">
            {site.address.full}
            <br />
            {site.hours.compact}
          </p>
        </div>
      </div>
    </div>
  );
}
