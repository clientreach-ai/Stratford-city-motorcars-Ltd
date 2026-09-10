import { Car, Mail, MapPin, Phone, TrainFront } from "lucide-react";

import { ExternalButtonLink } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/ui/icons";
import { mapLinks, site } from "@/lib/site";
import { whatsappLinks } from "@/lib/whatsapp";

/**
 * Showroom details. Shared by the homepage and the contact page so the address,
 * hours and travel information can never fall out of step between them.
 */
export function ShowroomPanel({ showMap = true }: { showMap?: boolean }) {
  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
      <div>
        <dl className="space-y-7">
          <DetailRow icon={<MapPin className="size-4" />} term="Address">
            <a
              href={mapLinks.place}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-[var(--rule)]"
            >
              {site.address.street}
              <br />
              {site.address.locality}, {site.address.region}
              <br />
              {site.address.postcode}
            </a>
          </DetailRow>

          <DetailRow icon={<Phone className="size-4" />} term="Phone">
            <a
              href={site.phone.href}
              className="transition-colors hover:text-[var(--rule)]"
            >
              {site.phone.display}
            </a>
          </DetailRow>

          <DetailRow icon={<Mail className="size-4" />} term="Email">
            <a
              href={`mailto:${site.email}`}
              className="break-all transition-colors hover:text-[var(--rule)]"
            >
              {site.email}
            </a>
          </DetailRow>
        </dl>

        <div className="mt-9 border-t border-[var(--border)] pt-7">
          <h3 className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-[var(--rule)]">
            Opening hours
          </h3>
          <dl className="mt-4 space-y-2">
            {site.openingHoursSummary.map((entry) => (
              <div key={entry.label} className="flex justify-between gap-6 text-sm">
                <dt className="text-[var(--muted-foreground)]">{entry.label}</dt>
                <dd data-numeric className="font-medium">{entry.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs leading-relaxed text-[var(--muted-foreground)]">
            {site.outOfHours}
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <ExternalButtonLink href={site.phone.href} size="md">
            <Phone className="size-4" />
            Call the showroom
          </ExternalButtonLink>
          <ExternalButtonLink
            href={whatsappLinks.bookViewing}
            target="_blank"
            rel="noopener noreferrer"
            variant="whatsapp"
            size="md"
          >
            <WhatsAppIcon className="size-4" />
            Book a viewing
          </ExternalButtonLink>
        </div>
      </div>

      <div className="space-y-6">
        {showMap ? (
          <div className="aspect-[4/3] w-full overflow-hidden border border-[var(--border)] bg-[var(--muted)] lg:aspect-[3/2]">
            <iframe
              // Lazy so the map never competes with the page's own content for
              // bandwidth on a phone.
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={`Map showing ${site.name} at ${site.address.full}`}
              src={mapLinks.embed}
              className="size-full border-0 grayscale-[0.35] contrast-[1.05]"
            />
          </div>
        ) : null}

        <div className="grid gap-px bg-[var(--border)] sm:grid-cols-3">
          <TravelCard
            icon={<TrainFront className="size-4" />}
            title="By rail"
            detail={site.transport.rail.detail}
            label={site.transport.rail.label}
          />
          <TravelCard
            icon={<Car className="size-4" />}
            title="By road"
            detail={`A11 and A12 access. ${site.parking} Sat nav ${site.satNavPostcode}.`}
            label="Free parking on site"
          />
          <TravelCard
            icon={<MapPin className="size-4" />}
            title="By bus"
            detail={site.transport.bus.detail}
            label={site.transport.bus.label}
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  term,
  children,
}: {
  icon: React.ReactNode;
  term: string;
  children: React.ReactNode;
}) {
  // The icon lives inside the <dt>: a <dl>'s <div> children may contain only
  // <dt> and <dd>, so a sibling <span> here would be invalid markup.
  return (
    <div>
      <dt className="flex items-center gap-3 font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        <span aria-hidden className="shrink-0 text-[var(--rule)]">
          {icon}
        </span>
        {term}
      </dt>
      <dd className="mt-1.5 pl-7 leading-relaxed">{children}</dd>
    </div>
  );
}

function TravelCard({
  icon,
  title,
  label,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="bg-[var(--background)] p-5">
      <span aria-hidden className="text-[var(--rule)]">
        {icon}
      </span>
      <h3 className="mt-3 font-roman text-[0.625rem] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
        {title}
      </h3>
      <p className="mt-2 text-sm font-medium leading-snug">{label}</p>
      <p className="mt-1.5 text-xs leading-relaxed text-[var(--muted-foreground)]">
        {detail}
      </p>
    </div>
  );
}
