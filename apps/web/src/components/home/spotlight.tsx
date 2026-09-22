import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck } from "lucide-react";

import { ButtonLink, ExternalButtonLink } from "@/components/ui/button";
import { ExternalTextLink } from "@/components/ui/text-link";
import { WhatsAppIcon } from "@/components/ui/icons";
import { Container, Eyebrow } from "@/components/ui/section";
import { SplitText } from "@/components/ui/split-text";
import { VehiclePhoto } from "@/components/vehicle/vehicle-photo";
import { formatMileage, formatVehiclePrice } from "@/lib/format";
import type { PublicVehicle } from "@/lib/inventory/types";
import { whatsappForVehicle } from "@/lib/whatsapp";

/**
 * One car given the full stage: a large photograph beside its particulars set
 * like a showroom placard — year, mileage, engine, power, gearbox, colour —
 * and the price, with the ways to act on it.
 *
 * The car is one the dealership hand-picked, so the label says "Featured" and
 * nothing more; every figure comes from the listing, and rows the listing does
 * not hold are simply left out.
 */
export function Spotlight({ vehicle }: { vehicle: PublicVehicle }) {
  const href = `/vehicles/${vehicle.slug}` as Route;
  // A different view from the hero's cover when the listing has one.
  const photo =
    vehicle.images.find((image) => image.id !== vehicle.cover.id && image.category === "exterior") ?? vehicle.cover;

  const particulars = [
    { term: "Year", value: String(vehicle.year) },
    { term: "Mileage", value: formatMileage(vehicle.mileage) },
    vehicle.engine ? { term: "Engine", value: vehicle.engine } : null,
    vehicle.power ? { term: "Power", value: vehicle.power } : null,
    { term: "Gearbox", value: vehicle.transmission },
    vehicle.colour ? { term: "Colour", value: vehicle.colour } : null,
  ].filter((row): row is { term: string; value: string } => row !== null);

  return (
    <section data-surface="dark" aria-labelledby="spotlight-title" className="grain overflow-hidden bg-ink-950 py-20 text-bone md:py-28 lg:py-32">
      <Container>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
          <div className="relative lg:sticky lg:top-28 lg:self-start">
            {/* Showroom light pooling beneath the car. */}
            <div aria-hidden className="pool-light pointer-events-none absolute -inset-x-16 -bottom-24 top-1/4" />
            <Link
              href={href}
              className="reveal reveal-image group relative block aspect-[4/3] overflow-hidden bg-ink-900 md:aspect-[3/2]"
              aria-label={`${vehicle.year} ${vehicle.title} — view this car`}
            >
              <VehiclePhoto
                image={photo}
                sizes="(min-width: 1408px) 760px, (min-width: 1024px) 54vw, 100vw"
                className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-out-expo)] group-hover:scale-[1.04]"
              />
              {vehicle.reserved ? (
                <span className="absolute left-0 top-0 bg-brass px-3 py-2 font-roman text-[0.625rem] uppercase tracking-[0.2em] text-ink-950">
                  Reserved
                </span>
              ) : null}
            </Link>
          </div>

          <div>
            <Eyebrow className="reveal">Featured</Eyebrow>
            <SplitText
              id="spotlight-title"
              runs={[{ text: vehicle.title }, { text: String(vehicle.year), tone: "muted" }]}
              className="mt-6 text-[clamp(2.1rem,3.8vw,3.25rem)] leading-[1.04] tracking-[-0.025em]"
            />
            {vehicle.variant && !vehicle.title.includes(vehicle.variant) ? (
              <p className="reveal mt-3 text-sm text-bone/60">{vehicle.variant}</p>
            ) : null}

            <dl className="mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-bone/12 pt-8">
              {particulars.map((row) => (
                <div key={row.term} className="reveal">
                  <dt className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-bone/50">{row.term}</dt>
                  <dd data-numeric className="mt-1.5 font-display text-lg leading-snug md:text-xl">
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="reveal mt-10 border-t border-bone/12 pt-8">
              <div>
                <p className="font-roman text-[0.625rem] uppercase tracking-[0.22em] text-bone/50">
                  {vehicle.priceOnApplication || vehicle.price === null ? "Price" : "Cash price"}
                </p>
                <p data-numeric className="mt-2 font-display text-[clamp(2.25rem,4vw,3rem)] leading-none">
                  {vehicle.priceOnApplication || vehicle.price === null ? "On application" : formatVehiclePrice(vehicle)}
                </p>
              </div>
            </div>

            <div className="reveal mt-8 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
              <ButtonLink href={href} size="lg">
                View this car
                <ArrowRight />
              </ButtonLink>
              <ExternalButtonLink
                href={whatsappForVehicle(vehicle)}
                target="_blank"
                rel="noopener noreferrer"
                variant="whatsapp"
                size="lg"
              >
                <WhatsAppIcon className="size-4" />
                WhatsApp us
              </ExternalButtonLink>
            </div>
            <ExternalTextLink href={`${href}#book-viewing`} arrow className="reveal mt-7 text-bone">
              <CalendarCheck aria-hidden className="size-4 text-brass" />
              Book a viewing of this car
            </ExternalTextLink>
          </div>
        </div>
      </Container>
    </section>
  );
}
