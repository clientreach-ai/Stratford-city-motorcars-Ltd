"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Menu, Phone, X } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";
import { navItems } from "./nav-config";

/**
 * Every route opens with a dark band — the homepage hero, or the PageHero on
 * interior pages — so the header starts in ink and reads as one continuous
 * block with the utility strip above and the hero below. Once the page scrolls
 * past that band it resolves to the bone surface with a hairline beneath.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const solid = scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the drawer whenever the route changes.
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <UtilityStrip />

      <header
        data-surface={solid ? undefined : "dark"}
        className={cn(
          "sticky top-0 z-50 transition-[background-color,border-color,box-shadow] duration-300 ease-[var(--ease-out-expo)]",
          solid
            ? "border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur-sm"
            : "border-b border-transparent bg-ink-950 text-bone",
        )}
      >
        <div className="container-page flex h-18 items-center justify-between gap-6 md:h-20">
          <Link
            href="/"
            className="relative block shrink-0"
            aria-label={`${site.name} — home`}
          >
            <Image
              src={solid ? "/brand/logo.webp" : "/brand/logo-bone.webp"}
              alt={site.name}
              width={900}
              height={269}
              sizes="200px"
              priority
              className="h-9 w-auto md:h-11"
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
              onClick={() => setOpen(true)}
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

      <MobileNav open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Thin ink strip above the header — phone, hours and WhatsApp, always visible. */
function UtilityStrip() {
  return (
    <div data-surface="dark" className="hidden bg-ink-950 text-bone md:block">
      <div className="container-page flex h-10 items-center justify-between text-[0.6875rem]">
        <p className="font-roman uppercase tracking-[0.2em] text-bone/55">
          {site.address.street}, {site.address.locality} {site.address.postcode}
        </p>
        <div className="flex items-center gap-6">
          <span className="text-bone/55">
            Mon–Sat 9–6 · Sun 10–4
          </span>
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
    </div>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
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
      className={cn(
        "fixed inset-0 z-60 bg-ink-950 text-bone transition-opacity duration-300 ease-[var(--ease-out-expo)] lg:hidden",
        open ? "opacity-100" : "pointer-events-none opacity-0",
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
            sizes="200px"
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
            {navItems.map((item) => (
              <li key={item.href} className="border-b border-bone/10">
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-baseline justify-between gap-4 py-5 transition-colors hover:text-brass"
                >
                  <span className="shrink-0 font-display text-2xl leading-none min-[380px]:text-[1.75rem]">
                    {item.label}
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

        <div className="container-page shrink-0 space-y-3 py-8">
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
            Mon–Sat 9am–6pm · Sun 10am–4pm
          </p>
        </div>
      </div>
    </div>
  );
}
