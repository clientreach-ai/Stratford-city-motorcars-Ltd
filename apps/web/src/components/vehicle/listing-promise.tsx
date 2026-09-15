import { Check, Phone } from "lucide-react";

import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/section";
import { site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/**
 * What a car's own page gives a buyer. Written against what the vehicle page
 * actually renders: photographs inside and out are required to publish, core
 * details are required, and history rows appear only when the dealership holds
 * them — hence "where we hold them".
 */
const listingIncludes = [
  "A full photo gallery, inside and out",
  "Year, mileage, gearbox, fuel, body style and colour",
  "Engine size, previous owners, insurance group and road tax band where we hold them",
  "History check, warranty, service and MOT details for that car",
  "A written description",
  "WhatsApp, viewing and part-exchange links for that car",
];

/**
 * Shown where cars would be when none are listed. The dealership does not put a
 * car online until it has been properly photographed, and holds more stock than
 * it lists, so an empty grid is a reason to get in touch rather than a dead end.
 */
export function StockEmptyState({
  headingLevel = "h2",
  showBrowse = false,
}: {
  headingLevel?: "h2" | "h3";
  /** Link to /vehicles — off on the stock page itself. */
  showBrowse?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <div className="grid border border-[var(--border)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="p-7 md:p-10 lg:p-12">
        <Eyebrow>Current stock</Eyebrow>
        <Heading className="mt-5 max-w-lg font-display text-[clamp(1.85rem,3.6vw,2.6rem)] leading-[1.08]">
          We hold more stock than we list online
        </Heading>
        <div className="mt-5 max-w-lg space-y-4 leading-relaxed text-[var(--muted-foreground)]">
          <p>
            A car only goes on the website once it has been properly photographed, inside and out, so what
            you see here is what you&rsquo;ll find at the showroom.
          </p>
          <p>
            Until then, the quickest way to find out what we have is to ask. Tell us the make, model or
            budget you have in mind and we&rsquo;ll let you know.
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
          <ExternalButtonLink
            href={whatsappLinks.sourcing}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="md"
            className="w-full sm:w-auto"
          >
            <WhatsAppIcon className="size-4" />
            Tell us what you want
          </ExternalButtonLink>
          <ExternalButtonLink href={site.phone.href} variant="outline" size="md" className="w-full sm:w-auto">
            <Phone className="size-4" />
            {site.phone.display}
          </ExternalButtonLink>
          {showBrowse ? (
            <ButtonLink href="/vehicles" variant="ghost" size="md" className="w-full sm:w-auto">
              Browse stock
            </ButtonLink>
          ) : null}
        </div>
      </div>

      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-7 md:p-10 lg:border-l lg:border-t-0 lg:p-12">
        <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
          On every car&rsquo;s page
        </p>
        <ul className="mt-6 space-y-4">
          {listingIncludes.map((item) => (
            <li key={item} className="flex items-start gap-3 text-sm leading-relaxed">
              <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-[var(--rule)]" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
