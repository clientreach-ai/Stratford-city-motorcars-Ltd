import { AlertTriangle, Check, Phone } from "lucide-react";

import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { site } from "@/lib/site";

/**
 * What the customer sees once a form resolves.
 *
 * The failure case matters as much as the success one: if the lead could not
 * be delivered we say so plainly and put the phone and WhatsApp in front of
 * them, rather than showing a thank-you for a message nobody received.
 */

export function SuccessPanel({
  reference,
  heading,
  detail,
}: {
  reference: string;
  heading: string;
  detail: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="border border-[var(--border)] bg-[var(--surface-raised)] p-8 text-center md:p-10"
    >
      <span
        aria-hidden
        className="mx-auto flex size-12 items-center justify-center border border-[var(--rule)] text-[var(--rule)]"
      >
        <Check className="size-5" />
      </span>

      <h3 className="mt-6 font-display text-2xl">{heading}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[var(--muted-foreground)]">
        {detail}
      </p>

      <p className="mt-6 font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        Your reference
      </p>
      <p data-numeric className="mt-1 font-display text-lg tracking-wide">
        {reference}
      </p>

      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <ExternalButtonLink href={site.phone.href} variant="outline" size="sm">
          <Phone className="size-4" />
          {site.phone.display}
        </ExternalButtonLink>
      </div>
    </div>
  );
}

export function UnavailablePanel({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="border border-[var(--destructive)]/40 bg-[var(--destructive)]/5 p-6"
    >
      <div className="flex gap-3.5">
        <AlertTriangle
          aria-hidden
          className="mt-0.5 size-5 shrink-0 text-[var(--destructive)]"
        />
        <div>
          <h3 className="font-medium">We couldn&rsquo;t send that</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">
            {message}
          </p>

          <div className="mt-5 flex flex-wrap gap-2.5">
            <ExternalButtonLink href={site.phone.href} size="sm">
              <Phone className="size-4" />
              {site.phone.display}
            </ExternalButtonLink>
            <ExternalButtonLink
              href={`https://wa.me/${site.whatsapp.number}`}
              target="_blank"
              rel="noopener noreferrer"
              variant="whatsapp"
              size="sm"
            >
              <WhatsAppIcon className="size-4" />
              WhatsApp
            </ExternalButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small inline note reminding people the form is not the only route in. */
export function DirectContactNote() {
  return (
    <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">
      Prefer to talk? Call{" "}
      <a
        href={site.phone.href}
        className="border-b border-[var(--rule)] pb-px transition-colors hover:text-[var(--foreground)]"
      >
        {site.phone.display}
      </a>{" "}
      or email{" "}
      <a
        href={`mailto:${site.email}`}
        className="break-all border-b border-[var(--rule)] pb-px transition-colors hover:text-[var(--foreground)]"
      >
        {site.email}
      </a>
      .
    </p>
  );
}
