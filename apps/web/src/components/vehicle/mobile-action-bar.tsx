"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Phone } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { useSite } from "@/components/site/site-provider";
import { WhatsAppIcon } from "@/components/ui/icons";

/**
 * Sticky enquiry bar for phones.
 *
 * Appears once the buyer has scrolled past the gallery — showing it
 * immediately would just cover the first photograph — and hides again when the
 * enquiry form itself is on screen, so it never sits on top of the thing it is
 * pointing at.
 */
export function MobileActionBar({
  whatsappHref,
  price,
  formId = "enquire",
}: {
  whatsappHref: string;
  /** Already formatted: a price or "POA". */
  price: string;
  formId?: string;
}) {
  const [visible, setVisible] = useState(false);
  const site = useSite();

  useEffect(() => {
    const form = document.getElementById(formId);
    let formOnScreen = false;
    let frame = 0;

    const update = () => setVisible(window.scrollY > 380 && !formOnScreen);

    // Scrolling only reads scrollY, at most once a frame. Whether the form is
    // on screen comes from an observer, so the scroll path never forces layout.
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      formOnScreen = entry?.isIntersecting ?? false;
      update();
    });
    if (form) observer.observe(form);

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [formId]);

  return (
    <div
      data-surface="dark"
      // The footer looks for this to leave room beneath its last line.
      data-mobile-action-bar
      // Off screen is not the same as gone: without `inert` the hidden bar's
      // links stayed in the tab order and were still read out.
      aria-hidden={!visible}
      inert={!visible}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-bone/12 bg-ink-950/97 backdrop-blur-sm lg:hidden",
        "transition-transform duration-300 ease-[var(--ease-out-expo)]",
        // Clears the home indicator, and the notch in landscape.
        "pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center gap-1.5 px-3 py-2.5">
        {/*
          The price is the first thing to go on a narrow handset. Below 400px
          the three actions need the full width — keeping it pushed the bar
          wider than the viewport and pushed "Enquire" off the right edge.
        */}
        <p
          data-numeric
          className="hidden shrink-0 pl-1 pr-1.5 font-display text-lg text-bone min-[400px]:block"
        >
          {price}
        </p>

        <BarAction href={site.phone.href} label="Call" ariaLabel={`Call ${site.phone.display}`}>
          <Phone className="size-4" />
        </BarAction>

        <BarAction
          href={whatsappHref}
          label="WhatsApp"
          external
          className="border-whatsapp bg-whatsapp text-whatsapp-ink"
        >
          <WhatsAppIcon className="size-4" />
        </BarAction>

        <BarAction
          href={`#${formId}`}
          label="Enquire"
          className="border-bone bg-bone text-ink-950"
        >
          <MessageSquare className="size-4" />
        </BarAction>
      </div>
    </div>
  );
}

function BarAction({
  href,
  label,
  ariaLabel,
  external = false,
  className,
  children,
}: {
  href: string;
  label: string;
  ariaLabel?: string;
  external?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        // min-w-0 lets the flex item shrink past its content; without it the
        // labels set a floor and the bar overflows narrow viewports.
        "flex h-12 min-w-0 flex-1 items-center justify-center gap-1.5 border border-bone/25",
        "text-[0.6875rem] uppercase tracking-[0.1em] text-bone",
        className,
      )}
    >
      {children}
      <span className="truncate">{label}</span>
    </a>
  );
}
