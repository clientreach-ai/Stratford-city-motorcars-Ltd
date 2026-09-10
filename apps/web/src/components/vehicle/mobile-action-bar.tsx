"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Phone } from "lucide-react";

import { cn } from "@Stratford-city-motorcars-Ltd/ui/lib/utils";
import { WhatsAppIcon } from "@/components/ui/icons";
import { formatPrice } from "@/lib/format";
import { site } from "@/lib/site";

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
  price: number;
  formId?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const form = document.getElementById(formId);

    const onScroll = () => {
      const scrolledEnough = window.scrollY > 380;
      let formOnScreen = false;
      if (form) {
        const rect = form.getBoundingClientRect();
        formOnScreen = rect.top < window.innerHeight && rect.bottom > 0;
      }
      setVisible(scrolledEnough && !formOnScreen);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [formId]);

  return (
    <div
      data-surface="dark"
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-bone/12 bg-ink-950/97 backdrop-blur-sm lg:hidden",
        "transition-transform duration-300 ease-[var(--ease-out-expo)]",
        "pb-[env(safe-area-inset-bottom)]",
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
          {formatPrice(price)}
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
